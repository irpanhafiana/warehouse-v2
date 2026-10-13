import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReqtransPickingService {
  private http = inject(HttpClient);
  private apiUrl: string = environment.api;

  getPickingList(date: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Picking/Queue/${date}`
    );
  }

  getPickingListDetails(docnum: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}api/v1/SalesInvoices/${docnum}`);
  }

  putPickingRemarks(payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Picking/Locked`,
      payload
    );
  }

  addBoxQTY(payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Picking/BoxUsed`,
      payload
    );
  }

  getPickingDetail(docnum: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Picking/Queue/DocNum/${docnum}`
    );
  }

  putPickingCancel(payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Picking/Detail/ClearPIC`,
      payload
    );
  }

  getPickingPicList(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/PIC`);
  }

  putPickingListDetails(payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Picking/Queue`,
      payload
    );
  }
}

