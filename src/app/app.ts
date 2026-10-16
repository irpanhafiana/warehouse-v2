import { Component, ChangeDetectionStrategy, signal, OnInit, inject, DestroyRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { App as CapApp } from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  protected readonly title = signal('warehouse-v2');
  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
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
