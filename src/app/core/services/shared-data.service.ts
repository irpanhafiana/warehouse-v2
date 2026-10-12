import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SharedDataService {
  private http = inject(HttpClient);
  private apiUrl: string = environment.api;

  private picList = new BehaviorSubject<string[]>([]);
  picListData$: Observable<string[]> = this.picList.asObservable();

  getPicList(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}api/v1/SalesInvoices/Tab/Picking/PIC`);
  }

  setPicList(data: string[]): void {
    this.picList.next(data);
  }
}

