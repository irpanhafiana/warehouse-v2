import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, switchMap, EMPTY } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { Inventory, Vehicle } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components';
import { InventoryRequestService } from '../../services/inventory-request.service';
import { AuthService, SalesInvoiceService, StorageService, STORAGE_KEYS } from '../../../../core/services';

@Component({
  selector: 'app-inventory-request-view',
  imports: [CommonModule, LoaderComponent, FormsModule],
  templateUrl: './inventory-request-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InventoryRequestViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(InventoryRequestService);
  private salesInvoiceService = inject(SalesInvoiceService);
  private authService = inject(AuthService);
  private storage = inject(StorageService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  docnum: string = '';
  inventoryRequest?: Inventory;
  isSelectTransportUnit: boolean = false;
  loading: boolean = false;
  loadingSubmitted: boolean = false;
  selectedVehicle: any = null;
  transportUnitModel: { Code: string } = { Code: '' };
  vehicles: Vehicle[] = [];

  constructor() {
    this.docnum = this.route.snapshot.params['docnum'] || '';
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.docnum = params.get('docnum') || this.route.snapshot.params['docnum'] || '';
      if (this.docnum) {
        this.fetchDetailInventoryRequest(this.docnum);
      }
    });

    this.onIs4Login();
  }

  onIs4Login(): void {
    this.authService
      .generateIS4Token()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async (data) => {
          await this.storage.setItem(STORAGE_KEYS.IS4_TOKEN, data.access_token);
          await this.storage.setItem(STORAGE_KEYS.IS4_REFRESH_TOKEN, data.refresh_token);
          this.getVehicles();
        },
        error: (e) => {
          console.warn('IS4 Login failed or offline, fallback to existing token:', e);
          this.getVehicles();
        },
      });
  }

  getVehicles(): void {
    this.salesInvoiceService
      .getVehicles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.vehicles = res?.data || res || [];
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get vehicles warning:', e);
        },
      });
  }

  onSelectedVehicle(): void {
    if (this.selectedVehicle) {
      this.transportUnitModel = {
        Code: this.selectedVehicle.vehicleNo || '',
      };
    } else {
      this.transportUnitModel = { Code: '' };
    }
  }

  onSebagianValueChange(indicator: string, id: number): void {
    if (!this.inventoryRequest || !this.inventoryRequest.Details) return;

    const item = this.inventoryRequest.Details.find((detail) => detail.Id === id);
    if (item) {
      if (indicator === '+') {
        item.sebagianValue = (item.sebagianValue || 0) + 1;
      } else if (indicator === '-') {
        if ((item.sebagianValue || 0) > 0) {
          item.sebagianValue = (item.sebagianValue || 0) - 1;
        }
      }
      item.Quantity = item.sebagianValue;
      this.cdr.markForCheck();
    }
  }

  fetchDetailInventoryRequest(docnum: string): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.service
      .getDeliveryDocnum(docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.loading = false;
          this.inventoryRequest = data;

          if (this.inventoryRequest && this.inventoryRequest.Details) {
            const newDetails = [];
            for (const element of this.inventoryRequest.Details) {
              if (element.ApprovalQuantity > 0) {
                element.UoMModel = {
                  ...element.UoMModel,
                  Code: element.ApprovalUoMModel?.Code || element.UoMModel?.Code,
                };
                element.BaseQuantity = element.ApprovalBaseQuantity;
                element.Quantity = element.ApprovalQuantity;
                element.sebagianValue = element.Quantity;
                newDetails.push(element);
              }
            }
            this.inventoryRequest.Details = newDetails;
          }
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Fetch detail inventory request error:', e);
          this.loading = false;
          this.toastr.error('Gagal memuat detail permintaan barang', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  onSubmit(): void {
    if (!this.inventoryRequest || this.loadingSubmitted) {
      return;
    }

    this.loadingSubmitted = true;
    this.inventoryRequest.TransportUnitModel = this.transportUnitModel as any;
    this.cdr.markForCheck();

    const request = this.inventoryRequest;

    this.service
      .postCheckDeliveryDocnum(request)
      .pipe(
        catchError((e) => {
          console.error('Post check delivery docnum error:', e);
          this.loadingSubmitted = false;
          this.isSelectTransportUnit = false;
          this.toastr.warning('Pemeriksaan delivery mengarahkan kembali ke daftar picking', 'Info');
          this.toReqTransPicking();
          return EMPTY;
        }),
        switchMap(() => this.service.postDeliveryDocnum(request)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.loadingSubmitted = false;
          this.isSelectTransportUnit = false;
          this.toastr.success('Permintaan transfer berhasil diproses!', 'Success');
          this.toReqTransPicking();
        },
        error: (e) => {
          console.error('Post delivery docnum error:', e);
          this.loadingSubmitted = false;
          this.toastr.error('Gagal memproses persetujuan delivery', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  toReqTransPicking(): void {
    void this.router.navigate(['/main-reqtrans/picking/list']);
  }

  onBack(): void {
    void this.router.navigate(['/main-reqtrans/inventory-request/list']);
  }
}

