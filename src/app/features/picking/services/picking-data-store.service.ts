import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Detail } from '../../../core/models';

@Injectable({
  providedIn: 'root',
})
export class PickingDataStoreService {
  private recehSubject = new BehaviorSubject<Detail[]>([]);
  private nonRecehSubject = new BehaviorSubject<Detail[]>([]);

  getRecehData(): Observable<Detail[]> {
    return this.recehSubject.asObservable();
  }

  getNonRecehData(): Observable<Detail[]> {
    return this.nonRecehSubject.asObservable();
  }

  setRecehData(data: Detail[]): void {
    this.recehSubject.next(data || []);
  }

  setNonRecehData(data: Detail[]): void {
    this.nonRecehSubject.next(data || []);
  }

  separateRecehAndNonReceh(details: Detail[]): {
    receh: Detail[];
    nonReceh: Detail[];
  } {
    const receh = (details || []).filter(
      (item) =>
        !item.ProductModel?.Description?.includes('~') ||
        item.UoMModel?.Code?.trim().toUpperCase() === 'BAL'
    );
    const nonReceh = (details || []).filter(
      (item) =>
        item.ProductModel?.Description?.includes('~') &&
        item.UoMModel?.Code?.trim().toUpperCase() !== 'BAL'
    );
    return { receh, nonReceh };
  }

  updateOrAddDetail(isReceh: boolean, incomingData: Detail): void {
    const targetSubject = isReceh ? this.recehSubject : this.nonRecehSubject;
    const currentData = [...targetSubject.getValue()];

    const existingIndex = currentData.findIndex((item) => item.Id === incomingData.Id);

    if (existingIndex >= 0) {
      currentData[existingIndex] = { ...currentData[existingIndex], ...incomingData };
    } else {
      currentData.push(incomingData);
    }

    targetSubject.next(currentData);
  }
}

