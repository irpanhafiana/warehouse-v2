import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Inventory } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class InventoryRequestService {
  private http = inject(HttpClient);
  private apiUrl: string = environment.api;
  private apiCloud: string = environment.is4urlCloud;

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

  getDeliveryList(branch: string): Observable<Inventory[]> {
    return this.http.get<Inventory[]>(
      `${this.apiCloud}api/v1/InventoryRequests/Delivery/${branch}/list`
    );
  }

  getDeliveryDocnum(docnum: string): Observable<Inventory> {
    return this.http.get<Inventory>(
      `${this.apiCloud}api/v1/InventoryRequests/Delivery/${docnum}`
    );
  }

  postDeliveryDocnum(payload: Inventory): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}api/v1/InventoryTransfers/Tab/Delivery/Process`,
      payload,
      {
        headers: this.headers,
      }
    );
  }

  postCheckDeliveryDocnum(payload: Inventory): Observable<any> {
    return this.http.post<any>(
      `${this.apiCloud}api/v1/InventoryRequests/Tab/Delivery/Process/Check`,
      payload,
      {
        headers: this.headers,
      }
    );
  }
}

