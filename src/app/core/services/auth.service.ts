import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { StorageService, STORAGE_KEYS } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);

  private localRefreshInFlight$: Observable<string> | null = null;
  private cloudRefreshInFlight$: Observable<string> | null = null;

  refreshLocalToken(): Observable<string> {
    if (this.localRefreshInFlight$) {
      return this.localRefreshInFlight$;
    }

    const username = environment.posUsername;
    const password = environment.posPassword;

    this.localRefreshInFlight$ = this.postLogin(username, password).pipe(
      tap(async (res) => {
        if (res?.access_token) {
          await this.storage.setItem(STORAGE_KEYS.TOKEN, res.access_token);
        }
      }),
      map((res) => res.access_token),
      shareReplay({ bufferSize: 1, refCount: false }),
      finalize(() => {
        this.localRefreshInFlight$ = null;
      })
    );

    return this.localRefreshInFlight$;
  }

  refreshCloudToken(): Observable<string> {
    if (this.cloudRefreshInFlight$) {
      return this.cloudRefreshInFlight$;
    }

    const username = environment.posUsername;
    const password = environment.posPassword;

    this.cloudRefreshInFlight$ = this.postLoginCloud(username, password).pipe(
      tap(async (res) => {
        if (res?.access_token) {
          await this.storage.setItem(STORAGE_KEYS.CLOUD_TOKEN, res.access_token);
        }
      }),
      map((res) => res.access_token),
      shareReplay({ bufferSize: 1, refCount: false }),
      finalize(() => {
        this.cloudRefreshInFlight$ = null;
      })
    );

    return this.cloudRefreshInFlight$;
  }

  generateIS4Token(): Observable<{ access_token: string; refresh_token: string }> {
    const body =
      'grant_type=password&username=' +
      environment.is4Username +
      '&password=' +
      environment.is4Password +
      '&scope=' +
      encodeURIComponent(environment.is4Scope);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        btoa(environment.is4ClientID + ':' + environment.is4ClientSecret),
    });

    return this.http.post<{ access_token: string; refresh_token: string }>(
      environment.is4urlTOKEN + environment.is4PassTokenReqUrl,
      body,
      { headers }
    );
  }

  postLogin(username: string, password: string): Observable<{ access_token: string }> {
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('username', username);
    body.set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    });

    return this.http.post<{ access_token: string }>(
      environment.api + environment.posTokenReqUrl,
      body.toString(),
      { headers }
    );
  }

  postLoginCloud(username: string, password: string): Observable<{ access_token: string }> {
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('username', username);
    body.set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    });

    return this.http.post<{ access_token: string }>(
      environment.is4urlCloud + environment.posTokenReqUrl,
      body.toString(),
      { headers }
    );
  }

  async saveToken(token: string): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.TOKEN, token);
  }

  getToken(): string | null {
    return this.storage.getItemSync(STORAGE_KEYS.TOKEN);
  }

  async logout(): Promise<void> {
    await this.storage.clear();
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
}

