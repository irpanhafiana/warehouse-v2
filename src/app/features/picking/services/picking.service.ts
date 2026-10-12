import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { HeaderRes, Detail, SalesInvoicesModel } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class PickingService {
  private http = inject(HttpClient);
  private apiUrl: string = environment.api;

  pickingList: HeaderRes[] = [];

  private pickingListSubject = new BehaviorSubject<HeaderRes[]>([]);
  data$: Observable<HeaderRes[]> = this.pickingListSubject.asObservable();

  private pickingDetailSubject = new BehaviorSubject<Detail[]>([]);
  pickingDetail$: Observable<Detail[]> = this.pickingDetailSubject.asObservable();

  private pickingDetailIncomingSubject = new BehaviorSubject<Detail>({} as Detail);
  pickingDetailIncoming$: Observable<Detail> = this.pickingDetailIncomingSubject.asObservable();

  getPickingList(date: string): Observable<HeaderRes[]> {
    return this.http.get<HeaderRes[]>(
      `${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/Queue/${date}`
    );
  }

  getPickingListDetails(docnum: string): Observable<SalesInvoicesModel> {
    return this.http.get<SalesInvoicesModel>(`${this.apiUrl}api/v1/SalesInvoices/${docnum}`);
  }

  setPickingListSubject(data: HeaderRes[]): void {
    this.pickingListSubject.next(data || []);
  }

  setPickingDetailSubject(data: Detail[]): void {
    this.pickingDetailSubject.next(data || []);
  }

  setPickingDetailIncomingSubject(data: Detail): void {
    this.pickingDetailIncomingSubject.next(data);
  }
}

