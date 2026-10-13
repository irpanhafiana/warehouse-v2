import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Inventory, Vehicle } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components';
import { ReqTransLoadingService } from '../../../request-transfers/services/reqtrans-loading.service';
import { InventoryRequestService } from '../../services/inventory-request.service';

@Component({
  selector: 'app-inventory-request-view',
  imports: [CommonModule, LoaderComponent, FormsModule],
  templateUrl: './inventory-request-view.component.html',
})
export class InventoryRequestViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(InventoryRequestService);
  private loadingService = inject(ReqTransLoadingService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

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
    this.getVehicles();
    if (this.docnum) {
      this.fetchDetailInventoryRequest(this.docnum);
    }
  }

  getVehicles(): void {
    this.loadingService.getVehicles().subscribe({
      next: (res) => {
        this.vehicles = res?.data || [];
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

    this.service.getDeliveryDocnum(docnum).subscribe({
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

    this.service.postCheckDeliveryDocnum(this.inventoryRequest).subscribe({
      next: () => {
        this.service.postDeliveryDocnum(this.inventoryRequest!).subscribe({
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
      },
      error: (e) => {
        console.error('Post check delivery docnum error:', e);
        this.loadingSubmitted = false;
        this.isSelectTransportUnit = false;
        this.toastr.warning('Pemeriksaan delivery mengarahkan kembali ke daftar picking', 'Info');
        this.toReqTransPicking();
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

