import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { HeaderRes } from '../../../../core/models';
import { getDefaultDateFilter } from '../../../../core/utils';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestReceiveListProcessedComponent implements OnInit {
  private service = inject(RequestReceiveService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  headerRes: HeaderRes[] = [];
  filteredSalesInvoices: HeaderRes[] = [];
  loading: boolean = true;
  date: string = '';
  dateString: string = '';

  ngOnInit(): void {
    const filter = getDefaultDateFilter(3);
    this.date = filter.date;
    this.dateString = filter.dateString;

    if (this.dateString) {
      this.getLoadingList();
    }
  }

  getLoadingList(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.service
      .getBONProcessedRequestReceive(this.dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

