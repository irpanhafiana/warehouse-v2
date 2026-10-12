import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RouteGroup } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class RouteGroupService {
  private http = inject(HttpClient);
  private apiUrl: string = environment.api;

  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Authorization:
      'Basic ' +
      btoa(environment.is4ClientID + ':' + environment.is4ClientSecret),
  });

  getRouteGroups(date: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Route/${date}`
    );
  }

  getRouteGroupHistories(date: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Route/Finish/${date}`
    );
  }

  getAdditionalInvoices(date: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Route/AdditionalInvoices/${date}`
    );
  }

  getRouteGroupDetail(alias: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Route/Detail/${alias}`
    );
  }

  postRouteGroup(payload: RouteGroup): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Route`,
      payload,
      {
        headers: this.headers,
      }
    );
  }

  putRouteGroup(payload: RouteGroup): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Route`,
      payload,
      {
        headers: this.headers,
      }
    );
  }

  changeOrderBON(payload: RouteGroup): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Route/Change`,
      payload,
      {
        headers: this.headers,
      }
    );
  }

  deleteRouteGroup(payload: RouteGroup): Observable<any> {
    return this.http.delete<any>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Route`,
      {
        headers: this.headers,
        body: payload,
      }
    );
  }

  putFinishRouteGroup(alias: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Route/Finish`,
      alias,
      {
        headers: this.headers,
      }
    );
  }

  postFinishRouteGroup(alias: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}api/v2/GoodsDeliveries/Finish`,
      alias,
      {
        headers: this.headers,
      }
    );
  }
}

