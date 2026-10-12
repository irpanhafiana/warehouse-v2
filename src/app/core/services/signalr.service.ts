import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { MessagePackHubProtocol } from '@microsoft/signalr-protocol-msgpack';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SignalrService {
  private static readonly MESSAGE_HUB_SUFFIX = 'MessageHub';
  private hubConnection?: signalR.HubConnection;
  private readonly hubUrl: string = `${environment.signalRapi}/${SignalrService.MESSAGE_HUB_SUFFIX}`;
  private isConnecting = false;

  constructor() {
    this.startConnectionWithLimitedRetry();
  }

  private async startConnection(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    try {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.hubUrl, {
          skipNegotiation: true,
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withHubProtocol(new MessagePackHubProtocol())
        .withAutomaticReconnect()
        .build();

      this.hubConnection.onclose((error) => {
        console.warn('❌ SignalR Connection Closed:', error?.message);
        setTimeout(() => this.startConnectionWithLimitedRetry(), 3000);
      });

      this.hubConnection.onreconnecting((error) => {
        console.warn('🔄 SignalR Reconnecting...', error?.message);
      });

      this.hubConnection.onreconnected((connectionId) => {
        console.log('✅ SignalR Reconnected with ID:', connectionId);
      });

      await this.hubConnection.start();
      console.log('signalR connected 🚀');
    } catch (err) {
      console.error('SignalR Error 🔴: ', err);
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  public on(eventName: string, callback: (data: any) => void): void {
    if (this.hubConnection) {
      this.hubConnection.on(eventName, callback);
    }
  }

  public off(eventName: string, callback?: (data: any) => void): void {
    if (this.hubConnection) {
      if (callback) {
        this.hubConnection.off(eventName, callback);
      } else {
        this.hubConnection.off(eventName);
      }
      console.log(`❌ Listener removed for event: ${eventName}`);
    }
  }

  public stopConnection(): void {
    this.hubConnection?.stop();
  }

  private async startConnectionWithLimitedRetry(): Promise<void> {
    let retries = 0;
    const maxRetries = 5;
    let retryDelay = 3000;

    while (retries < maxRetries) {
      try {
        await this.startConnection();
        return;
      } catch (err) {
        retries++;
        console.warn(
          `❌ SignalR Retry ${retries}/${maxRetries} failed. Retrying in ${retryDelay / 1000} seconds...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        retryDelay = Math.min(retryDelay * 2, 30000);
      }
    }
    console.warn('⚠️ Maximum SignalR retries reached.');
  }
}

