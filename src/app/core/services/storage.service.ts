import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

export const STORAGE_KEYS = {
  TOKEN: 'token',
  CLOUD_TOKEN: 'cloud_token',
  IS4_TOKEN: 'is4_token',
  IS4_REFRESH_TOKEN: 'is4_refresh_token',
  DEFAULT_BRANCH: 'defaultBranch',
  PHONE_NAME: 'phoneName',
} as const;

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private cache = new Map<string, string>();

  constructor() {
    this.initFromLocalStorage();
    this.hydrateCache();
  }

  /**
   * Baca langsung seluruh key dari localStorage ke in-memory cache secara SINKRON
   * saat awal instansiasi (menghindari race condition saat refresh halaman).
   */
  private initFromLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      for (const key of Object.values(STORAGE_KEYS)) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          this.cache.set(key, val);
        }
      }
    } catch (e) {
      console.warn('Gagal membaca localStorage saat startup:', e);
    }
  }

  /**
   * Sinkronisasi dua arah dengan Capacitor Preferences di background.
   */
  private async hydrateCache(): Promise<void> {
    for (const key of Object.values(STORAGE_KEYS)) {
      try {
        const { value } = await Preferences.get({ key });
        if (value !== null) {
          this.cache.set(key, value);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
          }
        } else {
          // Jika Preferences belum punya tapi localStorage punya, sinkronkan ke Preferences
          const localVal = this.cache.get(key) ?? (typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null);
          if (localVal !== null) {
            await Preferences.set({ key, value: localVal });
          }
        }
      } catch (e) {
        console.warn(`Gagal hydrate Preferences untuk key ${key}:`, e);
      }
    }
  }

  getItemSync(key: string): string | null {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) {
          this.cache.set(key, val);
          return val;
        }
      } catch (e) {
        console.warn(`Gagal membaca localStorage sync untuk key ${key}:`, e);
      }
    }
    return null;
  }

  async getItem(key: string): Promise<string | null> {
    // 1. Cek dari in-memory cache / localStorage secara sinkron terlebih dahulu
    const syncVal = this.getItemSync(key);
    if (syncVal !== null) {
      return syncVal;
    }

    // 2. Fallback cek ke Preferences jika belum ditemukan
    try {
      const { value } = await Preferences.get({ key });
      if (value !== null) {
        this.cache.set(key, value);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(key, value);
        }
        return value;
      }
    } catch (e) {
      console.warn(`Gagal mengambil Preferences untuk key ${key}:`, e);
    }

    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.cache.set(key, value);

    // Selalu simpan ke localStorage agar bisa diakses langsung secara sinkron saat reload
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('Gagal menyimpan ke localStorage:', e);
      }
    }

    // Simpan ke Capacitor Preferences untuk persistensi native
    try {
      await Preferences.set({ key, value });
    } catch (e) {
      console.warn('Gagal menyimpan ke Preferences:', e);
    }
  }

  async removeItem(key: string): Promise<void> {
    this.cache.delete(key);

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('Gagal menghapus dari localStorage:', e);
      }
    }

    try {
      await Preferences.remove({ key });
    } catch (e) {
      console.warn('Gagal menghapus dari Preferences:', e);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.clear();
      } catch (e) {
        console.warn('Gagal clear localStorage:', e);
      }
    }

    try {
      await Preferences.clear();
    } catch (e) {
      console.warn('Gagal clear Preferences:', e);
    }
  }

  // Convenience aliases
  async get(key: string): Promise<string | null> {
    return this.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    return this.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    return this.removeItem(key);
  }
}

