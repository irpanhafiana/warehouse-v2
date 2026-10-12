import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HeaderRes, SalesInvoicesModel, Vehicle } from '../models';

@Injectable({
  providedIn: 'root',
})
export class DeliveryService {
  private http = inject(HttpClient);
  private apiUrl = environment.is4urlCMS;

  getMasterVehicles(): Observable<Vehicle[]> {
    return this.http.get<Vehicle[]>(`${this.apiUrl}deliveryservice/api/v2/Vehicles`);
  }

  getPickingList(date: string): Observable<HeaderRes[]> {
    return this.http.get<HeaderRes[]>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/Queue/${date}`
    );
  }

  getPickingPicList(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/PIC`);
  }

  getLoadingPicList(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/PIC`);
  }

  putPickingRemarks(payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/Locked`,
      payload
    );
  }

  putPickingRemarksUnlock(payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/Unlocked`,
      payload
    );
  }

  getLoadingList(date: string): Observable<HeaderRes[]> {
    return this.http.get<HeaderRes[]>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Loading/Queue/${date}`
    );
  }

  getFinishedList(date: string): Observable<HeaderRes[]> {
    return this.http.get<HeaderRes[]>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Loading/Finished/${date}`
    );
  }

  getFinishedDetail(docnum: string): Observable<SalesInvoicesModel> {
    return this.http.get<SalesInvoicesModel>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Loading/Finished/DocNum/${docnum}`
    );
  }

  getPickingDetail(docnum: string): Observable<SalesInvoicesModel> {
    return this.http.get<SalesInvoicesModel>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/Queue/DocNum/${docnum}`
    );
  }

  getLoadingDetail(docnum: string): Observable<SalesInvoicesModel> {
    return this.http.get<SalesInvoicesModel>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Loading/Queue/DocNum/${docnum}`
    );
  }

  getPickingListDetails(docnum: string): Observable<SalesInvoicesModel> {
    return this.http.get<SalesInvoicesModel>(`${this.apiUrl}api/v1/SalesInvoices/${docnum}`);
  }

  putPickingListDetails(payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/Queue`,
      payload
    );
  }

  putLoadingListDetails(payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Finish/Queue`,
      payload
    );
  }
}

