import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class IdempotencyService {
  private _key: string = '';

  constructor() {
    this.generateKey();
  }

  get key(): string {
    return this._key;
  }

  generateKey(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      this._key = crypto.randomUUID();
    } else {
      this._key = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    return this._key;
  }
}

// Alias for backwards compatibility
export { IdempotencyService as IdempotencyKeyService };

