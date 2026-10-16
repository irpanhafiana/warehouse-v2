import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HeaderRes, Detail, SalesInvoicesModel, Driver, Vehicle } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private http = inject(HttpClient);
  private apiUrl: string = environment.api;

  loadingList: HeaderRes[] = [];

  private loadingListSubject = new BehaviorSubject<HeaderRes[]>([]);
  data$: Observable<HeaderRes[]> = this.loadingListSubject.asObservable();

  private docnumSubject = new BehaviorSubject<string>('');
  docnum$: Observable<string> = this.docnumSubject.asObservable();

  private detailSubject = new BehaviorSubject<SalesInvoicesModel | null>(null);
  detail$: Observable<SalesInvoicesModel | null> = this.detailSubject.asObservable();

  private detailItemSubject = new BehaviorSubject<Detail[]>([]);
  detailItem$: Observable<Detail[]> = this.detailItemSubject.asObservable();

  private detailItemSubjectIncoming = new BehaviorSubject<Detail | null>(null);
  detailItemIncoming$: Observable<Detail | null> = this.detailItemSubjectIncoming.asObservable();

  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Authorization:
      'Basic ' +
      btoa(environment.is4ClientID + ':' + environment.is4ClientSecret),
  });

  setLoadingListSubject(data: HeaderRes[]): void {
    this.loadingListSubject.next(data || []);
  }

  setDocnumSubject(data: string): void {
    this.docnumSubject.next(data);
  }

  setDetailSubject(data: SalesInvoicesModel | null): void {
    this.detailSubject.next(data);
  }

  setDetailItemSubject(data: Detail[]): void {
    this.detailItemSubject.next(data || []);
  }

  setDetailItemSubjectIncoming(data: Detail | null): void {
    this.detailItemSubjectIncoming.next(data);
  }

  getLoadingList(date: string): Observable<HeaderRes[]> {
    return this.http.get<HeaderRes[]>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Loading/Queue/${date}`
    );
  }

  getLoadingAllList(date: string): Observable<HeaderRes[]> {
    return this.http.get<HeaderRes[]>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Loading/Queue/All/${date}`
    );
  }

  getLoadingDetail(docnum: string): Observable<SalesInvoicesModel> {
    return this.http.get<SalesInvoicesModel>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Loading/Queue/DocNum/${docnum}`
    );
  }

  getCheckItemNotPicked(docnum: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/NotPicked/${docnum}`
    );
  }

  getCheckReceh(docnum: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/RecehExists/${docnum}`
    );
  }

  getLoadingDetailByCustomerCode(
    date: string,
    customerCode: string
  ): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/CountByCustomer/${customerCode}/${date}`
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

  getDrivers(): Observable<Driver[]> {
    return this.http.get<Driver[]>(
      `${environment.is4urlCMS}deliveryservice/api/v2/Drivers`
    );
  }

  getVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(
      `${environment.is4urlCMS}deliveryservice/api/v2/Vehicles`
    );
  }
}

