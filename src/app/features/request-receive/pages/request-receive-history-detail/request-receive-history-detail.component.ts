import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
})
export class RequestReceiveHistoryDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(RequestReceiveService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  docnum: string = '';
  salesInvoice?: SalesInvoicesModel;
  loading: boolean = false;
  initialData: Detail[] = [];
  filteredData: Detail[] = [];
  selectedAlphabet: string = '';
  alphabet: string[] = [];
  isFilterAlphabet: boolean = false;

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

    this.service.getDetailHistoryRequestReceive(this.docnum).subscribe({
      next: (data) => {
        this.loading = false;
        this.salesInvoice = data;
        this.initialData = (data?.Details || []).map((d) => ({ ...d }));

        const letters = Array.from(
          new Set(
            this.initialData
              .map((product) => {
                const name = product.ProductModel?.Name?.trim();
                if (!name) return '';
                const firstValidChar = name.startsWith('~')
                  ? name.charAt(1)
                  : name.charAt(0);
                return firstValidChar.toUpperCase();
              })
              .filter((char) => Boolean(char))
          )
        );

        this.alphabet = letters.sort((a, b) => a.localeCompare(b));
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

  onSelectedAlphabet(char: string): void {
    if (char === '~') {
      this.selectedAlphabet = '';
    } else {
      this.selectedAlphabet = char;
    }
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredData = this.initialData
      .map((product) => ({
        ...product,
        ProductModel: {
          ...product.ProductModel,
          Name: product?.ProductModel?.Name?.replace(/^~+/, '').trim() || '',
        },
      }))
      .filter((product) => {
        if (!this.selectedAlphabet) return true;
        return (
          product.ProductModel?.Name?.toLowerCase().startsWith(
            this.selectedAlphabet.toLowerCase()
          ) ?? false
        );
      });

    if (this.filteredData.length === 0) {
      this.filteredData = this.initialData;
    }
    this.cdr.markForCheck();
  }

  onBack(): void {
    void this.router.navigate(['/main-reqrec/request-receive/history']);
  }
}

