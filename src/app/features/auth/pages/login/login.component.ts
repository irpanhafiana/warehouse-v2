import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { SharedDataService } from '../../../../core/services/shared-data.service';
import { StorageService, STORAGE_KEYS } from '../../../../core/services/storage.service';
import { LoaderForceCloseComponent } from '../../../../shared/components/loader-force-close/loader-force-close.component';
import { DialogForceCloseComponent } from '../../../../shared/components/dialog-force-close/dialog-force-close.component';
import { DialogSetPicComponent } from '../../../../shared/components/dialog-set-pic/dialog-set-pic.component';
import { App as CapApp } from '@capacitor/app';

@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    LoaderForceCloseComponent,
    DialogForceCloseComponent,
    DialogSetPicComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private salesInvoiceService = inject(SalesInvoiceService);
  private sharedDataService = inject(SharedDataService);
  private storage = inject(StorageService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  private forceCloseTimer: ReturnType<typeof setTimeout> | null = null;

  username = '';
  password = '';
  greeting = '';
  defaultBranch = '';

  phoneName: string | null = null;
  appVersion = 'v1.0.2';
  pickingPic: string[] = [];

  isLoadingPic = false;
  isDialogForceClose = false;
  isProcessForceClose = false;
  isDialogSetName = false;

  async ngOnInit(): Promise<void> {
    this.setGreeting();
    try { const info = await CapApp.getInfo(); this.appVersion = 'v' + info.version + ' (Build ' + info.build + ')'; } catch {}

    this.phoneName = await this.storage.getItem(STORAGE_KEYS.PHONE_NAME);

    // Langsung buka dialog jika belum ada nama, agar user tidak menunggu layar kosong
    if (!this.phoneName) {
      this.isDialogSetName = true;
    }
    this.cdr.markForCheck();

    this.username = environment.posUsername || '';
    this.password = environment.posPassword || '';

    const existingToken = await this.storage.getItem(STORAGE_KEYS.TOKEN);
    const existingCloudToken = await this.storage.getItem(STORAGE_KEYS.CLOUD_TOKEN);

    if (existingToken) {
      // Token lokal sudah ada, fetch data master cabang & PIC
      this.fetchDataInParallel();

      // Jika cloud_token belum ada, ambil segera
      if (!existingCloudToken && (this.username || this.password)) {
        this.fetchCloudToken();
      }
    } else if (this.username || this.password) {
      // Belum ada token (pertama kali buka aplikasi atau habis clear cache / force close)
      this.onLogin();
    }
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    if (this.forceCloseTimer !== null) {
      clearTimeout(this.forceCloseTimer);
      this.forceCloseTimer = null;
    }
  }

  setGreeting(): void {
    const hour = new Date().getHours();

    if (hour >= 4 && hour < 11) {
      this.greeting = 'Selamat Pagi 👋';
    } else if (hour >= 11 && hour < 15) {
      this.greeting = 'Selamat Siang 👋';
    } else if (hour >= 15 && hour < 18) {
      this.greeting = 'Selamat Sore 👋';
    } else {
      this.greeting = 'Selamat Malam 👋';
    }
  }

  onLogin(): void {
    this.isLoadingPic = true;
    this.cdr.markForCheck();

    // 1. Login ke API lokal gudang
    this.authService.postLogin(this.username, this.password).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (apiLogin) => {
        await this.storage.setItem(STORAGE_KEYS.TOKEN, apiLogin.access_token);
        this.cdr.markForCheck();
        this.fetchDataInParallel();
      },
      error: (e) => {
        console.error('Local API login error:', e);
        this.isLoadingPic = false;
        this.cdr.markForCheck();
      },
      complete: () => {
        // 2. Login ke Cloud berurutan setelah API lokal diproses (mengikuti alur stabil)
        this.fetchCloudToken();
      },
    });
  }

  fetchCloudToken(): void {
    this.authService.postLoginCloud(this.username, this.password).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (cloudLogin) => {
        await this.storage.setItem(STORAGE_KEYS.CLOUD_TOKEN, cloudLogin.access_token);
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.warn('Cloud login warning (cloud features might be unavailable):', e);
        this.cdr.markForCheck();
      },
    });
  }

  fetchDataInParallel(): void {
    this.salesInvoiceService.getDefaultBranch().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: async (branch) => {
        await this.storage.setItem(STORAGE_KEYS.DEFAULT_BRANCH, branch);
        this.defaultBranch = branch;
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error('Fetch branch error:', e);
        this.cdr.markForCheck();
      },
    });

    this.sharedDataService.getPicList().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (pics) => {
        this.pickingPic = pics;
        this.sharedDataService.setPicList(pics);
        this.isLoadingPic = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error('Fetch pic error:', e);
        this.isLoadingPic = false;
        this.cdr.markForCheck();
      },
    });
  }

  toUrl(url: string): void {
    if (url === 'picking') {
      this.router.navigate(['/main/picking/list']);
    } else if (url === 'loading') {
      this.router.navigate(['/main/loading/list']);
    } else if (url === 'finished') {
      this.router.navigate(['/main/finished/list']);
    } else if (url === 'checkout') {
      this.router.navigate(['/main/checkout/list']);
    }
  }

  toReqTrans(): void {
    this.router.navigate(['/main-reqtrans/inventory-request/list']);
  }

  toReqRec(): void {
    this.router.navigate(['/main-reqrec/request-receive/list']);
  }

  async onConfirmForceClose(): Promise<void> {
    this.isProcessForceClose = true;
    this.isDialogForceClose = false;
    this.cdr.markForCheck();

    // 1. Bersihkan seluruh web storage & preferences
    await this.storage.clear();
    this.phoneName = null;
    this.pickingPic = [];
    this.defaultBranch = '';
    this.cdr.markForCheck();

    // 2. Jika di Android native (Capacitor), panggil AppResetPlugin untuk membersihkan WebView cache & cache folder OS
    try {
      const { registerPlugin } = await import('@capacitor/core');
      const AppReset = registerPlugin<any>('AppReset');
      if (AppReset && AppReset.resetAppData) {
        await AppReset.resetAppData();
        return; // AppResetPlugin akan mematikan proses (finishAffinity & exit)
      }
    } catch (e) {
      console.warn('Native AppReset tidak tersedia atau bukan di native environment:', e);
    }

    // 3. Fallback jika dijalankan di browser
    this.forceCloseTimer = setTimeout(() => {
      this.isProcessForceClose = false;
      this.cdr.markForCheck();
      window.location.replace('/');
    }, 2500);
  }

  async onPicSaved(picName: string): Promise<void> {
    this.phoneName = picName;
    await this.storage.setItem(STORAGE_KEYS.PHONE_NAME, this.phoneName);
    this.isDialogSetName = false;
    this.cdr.markForCheck();
  }
}
