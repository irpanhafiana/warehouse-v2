import { inject } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpRequest,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import { StorageService, STORAGE_KEYS } from '../services/storage.service';

export const httpErrorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const toastr = inject(ToastrService);
  const storage = inject(StorageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Jika status HTTP 200 tapi masuk catchError, berarti server mengembalikan string non-JSON (sukses)
      if (error.status === 200) {
        return of(new HttpResponse({
          body: error.error?.text ?? error.message ?? null,
          status: 200,
          statusText: 'OK',
          url: req.url,
        }));
      }

      // Ambil path URL target
      const targetUrl = req.url;

      if (error.status === 401) {
        storage.removeItem(STORAGE_KEYS.TOKEN);
        storage.removeItem(STORAGE_KEYS.CLOUD_TOKEN);
      }

      if (error.status === 0) {
        // Status 0: Masalah jaringan, Wi-Fi terputus, atau blokir CORS/Cleartext
        const detail = `[Status 0: Network Error]\nGagal koneksi ke:\n${targetUrl}\nPastikan HP terhubung ke Wi-Fi yang sama dengan server.`;
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

