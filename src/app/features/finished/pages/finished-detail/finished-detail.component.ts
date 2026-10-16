import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SalesInvoiceService } from '../../../../core/services';
import { SalesInvoicesModel } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-finished-detail',
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    LoaderComponent,
  ],
  templateUrl: './finished-detail.component.html',
  styleUrl: './finished-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinishedDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(SalesInvoiceService);
  private toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  docnum: string = '';
  salesInvoice?: SalesInvoicesModel;
  loading: boolean = false;

  constructor() {
    this.docnum = this.route.snapshot.params['docnum'] || '';
  }

  ngOnInit(): void {
    if (this.docnum) {
      this.getDetail();
    }
  }

  getDetail() {
    this.loading = true;
    this.cdr.markForCheck();
    this.service
      .getFinishedDetail(this.docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.loading = false;
          this.salesInvoice = data;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.toastr.error('Gagal mengambil detail BON selesai.', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  onBack() {
    this.router.navigate(['/main/finished/list']);
  }
}

