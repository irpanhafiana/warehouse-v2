import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';

import { LoadingService } from '../../services/loading.service';
import { AuthService } from '../../../../core/services/auth.service';
import { StorageService } from '../../../../core/services/storage.service';

import { Vehicle, Driver, Detail } from '../../../../core/models';

import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { DialogConfirmComponent } from '../../../../shared/components/dialog-confirm/dialog-confirm.component';

@Component({
  selector: 'app-loading-add-to-delivery',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoaderComponent, DialogConfirmComponent],
  templateUrl: './loading-add-to-delivery.component.html',
  styleUrl: './loading-add-to-delivery.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingAddToDeliveryComponent implements OnInit {
  private location = inject(Location);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private service = inject(LoadingService);
  private authService = inject(AuthService);
  private storageService = inject(StorageService);
  private toastr = inject(ToastrService);
  private destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  deliveryForm: FormGroup;
  docnum = '';
  vehicles: Vehicle[] = [];
  drivers: Driver[] = [];
  isItemsNull = false;
  isDialogConfirmSubmit = false;
  msgError = '';

  selectedVehicleNo = '';
  selectedVehicleName = '';
  selectedDriverName = '';
  loading = false;
  itemLoaded: Detail[] = [];
  selectedVehicle: Vehicle | null = null;

  constructor() {
    this.deliveryForm = this.fb.group({
      TransportUnit: ['', Validators.required],
      Driver: ['', Validators.required],
    });

    this.docnum = this.route.snapshot.params['docnum'] || '';
  }

  async ngOnInit(): Promise<void> {
    const raw = await this.storageService.get(`GOODS${this.docnum}`);
    if (raw) {
      try {
        this.itemLoaded = JSON.parse(raw);
      } catch {
        this.itemLoaded = [];
      }
    }
    this.cdr.markForCheck();

    this.onIs4Login();
  }

  onSelectedVehicle(): void {
    if (this.selectedVehicle) {
      this.selectedVehicleNo = this.selectedVehicle.vehicleNo;
      this.selectedVehicleName = this.selectedVehicle.description;
    } else {
      this.selectedVehicleNo = '';
      this.selectedVehicleName = '';
    }
    this.cdr.markForCheck();
  }

  onSelectedDriver(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this.selectedDriverName = select.value;
    this.cdr.markForCheck();
  }

  onIs4Login(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.authService
      .generateIS4Token()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (data) => {
          this.loading = false;
          if (data?.access_token) {
            await this.storageService.set('is4_token', data.access_token);
          }
          if (data?.refresh_token) {
            await this.storageService.set('is4_refresh_token', data.refresh_token);
          }
          this.getVehicles();
          this.getDrivers();
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  getVehicles(): void {
    this.service
      .getVehicles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.vehicles = data?.data || data || [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
  }

  getDrivers(): void {
    this.service
      .getDrivers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.drivers = data?.data || data || [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
  }

  async onBack(): Promise<void> {
    await this.storageService.remove(`GOODS${this.docnum}`);
    this.location.back();
  }

  openConfirmSubmit(): void {
    if (!this.selectedVehicleNo || !this.selectedDriverName) {
      this.isItemsNull = true;
      this.msgError = 'Mohon untuk memilih mobil dan driver terlebih dahulu.';
      this.cdr.markForCheck();
      return;
    }

    if (!this.itemLoaded || this.itemLoaded.length === 0) {
      this.isItemsNull = true;
      this.msgError = 'Tidak ada produk yang sudah dimuat. Silahkan periksa kembali.';
      this.cdr.markForCheck();
      return;
    }

    this.isDialogConfirmSubmit = true;
    this.cdr.markForCheck();
  }

  async onSubmit(): Promise<void> {
    if (this.loading) return;
    const currentDate = new Date();
    const jsonDetails = this.itemLoaded.map((item: any) => ({
      LineNo: item.LineNo,
      Data: JSON.stringify(item),
      Id: item.Id,
      Remarks: item.Remarks,
    }));

    const payload = {
      TransportUnit: this.selectedVehicleNo,
      TransportDescription: this.selectedVehicleName,
      BasedSalesInvoiceDocNum: this.docnum,
      DocDate: currentDate,
      Driver: this.selectedDriverName,
      Details: jsonDetails,
    };

    this.loading = true;
    this.cdr.markForCheck();
    this.service
      .postRouteGroup(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async () => {
          this.loading = false;
          this.isDialogConfirmSubmit = false;
          await this.storageService.remove(`GOODS${this.docnum}`);
          this.toastr.success('Berhasil menambahkan Goods Delivery', 'Success');
          this.cdr.markForCheck();
          this.location.back();
        },
        error: (err) => {
          this.loading = false;
          this.isDialogConfirmSubmit = false;
          this.isItemsNull = true;
          this.msgError = err?.error?.message || 'Gagal menambahkan Goods Delivery.';
          this.cdr.markForCheck();
        },
      });
  }
}

