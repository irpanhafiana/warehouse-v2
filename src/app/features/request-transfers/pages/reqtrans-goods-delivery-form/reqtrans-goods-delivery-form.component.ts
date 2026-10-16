import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Detail, Driver, Vehicle } from '../../../../core/models';
import { AuthService } from '../../../../core/services/auth.service';
import { LoaderComponent, DialogConfirmComponent } from '../../../../shared/components';
import { ReqTransLoadingService } from '../../services/reqtrans-loading.service';

@Component({
  selector: 'app-reqtrans-goods-delivery-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoaderComponent, DialogConfirmComponent],
  templateUrl: './reqtrans-goods-delivery-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReqtransGoodsDeliveryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private loadingService = inject(ReqTransLoadingService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  deliveryForm: FormGroup = this.fb.group({
    TransportUnit: ['', Validators.required],
    Driver: ['', Validators.required],
  });

  docnum: string = '';
  customerName: string = '';
  vehicles: Vehicle[] = [];
  drivers: Driver[] = [];
  itemLoaded: Detail[] = [];

  selectedVehicle: Vehicle | null = null;
  selectedVehicleNo: string = '';
  selectedVehicleName: string = '';
  selectedDriverName: string = '';

  loading: boolean = false;
  isItemsNull: boolean = false;
  isDialogConfirmSubmit: boolean = false;
  msgError: string = '';

  constructor() {
    this.docnum = this.route.snapshot.params['docnum'] || '';
    this.customerName = this.route.snapshot.params['customerName'] || '';

    const dataLocalStorage = localStorage.getItem(`GOODSREQTRANS${this.docnum}`);
    this.itemLoaded = dataLocalStorage ? JSON.parse(dataLocalStorage) : [];
  }

  ngOnInit(): void {
    this.onIs4Login();
  }

  onSelectedVehicle(): void {
    if (this.selectedVehicle) {
      this.selectedVehicleNo = this.selectedVehicle.vehicleNo;
      this.selectedVehicleName = this.selectedVehicle.description;
      this.deliveryForm.patchValue({ TransportUnit: this.selectedVehicleNo });
    } else {
      this.selectedVehicleNo = '';
      this.selectedVehicleName = '';
      this.deliveryForm.patchValue({ TransportUnit: '' });
    }
    this.cdr.markForCheck();
  }

  onSelectedDriver(e: Event): void {
    const target = e.target as HTMLSelectElement;
    this.selectedDriverName = target.value;
    this.deliveryForm.patchValue({ Driver: this.selectedDriverName });
    this.cdr.markForCheck();
  }

  onIs4Login(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.authService
      .generateIS4Token()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          localStorage.setItem('is4_token', data.access_token);
          localStorage.setItem('is4_refresh_token', data.refresh_token);
          this.getVehicles();
          this.getDrivers();
        },
        error: (e) => {
          console.error('IS4 token error:', e);
          this.loading = false;
          this.toastr.error('Gagal otentikasi IS4', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  getVehicles(): void {
    this.loadingService
      .getVehicles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.vehicles = res?.data || [];
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get vehicles warning:', e);
          this.cdr.markForCheck();
        },
        complete: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  getDrivers(): void {
    this.loadingService
      .getDrivers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.drivers = res?.data || [];
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get drivers warning:', e);
          this.cdr.markForCheck();
        },
      });
  }

  onBack(): void {
    localStorage.removeItem(`GOODSREQTRANS${this.docnum}`);
    this.location.back();
  }

  clearLocalStorage(): void {
    localStorage.removeItem(`GOODSREQTRANS${this.docnum}`);
    localStorage.removeItem(this.docnum);
  }

  openConfirmSubmit(): void {
    if (!this.selectedVehicleNo || !this.selectedDriverName) {
      this.isItemsNull = true;
      this.msgError = 'Mohon untuk memilih mobil dan driver terlebih dahulu';
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

  onSubmit(): void {
    if (this.loading) return;
    this.loading = true;
    this.cdr.markForCheck();

    const jsonDetails = this.itemLoaded.map((item: any) => ({
      LineNo: item.LineNo,
      Data: JSON.stringify({
        ProductModel: {
          Code: item.ProductModel?.Code || '',
          Name: item.ProductModel?.Name || '',
        },
        UoMModel: {
          Code: item.UoMModel?.Code || '',
        },
        Quantity:
          item.sebagianValue === 0
            ? item.OpenQuantity
            : item.sebagianValue || '',
        BaseQuantity: item.BaseQuantity || '',
      }),
      Id: item.Id,
      Remarks: item.Remarks,
    }));

    const payload = {
      TransportUnit: this.selectedVehicleNo,
      TransportDescription: this.selectedVehicleName,
      BasedSalesInvoiceDocNum: this.docnum,
      DocDate: new Date(),
      Driver: this.selectedDriverName,
      Details: jsonDetails,
      CustomerName: this.customerName,
    };

    this.loadingService
      .postGoodsDeliveryReqTrans(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading = false;
          this.isDialogConfirmSubmit = false;
          this.clearLocalStorage();
          this.toastr.success('Berhasil Menambahkan Goods Delivery', 'Success');
          this.cdr.markForCheck();
          this.location.back();
        },
        error: (e) => {
          console.error('Post goods delivery reqtrans error:', e);
          this.loading = false;
          this.isDialogConfirmSubmit = false;
          this.toastr.error('Gagal menambahkan Goods Delivery', 'Error');
          this.cdr.markForCheck();
        },
      });
  }
}

