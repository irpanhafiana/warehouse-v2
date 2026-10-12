import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { ButtonHomeComponent, LoaderComponent, NavbarReqrecComponent } from '../../../../shared/components';
import { RequestReceiveService } from '../../services/request-receive.service';

@Component({
  selector: 'app-request-receive-history',
  imports: [
    LoaderComponent,
    FormsModule,
    CommonModule,
    NavbarReqrecComponent,
    ButtonHomeComponent,
  ],
  templateUrl: './request-receive-history.component.html',
})
export class RequestReceiveHistoryComponent implements OnInit {
  private service = inject(RequestReceiveService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  dateString: string = '';
  date: string = '';
  goodsDeliveries: any[] = [];
  loading: boolean = false;

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
      this.getGoodsDeliveries(this.dateString);
    }
  }

  getGoodsDeliveries(date: string): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.service.getHistoryRequestReceive(date).subscribe({
      next: (data) => {
        this.loading = false;
        this.goodsDeliveries = data || [];
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error('Get history error:', e);
        this.loading = false;
        this.toastr.error('Gagal memuat riwayat penerimaan', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  toDetail(docnum: string): void {
    void this.router.navigate([
      '/main-reqrec/request-receive/detail-history',
      docnum,
    ]);
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.value) {
      this.date = input.value;
      this.dateString = input.value.replace(/-/g, '');
      this.getGoodsDeliveries(this.dateString);
    }
  }
}

