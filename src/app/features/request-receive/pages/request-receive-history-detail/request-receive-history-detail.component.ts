import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { Detail, SalesInvoicesModel } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components';
import { RequestReceiveService } from '../../services/request-receive.service';

@Component({
  selector: 'app-request-receive-history-detail',
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    LoaderComponent,
  ],
  templateUrl: './request-receive-history-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestReceiveHistoryDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(RequestReceiveService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  docnum: string = '';
  salesInvoice?: SalesInvoicesModel;
  loading: boolean = false;
  initialData: Detail[] = [];
  filteredData: Detail[] = [];

  constructor() {
    this.docnum = this.route.snapshot.params['docnum'] || '';
  }

  ngOnInit(): void {
    if (this.docnum) {
      this.getDetail();
    }
  }

  getDetail(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.service
      .getDetailHistoryRequestReceive(this.docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.loading = false;
          this.salesInvoice = data;
          this.initialData = (data?.Details || []).map((d) => ({ ...d }));

          this.applyFilter();
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Get history detail error:', e);
          this.loading = false;
          this.toastr.error('Gagal memuat detail riwayat', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  applyFilter(): void {
    this.filteredData = this.initialData;
    this.cdr.markForCheck();
  }

  onBack(): void {
    void this.router.navigate(['/main-reqrec/request-receive/history']);
  }
}

