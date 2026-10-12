import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Detail } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class LoadingDataStoreService {
  private dataSubject = new BehaviorSubject<Detail[]>([]);

  getDataSubject(): Observable<Detail[]> {
    return this.dataSubject.asObservable();
  }

  setDataSubject(data: Detail[]): void {
    this.dataSubject.next(data || []);
  }

  updateOrAddDetail(incomingData: Detail): void {
    if (!incomingData || !incomingData.Id) {
      console.error('Invalid incoming data:', incomingData);
      return;
    }

    const targetData = [...this.dataSubject.getValue()];
    const existingItemIndex = targetData.findIndex(
      (item) => item.Id === incomingData.Id
    );

    if (existingItemIndex !== -1) {
      targetData[existingItemIndex] = {
        ...targetData[existingItemIndex],
        ...incomingData,
      };
    } else {
      targetData.push(incomingData);
    }

    this.dataSubject.next(targetData);
  }
}

