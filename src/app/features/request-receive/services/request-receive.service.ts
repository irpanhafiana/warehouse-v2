import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HeaderRes, Inventory, SalesInvoicesModel } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class RequestReceiveService {
  private http = inject(HttpClient);
  private apiUrl: string = environment.api;
  private apiUrlCloud: string = environment.is4urlCloud;

  private headers = new HttpHeaders({
    'Content-Type': 'application/json',
    Authorization:
      'Basic ' +
      btoa(environment.is4ClientID + ':' + environment.is4ClientSecret),
  });

  getDefaultBranch(): Observable<string> {
    return this.http.get(`${this.apiUrl}api/v1/Branches/Default`, {
      responseType: 'text',
    });
  }

  postCheckReceiveByDocNum(docnum: string[]): Observable<string[]> {
    return this.http.post<string[]>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Receive/CheckDocNum`,
      docnum
    );
  }

  getRequestReceiveChecklist(docnum: string): Observable<Inventory> {
    return this.http.get<Inventory>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Receive/Queue/DocNum/${docnum}`
    );
  }

  getRequestReceiveList(branch: string): Observable<Inventory[]> {
    return this.http.get<Inventory[]>(
      `${this.apiUrlCloud}api/v1/InventoryRequests/Receive/${branch}/list`
    );
  }

  getHistoryRequestReceive(date: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Receive/history/${date}`
    );
  }

  getBONProcessedRequestReceive(date: string): Observable<HeaderRes[]> {
    return this.http.get<HeaderRes[]>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Receive/${date}`
    );
  }

  getDetailHistoryRequestReceive(docnum: string): Observable<SalesInvoicesModel> {
    return this.http.get<SalesInvoicesModel>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Receive/history/docnum/${docnum}`
    );
  }

  getRequestReceiveDocnum(docnum: string): Observable<Inventory> {
    return this.http.get<Inventory>(
      `${this.apiUrlCloud}api/v1/InventoryRequests/Receive/${docnum}`
    );
  }

  postReceiveDocnum(payload: Inventory): Observable<string> {
    return this.http.post(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Receive`,
      payload,
      {
        headers: this.headers,
        responseType: 'text',
      }
    );
  }

  putReceiveDocnum(payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Receive/Partial`,
      payload,
      {
        headers: this.headers,
      }
    );
  }

  postReceive(payload: any): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrlCloud}api/v1/InventoryRequests/Receive`,
      payload,
      {
        headers: this.headers,
      }
    );
  }

  putReceiveQueueFinish(payload: any): Observable<any> {
    return this.http.put<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Receive/Finish/Queue`,
      payload,
      {
        headers: this.headers,
      }
    );
  }

  getPickingPicList(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/PIC`
    );
  }

  putCancelCheckList(payload: any): Observable<any> {
    return this.http.put(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Receive/Detail/ClearPIC`,
      payload
    );
  }
}

