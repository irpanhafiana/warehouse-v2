import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { StorageService, STORAGE_KEYS } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class Is4TokenService {
  private readonly authService = inject(AuthService);
  private readonly storageService = inject(StorageService);

  private inFlight$: Observable<string | null> | null = null;

  ensureToken(forceRefresh = false): Observable<string | null> {
    if (!forceRefresh) {
      const existingToken = this.storageService.getItemSync(STORAGE_KEYS.IS4_TOKEN);
      if (existingToken && this.isTokenValid(existingToken)) {
        return of(existingToken);
      }
    }

    if (this.inFlight$) {
      return this.inFlight$;
    }

    this.inFlight$ = this.authService.generateIS4Token().pipe(
      tap(async (res) => {
        if (res?.access_token) {
          await this.storageService.setItem(STORAGE_KEYS.IS4_TOKEN, res.access_token);
        }
        if (res?.refresh_token) {
          await this.storageService.setItem(STORAGE_KEYS.IS4_REFRESH_TOKEN, res.refresh_token);
        }
      }),
      map((res) => res?.access_token ?? null),
      shareReplay({ bufferSize: 1, refCount: false }),
      finalize(() => {
        this.inFlight$ = null;
      })
    );

    return this.inFlight$;
  }

  private isTokenValid(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return false;
      }
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      if (!payload || typeof payload.exp !== 'number') {
        return false;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime + 120;
    } catch {
      return false;
    }
  }
}
