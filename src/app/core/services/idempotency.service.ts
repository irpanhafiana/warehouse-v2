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

  /**
   * Generates a deterministic hash key from HTTP method, URL, and optional body.
   */
  generateDeterministicKey(method: string, url: string, body?: unknown): string {
    const payload = typeof body === 'object' && body !== null ? JSON.stringify(body) : String(body ?? '');
    const input = `${method.toUpperCase()}:${url}:${payload}`;
    let hash1 = 0x811c9dc5;
    let hash2 = 0x01000193;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash1 = Math.imul(hash1 ^ char, 0x01000193);
      hash2 = Math.imul(hash2 ^ char, 0x811c9dc5);
    }
    const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
    const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');
    return `idemp-${h1}-${h2}`;
  }

  private recentKeys = new Map<string, { key: string; timestamp: number }>();
  private readonly DEDUP_WINDOW_MS = 3000;

  /**
   * Returns a cached key if the exact same request was made within the deduplication window,
   * or creates and tracks a new key. This prevents rapid double-clicks from receiving distinct keys.
   */
  getOrCreateKeyForRequest(method: string, url: string, body?: unknown): string {
    const payload = typeof body === 'object' && body !== null ? JSON.stringify(body) : String(body ?? '');
    const signature = `${method.toUpperCase()}:${url}:${payload}`;
    const now = Date.now();
    const existing = this.recentKeys.get(signature);

    if (existing && now - existing.timestamp < this.DEDUP_WINDOW_MS) {
      return existing.key;
    }

    const key = this.generateDeterministicKey(method, url, body);
    this.recentKeys.set(signature, { key, timestamp: now });

    if (this.recentKeys.size > 50) {
      for (const [k, v] of this.recentKeys.entries()) {
        if (now - v.timestamp >= this.DEDUP_WINDOW_MS) {
          this.recentKeys.delete(k);
        }
      }
    }

    return key;
  }
}

// Alias for backwards compatibility
export { IdempotencyService as IdempotencyKeyService };

