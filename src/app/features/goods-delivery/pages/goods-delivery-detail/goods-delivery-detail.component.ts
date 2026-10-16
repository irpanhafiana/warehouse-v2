import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GoodsDeliveryService } from '../../../../core/services';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { DialogConfirmComponent } from '../../../../shared/components/dialog-confirm/dialog-confirm.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-goods-delivery-detail',
  imports: [CommonModule, LoaderComponent, DialogConfirmComponent],
  templateUrl: './goods-delivery-detail.component.html',
  styleUrl: './goods-delivery-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoodsDeliveryDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(GoodsDeliveryService);
  private toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  date: string = '';
  transportUnit: string = '';
  isLoading: boolean = true;
  goodsDeliveryDetail: any[] = [];
  isErrorPicSebagian: boolean = false;
  msgError: string = '';

  statusSelected: string = '';

  deliveriesWithRemarks: { [remarks: string]: any[] } = {};
  deliveriesWithoutRemarks: any[] = [];

  constructor() {
    this.readRouteParams();
  }

  ngOnInit() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.date = params.get('date') || this.route.snapshot.params['date'] || '';
      this.transportUnit = params.get('transportUnit') || this.route.snapshot.params['transportUnit'] || '';
      this.statusSelected = params.get('status') || this.route.snapshot.params['status'] || '';
      if (this.date && this.transportUnit) {
        this.getDetailDelivery(this.statusSelected);
      }
    });
  }

  private readRouteParams(): void {
    this.date = this.route.snapshot.params['date'] || '';
    this.transportUnit = this.route.snapshot.params['transportUnit'] || '';
    this.statusSelected = this.route.snapshot.params['status'] || '';
  }

  onTransportUnitReady() {
    this.isErrorPicSebagian = true;
    this.msgError =
      'Mohon cek ulang untuk memastikan mobil ini siap digunakan dalam pengiriman.';
  }

  onSubmit() {
    if (this.isLoading) return;
    this.isLoading = true;

    let payload: string[] = [];

    this.goodsDeliveryDetail.forEach((element) => {
      payload.push(element.Alias);
    });

    this.service
      .onFinishGoodsDelivery(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {},
        error: () => {
          this.isLoading = false;
          this.isErrorPicSebagian = false;
          this.toastr.error('Gagal menyimpan pengiriman mobil.', 'Error');
        },
        complete: () => {
          this.isLoading = false;
          this.isErrorPicSebagian = false;
          this.toastr.success(`Pengiriman berhasil disimpan`, 'Success');
          void this.router.navigate(['/main/goods-delivery/list']);
        },
      });
  }

  getDetailDelivery(status: string) {
    this.isLoading = true;

    if (status === 'ONGOING') {
      this.service
        .getDetailGoodsDelivery(this.date, this.transportUnit)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => {
            this.goodsDeliveryDetail = (data || []).map((item: any) => ({
              ...item,
              isExpanded: false,
              Details: (item.Details || []).map((detail: any) => ({
                ...detail,
                Data: this.parseDeliveryData(detail.Data),
              })),
            }));
            this.groupDeliveries();
          },
          error: () => {
            this.isLoading = false;
            this.toastr.error('Gagal mengambil detail pengiriman.', 'Error');
          },
          complete: () => {
            this.isLoading = false;
          },
        });
    } else {
      this.service
        .getDetailGoodsDeliveryHistory(this.date, this.transportUnit)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => {
            this.goodsDeliveryDetail = (data || []).map((item: any) => ({
              ...item,
              isExpanded: false,
              Details: (item.Details || []).map((detail: any) => ({
                ...detail,
                Data: this.parseDeliveryData(detail.Data),
              })),
            }));
            this.groupDeliveries();
          },
          error: () => {
            this.isLoading = false;
            this.toastr.error('Gagal mengambil riwayat detail pengiriman.', 'Error');
          },
          complete: () => {
            this.isLoading = false;
          },
        });
    }
  }

  onBack() {
    this.router.navigate(['/main/goods-delivery/list']);
  }

  toggleExpand(item: any): void {
    item.isExpanded = !item.isExpanded;
  }

  groupDeliveries() {
    const withRemarks: { [remarks: string]: any[] } = {};
    const withoutRemarks: any[] = [];

    this.goodsDeliveryDetail.forEach((item) => {
      const key = item.Remarks?.trim();

      if (!key) {
        withoutRemarks.push(item);
      } else {
        if (!withRemarks[key]) {
          withRemarks[key] = [];
        }
        withRemarks[key].push(item);
      }
    });

    this.deliveriesWithRemarks = withRemarks;
    this.deliveriesWithoutRemarks = withoutRemarks;
  }

  objectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  private parseDeliveryData(data: string | any) {
    if (typeof data === 'object' && data !== null) {
      return data;
    }
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing delivery data:', error);
      return { productCode: null, quantity: 0, baseQuantity: 0, uomCode: '' };
    }
  }
}

