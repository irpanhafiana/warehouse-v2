import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpRequest,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { StorageService, STORAGE_KEYS } from '../services/storage.service';
import { AuthService } from '../services/auth.service';
import { Is4TokenService } from '../services/is4-token.service';
import { ReconnectingService } from '../services/reconnecting.service';
import { environment } from '../../../environments/environment';

export const httpErrorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const toastr = inject(ToastrService);
  const storage = inject(StorageService);
  const router = inject(Router);
  const authService = inject(AuthService);
  const is4TokenService = inject(Is4TokenService);
  const reconnectingService = inject(ReconnectingService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Jika status HTTP 200 tapi masuk catchError, berarti server mengembalikan string non-JSON (sukses)
      if (error.status === 200) {
        let parsedBody: unknown = error.error?.text ?? error.message ?? null;
        if (typeof parsedBody === 'string') {
          try {
            parsedBody = JSON.parse(parsedBody);
          } catch {
            // Biarkan format string jika memang bukan JSON
          }
        }
        return of(
          new HttpResponse({
            body: parsedBody,
            status: 200,
            statusText: 'OK',
            url: req.url,
          })
        );
      }

      // Ambil path URL target
      const targetUrl = req.url;

      // Khusus error 401 Unauthorized:
      // Tampilkan dialog reconnecting di halaman saat ini (tanpa redirect, tanpa toastr)
      // dan lakukan auto-refresh token serta retry request secara mulus.
      if (error.status === 401) {
        const isAuthRequest = req.url.includes('token') || req.url.includes('connect/token');
        const hasBeenRetried = req.headers.has('X-Auth-Retry');

        // Jika request auth (login) itu sendiri yang gagal 401 atau sudah pernah di-retry tapi tetap 401
        if (isAuthRequest || hasBeenRetried) {
          reconnectingService.setFailed('Sesi tidak dapat diperbarui. Periksa koneksi server atau kredensial.');
          return throwError(() => error);
        }

        const isCloudError = !!(environment.is4urlCloud && req.url.startsWith(environment.is4urlCloud));
        const isCmsError = !!(environment.is4urlCMS && req.url.startsWith(environment.is4urlCMS));

        // Tampilkan dialog reconnecting (user tetap di halaman terakhir tanpa redirect)
        reconnectingService.show('Sesi berakhir. Sedang memperbarui token & menghubungkan kembali...');

        let tokenRefresh$: Observable<string | null>;
        if (isCloudError) {
          tokenRefresh$ = authService.refreshCloudToken();
        } else if (isCmsError) {
          tokenRefresh$ = is4TokenService.ensureToken(true);
        } else {
          tokenRefresh$ = authService.refreshLocalToken();
        }

        return tokenRefresh$.pipe(
          switchMap((newToken) => {
            if (!newToken) {
              reconnectingService.setFailed('Gagal mendapatkan token baru dari server.');
              return throwError(() => error);
            }

            // Sukses refresh token! Tutup dialog reconnecting
            reconnectingService.hide();

            // Clone request dengan token baru dan pasang header retry agar tidak terjadi infinite loop
            const retriedReq = req.clone({
              headers: req.headers
                .set('Authorization', `Bearer ${newToken}`)
                .set('X-Auth-Retry', '1'),
            });

            return next(retriedReq);
          }),
          catchError((refreshErr) => {
            console.error('Auto-refresh token failed on 401:', refreshErr);
            reconnectingService.setFailed(
              'Gagal menghubungkan kembali ke server.',
              () => {
                reconnectingService.show('Mencoba menghubungkan kembali...');
                let retryRefresh$: Observable<string | null>;
                if (isCloudError) {
                  retryRefresh$ = authService.refreshCloudToken();
                } else if (isCmsError) {
                  retryRefresh$ = is4TokenService.ensureToken(true);
                } else {
                  retryRefresh$ = authService.refreshLocalToken();
                }
                retryRefresh$.subscribe({
                  next: () => reconnectingService.hide(),
                  error: () => reconnectingService.setFailed('Koneksi masih gagal terhubung.'),
                });
              }
            );
            return throwError(() => refreshErr);
          })
        );
      }

      if (error.status === 0) {
        // Status 0: Masalah jaringan, Wi-Fi terputus, atau blokir CORS/Cleartext
        const detail = `[Status 0: Network Error]\nGagal koneksi ke:\n${targetUrl}\n${
          (!!environment.is4urlCloud && targetUrl.startsWith(environment.is4urlCloud)) ||
          (!!environment.is4urlTOKEN && targetUrl.startsWith(environment.is4urlTOKEN))
            ? 'Pastikan HP terhubung ke Internet untuk server Cloud.'
            : 'Pastikan HP terhubung ke Wi-Fi yang sama dengan server lokal.'
        }`;
        console.error('Network Error:', detail, error);
        toastr.error(detail, 'Koneksi Gagal', {
          timeOut: 12000,
        });
        return throwError(() => error);
      }

      let serverMsg = '';
      if (typeof error.error === 'string') {
        serverMsg = error.error;
      } else if (error.error?.message) {
        serverMsg = error.error.message;
      } else if (error.error?.title) {
        serverMsg = error.error.title;
      } else if (error.error?.error_description) {
        serverMsg = error.error.error_description;
      }

      const msg = serverMsg ? `\nPesan: ${serverMsg}` : '';
      const fullError = `[HTTP ${error.status}] ${targetUrl}${msg}`;

      console.error('HTTP Error:', fullError, error);
      toastr.error(fullError, `Error (${error.status})`, {
        timeOut: 10000,
      });

      return throwError(() => error);
    })
  );
};
