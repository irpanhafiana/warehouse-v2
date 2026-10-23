import { Injectable, inject, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { App as CapApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

type SignalRCallback = (data: any) => void;

/**
 * Normalisasi payload SignalR: server bisa mengirim JSON string maupun object/array.
 * Mengembalikan `null` jika payload kosong atau JSON tidak valid.
 */
export function parseSignalRPayload<T = any>(data: unknown): T | null {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      console.warn('SignalR payload is not valid JSON:', e);
      return null;
    }
  }
  return data as T;
}

@Injectable({
  providedIn: 'root',
})
export class SignalrService {
  private static readonly MESSAGE_HUB_SUFFIX = 'MessageHub';
  private static readonly MAX_RETRY_DELAY_MS = 20000;

  private hubConnection?: signalR.HubConnection;
  private readonly hubUrl: string = `${environment.signalRapi}/${SignalrService.MESSAGE_HUB_SUFFIX}`;
  private readonly ngZone = inject(NgZone);

  private isConnecting = false;
  private isRetryLoopActive = false;
  private isManuallyStopped = false;
  private hasConnectedBefore = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private retryDelayTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateListenerHandle: PluginListenerHandle | null = null;

  // Registry handler: eventName -> Map<originalCallback, wrappedCallback>
  private readonly handlers = new Map<string, Map<SignalRCallback, SignalRCallback>>();

  private readonly reconnectedSubject = new Subject<void>();

  /**
   * Emit setiap kali koneksi pulih setelah sempat terputus.
   * Komponen sebaiknya re-fetch data karena event selama terputus tidak diterima.
   */
  readonly reconnected$: Observable<void> = this.reconnectedSubject.asObservable();

  constructor() {
    this.registerLifecycleListeners();
    void this.startConnectionWithRetry();
  }

  get isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  /**
   * Daftarkan listener event. Dijamin terdaftar dan dipanggil di dalam NgZone,
   * baik dipanggil sebelum maupun sesudah koneksi SignalR aktif.
   */
  public on(eventName: string, callback: SignalRCallback): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Map());
    }

    const eventCallbacks = this.handlers.get(eventName)!;
    if (eventCallbacks.has(callback)) {
      return;
    }

    // Bungkus callback dengan NgZone.run agar UI otomatis re-render saat data masuk
    const wrappedCallback: SignalRCallback = (data: any) => {
      this.ngZone.run(() => {
        try {
          callback(data);
        } catch (e) {
          console.error(`SignalR handler error [${eventName}]:`, e);
        }
      });
    };

    eventCallbacks.set(callback, wrappedCallback);

    // HubConnection mendukung registrasi handler sebelum maupun sesudah start()
    this.hubConnection?.on(eventName, wrappedCallback);
  }

  public off(eventName: string, callback?: SignalRCallback): void {
    const eventCallbacks = this.handlers.get(eventName);
    if (!eventCallbacks) {
      return;
    }

    if (callback) {
      const wrapped = eventCallbacks.get(callback);
      if (wrapped) {
        this.hubConnection?.off(eventName, wrapped);
        eventCallbacks.delete(callback);
      }
    } else {
      this.hubConnection?.off(eventName);
      eventCallbacks.clear();
    }

    if (eventCallbacks.size === 0) {
      this.handlers.delete(eventName);
    }
  }

  public stopConnection(): void {
    this.isManuallyStopped = true;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.retryDelayTimer !== null) {
      clearTimeout(this.retryDelayTimer);
      this.retryDelayTimer = null;
    }
    if (this.appStateListenerHandle) {
      void this.appStateListenerHandle.remove();
      this.appStateListenerHandle = null;
    }
    void this.hubConnection?.stop();
  }

  private buildConnection(): signalR.HubConnection {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets,
      })
      // Retry tanpa batas (default SignalR berhenti setelah ±42 detik)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx) =>
          Math.min(1000 * Math.pow(2, ctx.previousRetryCount), SignalrService.MAX_RETRY_DELAY_MS),
      })
      .build();

    connection.onreconnecting((error) => {
      console.warn('🔄 SignalR Reconnecting...', error?.message);
    });

    connection.onreconnected((connectionId) => {
      console.log('✅ SignalR Reconnected with ID:', connectionId);
      this.emitReconnected();
    });

    connection.onclose((error) => {
      console.warn('❌ SignalR Connection Closed:', error?.message);
      if (!this.isManuallyStopped) {
        if (this.reconnectTimer !== null) {
          clearTimeout(this.reconnectTimer);
        }
        this.reconnectTimer = setTimeout(() => void this.startConnectionWithRetry(), 3000);
      }
    });

    // Pasang semua handler yang sudah terdaftar ke koneksi baru (sebelum start → tidak ada event terlewat)
    this.handlers.forEach((callbackMap, eventName) => {
      callbackMap.forEach((wrappedCallback) => connection.on(eventName, wrappedCallback));
    });

    return connection;
  }

  private async startConnection(): Promise<void> {
    if (this.isConnecting) {
      return;
    }
    if (this.hubConnection && this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    this.isConnecting = true;
    try {
      this.hubConnection = this.buildConnection();
      await this.hubConnection.start();
      console.log('signalR connected 🚀');

      if (this.hasConnectedBefore) {
        this.emitReconnected();
      }
      this.hasConnectedBefore = true;
    } catch (err) {
      console.error('SignalR Error 🔴: ', err);
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  private async startConnectionWithRetry(): Promise<void> {
    if (this.isRetryLoopActive) {
      return;
    }
    this.isRetryLoopActive = true;
    this.isManuallyStopped = false;

    let retries = 0;
    let retryDelay = 2000;

    try {
      while (!this.isManuallyStopped) {
        try {
          await this.startConnection();
          return;
        } catch {
          retries++;
          console.warn(`❌ SignalR Retry ${retries} failed. Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise<void>((resolve) => {
            this.retryDelayTimer = setTimeout(() => {
              this.retryDelayTimer = null;
              resolve();
            }, retryDelay);
          });
          retryDelay = Math.min(retryDelay * 1.5, SignalrService.MAX_RETRY_DELAY_MS);
        }
      }
    } finally {
      this.isRetryLoopActive = false;
    }
  }

  /**
   * Android WebView membekukan timer/WebSocket saat app di background atau layar mati.
   * Saat app kembali aktif / jaringan kembali, pastikan koneksi langsung dipulihkan.
   */
  private registerLifecycleListeners(): void {
    const ensureConnected = (): void => {
      if (this.isManuallyStopped) {
        return;
      }
      if (!this.hubConnection || this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
        void this.startConnectionWithRetry();
      }
    };

    try {
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          ensureConnected();
        }
      }).then((handle) => {
        this.appStateListenerHandle = handle;
      }).catch((e) => {
        console.warn('CapApp appStateChange listener registration error:', e);
      });
    } catch (e) {
      console.warn('CapApp listener registration failed:', e);
    }

    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        ensureConnected();
      }
    });
    window.addEventListener('online', ensureConnected);
  }

  private emitReconnected(): void {
    this.ngZone.run(() => this.reconnectedSubject.next());
  }
}
