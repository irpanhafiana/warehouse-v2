import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReqTransLoadingService {
  private http = inject(HttpClient);
  private apiUrl: string = environment.api;
  private docnumSubject: BehaviorSubject<string> = new BehaviorSubject<string>('');
  docnum$: Observable<string> = this.docnumSubject.asObservable();

  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Authorization:
      'Basic ' +
      btoa(environment.is4ClientID + ':' + environment.is4ClientSecret),
  });

  getLoadingList(date: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Loading/Queue/${date}`
    );
  }

  getDeliveredItems(docnum: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/DocNum/${docnum}`
    );
  }

  getLoadingDetail(docnum: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Loading/Queue/DocNum/${docnum}`
    );
  }

  getCheckItemNotPicked(docnum: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/NotPicked/${docnum}`
    );
  }

  getCountCustomer(date: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Count/${date}`
    );
  }

  getCheckReceh(docnum: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/RecehExists/${docnum}`
    );
  }

  getLoadingDetailByCustomerCode(
    date: string,
    customerCode: string
  ): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/CountByCustomer/${customerCode}/${date}`
    );
  }

  putLoadingListDetails(payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Finish/Queue`,
      payload
    );
  }

  putLoadingCancel(payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Loading/Detail/ClearPIC`,
      payload
    );
  }

  postRouteGroup(payload: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}api/v2/GoodsDeliveries`,
      payload,
      {
        headers: this.headers,
      }
    );
  }

  postGoodsDeliveryReqTrans(payload: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery`,
      payload,
      {
        headers: this.headers,
      }
    );
  }

  putGoodsDelivery(payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}api/v2/GoodsDeliveries`, payload, {
      headers: this.headers,
    });
  }

  getDrivers(): Observable<any> {
    return this.http.get<any>(
      `${environment.is4urlCMS}deliveryservice/api/v2/Drivers`
    );
  }

  getVehicles(): Observable<any> {
    return this.http.get<any>(
      `${environment.is4urlCMS}deliveryservice/api/v2/Vehicles`
    );
  }

  setDocnumSubject(data: string): void {
    this.docnumSubject.next(data);
  }
}
