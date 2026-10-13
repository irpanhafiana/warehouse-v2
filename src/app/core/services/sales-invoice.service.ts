import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HeaderRes } from '../models/header-response.model';
import { SalesInvoicesModel } from '../models/sales-invoice.model';
import { Driver } from '../models/driver.model';
import { Vehicle } from '../models/vehicle.model';

@Injectable({
  providedIn: 'root',
})
export class SalesInvoiceService {
  private http = inject(HttpClient);
  private apiUrl = environment.api;

  getDefaultBranch(): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}api/v1/Branches/Default`);
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

  putPickingRemarks(payload: { DocNum?: string; PIC?: string; [key: string]: any }): Observable<any> {
    return this.http.put(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/Locked`,
      payload
    );
  }

  putPickingRemarksUnlock(payload: { DocNum?: string; PIC?: string; [key: string]: any }): Observable<any> {
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

  getCheckoutList(date: string): Observable<HeaderRes[]> {
    return this.http.get<HeaderRes[]>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Checkout/${date}`
    );
  }

  getCheckoutDetail(docnum: string): Observable<SalesInvoicesModel> {
    return this.http.get<SalesInvoicesModel>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Checkout/DocNum/${docnum}`
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

  getCountCustomer(date: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Count/${date}`
    );
  }

  putPickingListDetails(payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/Queue`,
      payload,
      { responseType: 'text' as 'json' }
    );
  }

  putLoadingListDetails(payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Finish/Queue`,
      payload
    );
  }

  putPickingCancel(payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/Detail/ClearPIC`,
      payload
    );
  }

  putLoadingCancel(payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Loading/Detail/ClearPIC`,
      payload
    );
  }

  getDashboard(date: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Dashboard/${date}`
    );
  }

  getBranchList(branch: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/InventoryRequests/Delivery/${branch}/list`
    );
  }

  getDeliveryDocnum(docnum: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}api/v1/InventoryRequests/Delivery/${docnum}`
    );
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

