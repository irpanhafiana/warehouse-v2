import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { HeaderRes } from '../../../../core/models';
import { ButtonHomeComponent, LoaderComponent, NavbarReqrecComponent } from '../../../../shared/components';
import { RequestReceiveService } from '../../services/request-receive.service';

@Component({
  selector: 'app-request-receive-list-processed',
  imports: [
    CommonModule,
    ButtonHomeComponent,
    FormsModule,
    LoaderComponent,
    NavbarReqrecComponent,
  ],
  templateUrl: './request-receive-list-processed.component.html',
})
export class RequestReceiveListProcessedComponent implements OnInit {
  private service = inject(RequestReceiveService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  headerRes: HeaderRes[] = [];
  filteredSalesInvoices: HeaderRes[] = [];
  loading: boolean = true;
  date: string = '';
  dateString: string = '';

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
      this.getLoadingList();
    }
  }

  getLoadingList(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.service.getBONProcessedRequestReceive(this.dateString).subscribe({
      next: (data) => {
        this.loading = false;
        this.headerRes = data || [];
        this.filteredSalesInvoices = this.headerRes;
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error('Get BON processed error:', e);
        this.loading = false;
        this.toastr.error('Gagal memuat BON diproses', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.value) {
      this.date = input.value;
      this.dateString = input.value.replace(/-/g, '');
      this.getLoadingList();
    }
  }

  toDetail(docnum: string): void {
    void this.router.navigate(['/main-reqrec/request-receive/checklist', docnum]);
  }
}

