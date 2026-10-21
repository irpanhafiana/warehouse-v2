import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capawesome-team/capacitor-file-opener';
import { environment } from '../../../environments/environment';
import { AppVersionInfo } from '../models/app-update.model';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private readonly http = inject(HttpClient);

  readonly isChecking = signal<boolean>(false);
  readonly localVersionCode = signal<number>(1);
  readonly localVersionName = signal<string>('1.0');
  readonly updateData = signal<AppVersionInfo | null>(null);

  // Download states
  readonly isDownloading = signal<boolean>(false);
  readonly downloadProgress = signal<number>(0);
  readonly downloadError = signal<string | null>(null);

  readonly updateAvailable = computed(() => {
    const data = this.updateData();
    if (!data) return false;
    return data.versionCode > this.localVersionCode();
  });

  readonly isForceUpdate = computed(() => {
    const data = this.updateData();
    if (!data) return false;
    if (data.forceUpdate) return true;
    if (data.minVersionCode && this.localVersionCode() < data.minVersionCode) {
      return true;
    }
    return false;
  });

  async initVersionCheck(): Promise<void> {
    try {
      const info = await CapApp.getInfo();
      const code = parseInt(info.build || '1', 10);
      this.localVersionCode.set(isNaN(code) ? 1 : code);
      this.localVersionName.set(info.version || '1.0');
    } catch (e) {
      console.warn('[AppUpdate] Native App.getInfo() fallback:', e);
      this.localVersionCode.set(1);
      this.localVersionName.set('1.0');
    }

    await this.checkForUpdate();
  }

  async checkForUpdate(): Promise<void> {
    const checkUrl = (environment as unknown as { versionCheckUrl?: string }).versionCheckUrl;
    const appId = (environment as unknown as { appId?: string }).appId || 'com.sjmart.warehouse';
    if (!checkUrl) return;

    this.isChecking.set(true);

    try {
      const timestamp = new Date().getTime();
      const url = `${checkUrl}?appId=${encodeURIComponent(appId)}&_t=${timestamp}`;

      const res = await firstValueFrom(
        this.http.get<AppVersionInfo>(url).pipe(
          timeout(5000),
          catchError((err) => {
            console.warn('[AppUpdate] Gagal mengecek versi dari server:', err);
            return of(null);
          })
        )
      );

      if (res && res.versionCode) {
        this.updateData.set(res);
      }
    } finally {
      this.isChecking.set(false);
    }
  }

  async startDownloadAndInstall(): Promise<void> {
    const data = this.updateData();
    if (!data?.downloadUrl) return;

    this.isDownloading.set(true);
    this.downloadProgress.set(5);
    this.downloadError.set(null);

    const fileName = `warehouse-update.apk`;

    try {
      // 1. Bersihkan file lama jika ada
      try {
        await Filesystem.deleteFile({
          path: fileName,
          directory: Directory.Cache,
        });
      } catch {
        // Abaikan jika belum ada
      }

      // 2. Download file langsung ke Cache directory
      const downloadResult = await Filesystem.downloadFile({
        url: data.downloadUrl,
        path: fileName,
        directory: Directory.Cache,
        progress: true,
      });

      this.downloadProgress.set(100);

      // 3. Ambil URI dari file yang telah diunduh
      let filePathToOpen = downloadResult.path;
      if (!filePathToOpen) {
        const uriResult = await Filesystem.getUri({
          path: fileName,
          directory: Directory.Cache,
        });
        filePathToOpen = uriResult.uri;
      }

      // 4. Buka installer Android
      await FileOpener.openFile({
        path: filePathToOpen,
        mimeType: 'application/vnd.android.package-archive',
      });

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[AppUpdate] Native download error, fallback to browser:', err);
      this.downloadError.set(`Gagal: ${errMsg}`);

      setTimeout(() => {
        window.open(data.downloadUrl, '_system');
      }, 3000);
    } finally {
      this.isDownloading.set(false);
    }
  }

  dismissUpdate(): void {
    if (!this.isForceUpdate()) {
      this.updateData.set(null);
    }
  }
}
