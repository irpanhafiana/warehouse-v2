import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class ReconnectingService {
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);

  readonly isVisible = signal(false);
  readonly message = signal('Menghubungkan kembali ke server...');
  readonly isFailed = signal(false);

  private activeRequests = signal(0);
  private onRetryCallback: (() => void) | null = null;

  show(msg = 'Sesi berakhir. Sedang memperbarui token & menghubungkan kembali...'): void {
    this.message.set(msg);
    this.isFailed.set(false);
    this.activeRequests.update((count) => count + 1);
    this.isVisible.set(true);
  }

  hide(): void {
    this.activeRequests.update((count) => Math.max(0, count - 1));
    if (this.activeRequests() === 0) {
      this.isVisible.set(false);
      this.isFailed.set(false);
    }
  }

  forceHide(): void {
    this.activeRequests.set(0);
    this.isVisible.set(false);
    this.isFailed.set(false);
  }

  setFailed(msg = 'Gagal memperbarui sesi otomatis.', onRetry?: () => void): void {
    this.isFailed.set(true);
    this.message.set(msg);
    if (onRetry) {
      this.onRetryCallback = onRetry;
    }
  }

  retry(): void {
    if (this.onRetryCallback) {
      this.isFailed.set(false);
      this.message.set('Menghubungkan kembali ke server...');
      this.onRetryCallback();
    } else {
      window.location.reload();
    }
  }

  async forceCloseToLogin(): Promise<void> {
    this.forceHide();
    await this.storage.clear();
    this.router.navigateByUrl('/');
  }
}
