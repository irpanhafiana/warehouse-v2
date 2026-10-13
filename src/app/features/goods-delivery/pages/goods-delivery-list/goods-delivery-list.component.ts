import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { GoodsDeliveryService } from '../../../../core/services/goods-delivery.service';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { ButtonHomeComponent } from '../../../../shared/components/button-home/button-home.component';

@Component({
  selector: 'app-goods-delivery-list',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoaderComponent,
    NavbarComponent,
    ButtonHomeComponent,
  ],
  templateUrl: './goods-delivery-list.component.html',
  styleUrl: './goods-delivery-list.component.css',
})
export class GoodsDeliveryListComponent implements OnInit {
  private service = inject(GoodsDeliveryService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  dateString = '';
  date = '';
  goodsDeliveries: any[] = [];
  loading = false;
  statusSelected = 'ONGOING';

  ngOnInit(): void {
    const currentDate = new Date();
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 3);
    const year = previousDate.getFullYear();
    const month = String(previousDate.getMonth() + 1).padStart(2, '0');
    const day = String(previousDate.getDate()).padStart(2, '0');
    this.date = `${year}-${month}-${day}`;
    this.dateString = `${year}${month}${day}`;

    if (this.dateString) {
      this.getGoodsDeliveries(this.dateString, this.statusSelected);
    }
  }

  getGoodsDeliveries(date: string, statusSelected: string): void {
    this.loading = true;
    const request$ =
      statusSelected === 'ONGOING'
        ? this.service.getGoodsDeliveryList(date)
        : this.service.getGoodsDeliveryHistoryList(date);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.loading = false;
        this.goodsDeliveries = data || [];
      },
      error: () => {
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  toDetail(date: string, transportUnit: string): void {
    void this.router.navigate([
      '/main/goods-delivery/detail',
      date,
      transportUnit,
      this.statusSelected,
    ]);
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.dateString = input.value.replace(/-/g, '');

    if (this.dateString) {
      this.getGoodsDeliveries(this.dateString, this.statusSelected);
    }
  }

  onSelectedType(e: any): void {
    this.statusSelected = e.target.value;
    this.getGoodsDeliveries(this.dateString, this.statusSelected);
  }
}

