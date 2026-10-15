import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { SharedDataService } from '../../../../core/services/shared-data.service';
import { StorageService, STORAGE_KEYS } from '../../../../core/services/storage.service';
import { LoaderForceCloseComponent } from '../../../../shared/components/loader-force-close/loader-force-close.component';
import { DialogForceCloseComponent } from '../../../../shared/components/dialog-force-close/dialog-force-close.component';
import { DialogSetPicComponent } from '../../../../shared/components/dialog-set-pic/dialog-set-pic.component';

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
})
export class LoginComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private salesInvoiceService = inject(SalesInvoiceService);
  private sharedDataService = inject(SharedDataService);
  private storage = inject(StorageService);
  private cdr = inject(ChangeDetectorRef);

  username = '';
  password = '';
  greeting = '';
  defaultBranch = '';

  phoneName: string | null = null;
  pickingPic: string[] = [];

  isLoadingPic = false;
  isDialogForceClose = false;
  isProcessForceClose = false;
  isDialogSetName = false;

  async ngOnInit(): Promise<void> {
    this.setGreeting();

    this.phoneName = await this.storage.getItem(STORAGE_KEYS.PHONE_NAME);

    // Langsung buka dialog jika belum ada nama, agar user tidak menunggu layar kosong
    if (!this.phoneName) {
      this.isDialogSetName = true;
    }

    this.route.data.subscribe(async (data) => {
      this.username = data['username'] || '';
      this.password = data['password'] || '';

      const existingToken = await this.storage.getItem(STORAGE_KEYS.TOKEN);
      if (existingToken) {
        // Token sudah ada (belum clear cache / force close), jangan minta token lagi
        this.fetchDataInParallel();

        // Cek apakah cloud_token juga perlu dilengkapi di background jika belum ada
        const existingCloudToken = await this.storage.getItem(STORAGE_KEYS.CLOUD_TOKEN);
        if (!existingCloudToken && (this.username || this.password)) {
          this.authService.postLoginCloud(this.username, this.password).subscribe({
            next: async (cloudLogin) => {
              await this.storage.setItem(STORAGE_KEYS.CLOUD_TOKEN, cloudLogin.access_token);
            },
            error: (e) => console.warn('Background cloud token fetch warning:', e),
          });
        }
      } else if (this.username || this.password) {
        // Belum ada token (pertama kali buka aplikasi atau habis clear cache / force close)
        this.onLogin();
      }
    });
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

    // 1. Login ke API lokal gudang (server utama untuk operasional picking, loading, PIC)
    this.authService.postLogin(this.username, this.password).subscribe({
      next: async (apiLogin) => {
        await this.storage.setItem(STORAGE_KEYS.TOKEN, apiLogin.access_token);
        // Begitu token lokal siap, segera ambil branch dan PIC
        this.fetchDataInParallel();
      },
      error: (e) => {
        console.error('Local API login error:', e);
        this.isLoadingPic = false;
        this.cdr.markForCheck();
      },
    });

    // 2. Login ke Cloud secara paralel (tidak memblokir operasional gudang lokal jika koneksi luar terkendala)
    this.authService.postLoginCloud(this.username, this.password).subscribe({
      next: async (cloudLogin) => {
        await this.storage.setItem(STORAGE_KEYS.CLOUD_TOKEN, cloudLogin.access_token);
      },
      error: (e) => {
        console.warn('Cloud login warning (cloud features might be unavailable):', e);
      },
    });
  }

  fetchDataInParallel(): void {
    this.salesInvoiceService.getDefaultBranch().subscribe({
      next: async (branch) => {
        await this.storage.setItem(STORAGE_KEYS.DEFAULT_BRANCH, branch);
        this.defaultBranch = branch;
        this.cdr.markForCheck();
      },
      error: (e) => console.error('Fetch branch error:', e),
    });

    this.sharedDataService.getPicList().subscribe({
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

    // 1. Bersihkan seluruh web storage & preferences
    await this.storage.clear();
    this.phoneName = null;
    this.pickingPic = [];
    this.defaultBranch = '';

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
    setTimeout(() => {
      this.isProcessForceClose = false;
      window.location.replace('/');
    }, 2500);
  }

  async onPicSaved(picName: string): Promise<void> {
    this.phoneName = picName;
    await this.storage.setItem(STORAGE_KEYS.PHONE_NAME, this.phoneName);
    this.isDialogSetName = false;
  }
}

