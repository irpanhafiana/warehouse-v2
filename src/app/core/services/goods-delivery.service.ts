import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GoodsDeliveryService {
  private http = inject(HttpClient);
  private apiUrl: string = environment.api;
  private apiUrlCloud: string = environment.is4urlCloud;

  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Authorization:
      'Basic ' +
      btoa(environment.is4ClientID + ':' + environment.is4ClientSecret),
  });

  getGoodsDeliveryList(date: string): Observable<any> {
    return this.http.get(`${this.apiUrl}api/v2/GoodsDeliveries/${date}`);
  }

  getGoodsDeliveryListTrans(date: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/${date}`
    );
  }

  getGoodsDeliveryHistoryList(date: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v2/GoodsDeliveries/History/${date}`
    );
  }

  getDetailGoodsDelivery(date: string, transportUnit: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v2/GoodsDeliveries/${date}/${transportUnit}`
    );
  }

  getDetailGoodsDeliveryHistory(
    date: string,
    transportUnit: string
  ): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v2/GoodsDeliveries/History/${date}/${transportUnit}`
    );
  }

  onFinishGoodsDelivery(payload: string[]): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v2/GoodsDeliveries/Finish`,
      payload,
      {
        headers: this.headers,
      }
    );
  }

  getCheckBON(docnum: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v2/GoodsDeliveries/DocNum/${docnum}`
    );
  }

  getCheckBONTransfers(docnum: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/InventoryTransfers/Delivery/DocNum/${docnum}`
    );
  }
}

