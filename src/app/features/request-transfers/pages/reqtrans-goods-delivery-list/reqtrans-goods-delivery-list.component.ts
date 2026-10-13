import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GoodsDeliveryService } from '../../../../core/services/goods-delivery.service';
import {
  ButtonHomeComponent,
  LoaderComponent,
  NavbarReqtransComponent,
} from '../../../../shared/components';

@Component({
  selector: 'app-reqtrans-goods-delivery-list',
  imports: [
    CommonModule,
    FormsModule,
    LoaderComponent,
    NavbarReqtransComponent,
    ButtonHomeComponent,
  ],
  templateUrl: './reqtrans-goods-delivery-list.component.html',
})
export class ReqtransGoodsDeliveryListComponent implements OnInit {
  private service = inject(GoodsDeliveryService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  dateString: string = '';
  date: string = '';
  goodsDeliveries: any[] = [];
  loading: boolean = false;
  statusSelected: 'ONGOING' | 'HISTORY' = 'ONGOING';

  ngOnInit(): void {
    const savedDate = localStorage.getItem('reqtrans_date');
    if (savedDate) {
      this.date = savedDate;
      this.dateString = savedDate.replace(/-/g, '');
    } else {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      this.date = `${year}-${month}-${day}`;
      this.dateString = `${year}${month}${day}`;
    }

    const savedStatus = localStorage.getItem('reqtrans_status') as 'ONGOING' | 'HISTORY';
    this.statusSelected = savedStatus || 'ONGOING';

    if (this.dateString) {
      this.getGoodsDeliveries(this.dateString, this.statusSelected);
    }
  }

  getGoodsDeliveries(date: string, status: 'ONGOING' | 'HISTORY'): void {
    this.loading = true;
    this.cdr.markForCheck();

    const request$ =
      status === 'ONGOING'
        ? this.service.getGoodsDeliveryListTrans(date)
        : this.service.getReqTransHistoryList(date);

    request$.subscribe({
      next: (data) => {
        this.loading = false;
        this.goodsDeliveries = data || [];
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error('Get goods delivery list trans error:', e);
        this.loading = false;
        this.goodsDeliveries = [];
        this.cdr.markForCheck();
      },
    });
  }

  toDetail(date: string, transportUnit: string): void {
    void this.router.navigate([
      '/main-reqtrans/goods-delivery/detail',
      date,
      transportUnit,
      this.statusSelected,
    ]);
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.value) {
      this.date = input.value;
      this.dateString = input.value.replace(/-/g, '');
      localStorage.setItem('reqtrans_date', input.value);
      this.getGoodsDeliveries(this.dateString, this.statusSelected);
    }
  }

  onSelectedType(e: Event): void {
    const target = e.target as HTMLSelectElement;
    this.statusSelected = target.value as 'ONGOING' | 'HISTORY';
    localStorage.setItem('reqtrans_status', this.statusSelected);
    this.getGoodsDeliveries(this.dateString, this.statusSelected);
  }
}

