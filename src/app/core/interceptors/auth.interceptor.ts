import { HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IdempotencyService } from '../services/idempotency.service';
import { StorageService, STORAGE_KEYS } from '../services/storage.service';
import { environment } from '../../../environments/environment';

export function authInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const storage = inject(StorageService);
  const idempotencyService = inject(IdempotencyService);

  const authToken = storage.getItemSync(STORAGE_KEYS.TOKEN);
  const is4Token = storage.getItemSync(STORAGE_KEYS.IS4_TOKEN);
  const cloudToken = storage.getItemSync(STORAGE_KEYS.CLOUD_TOKEN);

  const headers: Record<string, string> = {};

  // Pasang IdempotencyKey hanya pada request mutasi data (POST, PUT, DELETE, PATCH), KECUALI endpoint token/auth
  const isTokenRequest = req.url.includes('token') || req.url.includes('connect/token');
  if (!isTokenRequest && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method.toUpperCase())) {
    headers['IdempotencyKey'] = idempotencyService.generateKey();
  }

  // Tentukan jenis target URL (jangan attach Bearer token untuk endpoint request token)
  if (!isTokenRequest && req.url.startsWith(environment.is4urlCloud)) {
    if (cloudToken) {
      headers['Authorization'] = `Bearer ${cloudToken}`;
    }
  } else if (req.url.startsWith(environment.is4urlCMS)) {
    if (is4Token) {
      headers['Authorization'] = `Bearer ${is4Token}`;
    }
  } else if (req.url.startsWith(environment.is4urlTOKEN)) {
    const credentials = btoa(`${environment.is4ClientID}:${environment.is4ClientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else if (!isTokenRequest && req.url.startsWith(environment.api)) {
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
  }

  if (Object.keys(headers).length > 0) {
    return next(req.clone({ setHeaders: headers }));
  }

  return next(req);
}

