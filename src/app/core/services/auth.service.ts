import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService, STORAGE_KEYS } from './storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private storage = inject(StorageService);

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

