import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { GoodsDeliveryService } from '../../../../core/services/goods-delivery.service';
import { LoaderComponent } from '../../../../shared/components';

@Component({
  selector: 'app-reqtrans-goods-delivery-detail',
  imports: [CommonModule, LoaderComponent],
  templateUrl: './reqtrans-goods-delivery-detail.component.html',
})
export class ReqtransGoodsDeliveryDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(GoodsDeliveryService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

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
  }

  onSubmit(): void {
    const payload = this.goodsDeliveryDetail.map((item) => item.Alias).filter(Boolean);
    this.isLoading = true;
    this.cdr.markForCheck();

    this.service.onFinishGoodsDeliveryTrans(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.isErrorPicSebagian = false;
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
    const payload = [item.Alias].filter(Boolean);
    if (payload.length > 0) {
      this.service.onReEntryGoodsDeliveryTrans(payload).subscribe({
        next: () => {
          this.isReCheck = true;
          this.isReentry = false;
          this.toastr.success('Berhasil!. Reproses telah selesai dikerjakan!', 'Success');
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Reprocess error:', e);
          this.toastr.error('Gagal memproses ulang', 'Error');
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

    request$.subscribe({
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
  }

  onReCheck(docnum: string): void {
    const documentNumber = docnum.replace(/_[^_]*$/, '');
    this.isLoadingRecheck = true;
    this.docnumReCheck = docnum;

    this.service.onRecheckDeliveryByDocnum(documentNumber).subscribe({
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

