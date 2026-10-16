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
  // Cek apakah request sudah memiliki IdempotencyKey (tidak boleh menimpa header yang sudah dipasang caller)
  const isTokenRequest = req.url.includes('token') || req.url.includes('connect/token');
  const hasIdempotencyKey =
    req.headers.has('IdempotencyKey') ||
    req.headers.has('Idempotency-Key') ||
    req.headers.has('idempotencykey');

  if (!isTokenRequest && !hasIdempotencyKey && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method.toUpperCase())) {
    headers['IdempotencyKey'] = idempotencyService.getOrCreateKeyForRequest(req.method, req.url, req.body);
  }

  // Tentukan apakah request menargetkan endpoint IS4 / Cloud
  const isIS4CloudTarget = (): boolean => {
    if (!environment.is4urlCloud) return false;
    // Pada production (host berbeda), cocokkan prefix is4urlCloud
    if (environment.is4urlCloud !== environment.api && req.url.startsWith(environment.is4urlCloud)) {
      return true;
    }
    // Pada dev mode di mana api dan is4urlCloud berbagi base host yang sama,
    // kenali endpoint spesifik IS4 Cloud agar tidak jatuh ke branch api lokal
    if (req.url.startsWith(environment.is4urlCloud)) {
      if (
        req.url.includes('/api/v1/InventoryRequests') ||
        req.url.includes('/InventoryTransfers/Tab/Delivery/Finish/Recheck') ||
        req.headers.has('X-Target-Cloud')
      ) {
        return true;
      }
    }
    return false;
  };

  // Tentukan jenis target URL (jangan attach Bearer token untuk endpoint request token)
  if (req.url.startsWith(environment.is4urlTOKEN)) {
    const credentials = btoa(`${environment.is4ClientID}:${environment.is4ClientSecret}`);
    headers['Authorization'] = `Basic ${credentials}`;
  } else if (req.url.startsWith(environment.is4urlCMS)) {
    if (is4Token) {
      headers['Authorization'] = `Bearer ${is4Token}`;
    }
  } else if (!isTokenRequest && isIS4CloudTarget()) {
    if (cloudToken) {
      headers['Authorization'] = `Bearer ${cloudToken}`;
    }
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

