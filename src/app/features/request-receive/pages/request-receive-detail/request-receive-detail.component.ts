import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Inventory } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components';
import { RequestReceiveService } from '../../services/request-receive.service';

@Component({
  selector: 'app-request-receive-detail',
  imports: [CommonModule, LoaderComponent],
  templateUrl: './request-receive-detail.component.html',
})
export class RequestReceiveDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(RequestReceiveService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  docnum: string = '';
  inventoryRequest?: Inventory;
  isConfirmDialogOpen: boolean = false;
  loading: boolean = false;
  loadingSubmitted: boolean = false;

  constructor() {
    this.docnum = this.route.snapshot.params['docnum'] || '';
  }

  ngOnInit(): void {
    if (this.docnum) {
      this.fetchDetailInventoryRequest(this.docnum);
    }
  }

  fetchDetailInventoryRequest(docnum: string): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.service.getRequestReceiveDocnum(docnum).subscribe({
      next: (data) => {
        this.loading = false;
        this.inventoryRequest = data;
        if (this.inventoryRequest && this.inventoryRequest.Details) {
          this.inventoryRequest.Details = this.inventoryRequest.Details.map((item) => ({
            ...item,
            Quantity: item.OpenQuantity,
          }));
        }
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error('Fetch detail inventory request error:', e);
        this.loading = false;
        this.toastr.error('Gagal memuat detail permintaan', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  onSubmit(): void {
    if (!this.inventoryRequest || this.loadingSubmitted) {
      return;
    }

    this.loadingSubmitted = true;
    this.cdr.markForCheck();

    this.service.postReceiveDocnum(this.inventoryRequest).subscribe({
      next: (resDocnum) => {
        this.loadingSubmitted = false;
        const targetDocnum = resDocnum?.trim() || this.docnum;
        this.isConfirmDialogOpen = false;
        this.toRequestReceiveChecklist(targetDocnum);
      },
      error: (e) => {
        console.error('Submit postReceiveDocnum error:', e);
        this.loadingSubmitted = false;
        this.toastr.error('Gagal memproses penerimaan barang', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  toRequestReceiveChecklist(docnum: string): void {
    void this.router.navigate(['/main-reqrec/request-receive/checklist', docnum]);
  }

  onBack(): void {
    void this.router.navigate(['/main-reqrec/request-receive/list']);
  }
}

