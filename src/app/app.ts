import { Component, ChangeDetectionStrategy, signal, OnInit, inject, DestroyRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { App as CapApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import { AppUpdateService } from './core/services/app-update.service';
import { UpdateDialogComponent } from './shared/components/update-dialog/update-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UpdateDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  protected readonly title = signal('warehouse-v2');
  private destroyRef = inject(DestroyRef);
  private updateService = inject(AppUpdateService);

  ngOnInit(): void {
    // 1. Inisialisasi pengecekan update otomatis
    this.updateService.initVersionCheck();

    // 2. Hardware back button handling
    let backButtonListener: PluginListenerHandle | null = null;
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      }
    }).then((handle) => {
      backButtonListener = handle;
    }).catch((err) => {
      console.warn('Capacitor App backButton listener registration error:', err);
    });

    this.destroyRef.onDestroy(() => {
      backButtonListener?.remove();
    });
  }
}
