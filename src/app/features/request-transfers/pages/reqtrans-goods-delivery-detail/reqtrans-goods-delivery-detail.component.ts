import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { GoodsDeliveryService } from '../../../../core/services/goods-delivery.service';
import { LoaderComponent, DialogConfirmComponent } from '../../../../shared/components';

@Component({
  selector: 'app-reqtrans-goods-delivery-detail',
  imports: [CommonModule, LoaderComponent, DialogConfirmComponent],
  templateUrl: './reqtrans-goods-delivery-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReqtransGoodsDeliveryDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(GoodsDeliveryService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  date: string = '';
  transportUnit: string = '';
  statusSelected: 'ONGOING' | 'HISTORY' = 'ONGOING';

  isLoading: boolean = true;
  goodsDeliveryDetail: any[] = [];
  isErrorPicSebagian: boolean = false;
  msgError: string = '';
  isReCheck: boolean = true;
  isReentry: boolean = false;
  docnumReCheck: string = '';
  isLoadingRecheck: boolean = false;

  constructor() {
    this.date = this.route.snapshot.params['date'] || '';
    this.transportUnit = this.route.snapshot.params['transportUnit'] || '';
    this.statusSelected = (this.route.snapshot.params['status'] as 'ONGOING' | 'HISTORY') || 'ONGOING';
  }

  ngOnInit(): void {
    this.getDetailDelivery(this.statusSelected);
  }

  onTransportUnitReady(): void {
    this.isErrorPicSebagian = true;
    this.msgError = 'Mohon cek ulang untuk memastikan mobil ini siap digunakan dalam pengiriman.';
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    if (this.isLoading) return;
    const payload = this.goodsDeliveryDetail.map((item) => item.Alias).filter(Boolean);
    this.isLoading = true;
    this.cdr.markForCheck();

    this.service
      .onFinishGoodsDeliveryTrans(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.isErrorPicSebagian = false;
          this.cdr.markForCheck();
          void this.router.navigate(['/main-reqtrans/picking/list']).then(() => {
            this.toastr.success('Berhasil!. Loading telah selesai dikerjakan!', 'Success');
          });
        },
        error: (e) => {
          console.error('Finish goods delivery trans error:', e);
          this.isLoading = false;
          this.toastr.error('Gagal menyelesaikan pengiriman', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  onReprocess(item: any): void {
    if (this.isLoading) return;
    const payload = [item.Alias].filter(Boolean);
    if (payload.length > 0) {
      this.isLoading = true;
      this.cdr.markForCheck();
      this.service
        .onReEntryGoodsDeliveryTrans(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.isReCheck = true;
            this.isReentry = false;
            this.toastr.success('Berhasil!. Reproses telah selesai dikerjakan!', 'Success');
            this.cdr.markForCheck();
          },
          error: (e) => {
            console.error('Reprocess error:', e);
            this.isLoading = false;
            this.toastr.error('Gagal memproses ulang', 'Error');
            this.cdr.markForCheck();
          },
        });
    }
  }

  getDetailDelivery(status: 'ONGOING' | 'HISTORY'): void {
    this.isLoading = true;
    this.isReentry = false;
    this.isReCheck = true;
    this.cdr.markForCheck();

    const request$ =
      status === 'ONGOING'
        ? this.service.getDetailGoodsDeliveryTrans(this.date, this.transportUnit)
        : this.service.getDetailGoodsDeliveryTransDetailHistory(this.date, this.transportUnit);

    request$
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
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Get detail goods delivery error:', e);
          this.isLoading = false;
          this.goodsDeliveryDetail = [];
          this.cdr.markForCheck();
        },
      });
  }

  onBack(): void {
    void this.router.navigate(['/main-reqtrans/goods-delivery/list']);
  }

  toggleExpand(item: any): void {
    item.isExpanded = !item.isExpanded;
    this.cdr.markForCheck();
  }

  onReCheck(docnum: string): void {
    if (this.isLoadingRecheck) return;
    const documentNumber = docnum.replace(/_[^_]*$/, '');
    this.isLoadingRecheck = true;
    this.docnumReCheck = docnum;
    this.cdr.markForCheck();

    this.service
      .onRecheckDeliveryByDocnum(documentNumber)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isReCheck = false;
          this.isReentry = true;
          this.isLoadingRecheck = false;
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Recheck error:', e);
          this.isLoadingRecheck = false;
          this.cdr.markForCheck();
        },
      });
  }

  private parseDeliveryData(data: string): any {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.warn('Error parsing delivery data:', error);
      return { productCode: null, quantity: 0, baseQuantity: 0, uomCode: '' };
    }
  }
}

