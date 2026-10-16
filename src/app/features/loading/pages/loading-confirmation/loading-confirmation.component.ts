import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';

import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { StorageService } from '../../../../core/services/storage.service';

@Component({
  selector: 'app-loading-confirmation',
  imports: [CommonModule],
  templateUrl: './loading-confirmation.component.html',
  styleUrl: './loading-confirmation.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingConfirmationComponent implements OnInit {
  private router = inject(Router);
  private service = inject(SalesInvoiceService);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);
  private storageService = inject(StorageService);
  private destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  payload: any = {
    PIC: [],
    DetailId: [],
    DocNum: '',
  };
  docnum = '';
  loading = false;

  async ngOnInit(): Promise<void> {
    this.docnum = this.route.snapshot.params['docnum'] || '';
    const pickingPic = await this.storageService.get('selectedPic');
    const savedDocNum = await this.storageService.get('docnum');
    const pickingList = await this.storageService.get('pickingList');

    this.payload = {
      PIC: pickingPic ? [pickingPic] : [],
      DetailId: pickingList ? JSON.parse(pickingList) : [],
      DocNum: savedDocNum || this.docnum,
    };
    this.cdr.markForCheck();
  }

  async onCheckUlang(): Promise<void> {
    await this.storageService.remove('pickingList');
    await this.storageService.remove('pickingJson');
    void this.router.navigate(['/main/loading/checklist', this.docnum]);
  }

  onSubmit(): void {
    if (this.loading) return;
    this.loading = true;
    this.cdr.markForCheck();
    this.service
      .putLoadingListDetails(this.payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: async () => {
          this.loading = false;
          this.cdr.markForCheck();
          await this.removeItem();
          void this.router
            .navigate(['/main/loading/checklist', this.docnum])
            .then(() => {
              this.toastr.success('Berhasil!. Loading telah selesai dikerjakan!', 'Success');
            });
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  async removeItem(): Promise<void> {
    await this.storageService.remove('pickingJson');
    await this.storageService.remove('pickingList');
    await this.storageService.remove('pickingPic');
    await this.storageService.remove('selectedPic');
    await this.storageService.remove('docnum');
  }
}

