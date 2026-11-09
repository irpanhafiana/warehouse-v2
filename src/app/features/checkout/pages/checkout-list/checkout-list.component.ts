import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { HeaderRes, Area, SalesInvoicesModel } from '../../../../core/models';
import { getDefaultDateFilter, formatToApiDateString } from '../../../../core/utils/date.util';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { ButtonHomeComponent } from '../../../../shared/components/button-home/button-home.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-checkout-list',
  imports: [
    CommonModule,
    LoaderComponent,
    FormsModule,
    ReactiveFormsModule,
    NavbarComponent,
    ButtonHomeComponent,
    CardComponent,
    DatePipe,
  ],
  templateUrl: './checkout-list.component.html',
  styleUrl: './checkout-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutListComponent implements OnInit {
  private service = inject(SalesInvoiceService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private countCache: { date: string; data: { Code: string; Count: number }[] } | null = null;
  private listSub?: Subscription;
  private countSub?: Subscription;

  headerRes: HeaderRes[] = [];
  filteredSalesInvoices: HeaderRes[] = [];
  groupResult: any[] = [];
  loading = true;
  isDialogDetailDocnum = false;
  date = '';
  dateString = '';
  area: Area[] = [];
  detailDocnumCustomer: SalesInvoicesModel[] = [];
  selectedAplhabet = '';
  areaSelected = '';
  alphabet: string[] = [];

  ngOnInit(): void {
    const filter = getDefaultDateFilter(3);
    this.date = filter.date;
    this.dateString = filter.dateString;

    if (this.dateString) {
      this.getCheckoutList();
    }
  }

  createArrArea(data: HeaderRes[]): void {
    this.area = [];
    if (data) {
      const arr = data.map((inv: HeaderRes) => inv.Area);
      const filteredArea = arr.filter(
        (val, i, self) => self.indexOf(val) === i
      );

      this.area = filteredArea.map((areaStr) => ({
        Code: areaStr,
        isFromInternalMessage: false,
        Description: '',
        Alias: null,
        Id: 0,
        Remarks: null,
      }));
    }
  }

  getCheckoutList(): void {
    this.countCache = null;
    this.countSub?.unsubscribe();
    this.listSub?.unsubscribe();
    this.selectedAplhabet = '';
    this.loading = true;
    this.cdr.markForCheck();
    this.listSub = this.service.getCheckoutList(this.dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.loading = false;
          this.headerRes = data || [];
          this.filteredSalesInvoices = this.headerRes;
          this.createArrArea(this.headerRes);
          this.createArrAlphabet(this.headerRes);
          this.groupCustomerData(this.filteredSalesInvoices);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.toastr.error('Gagal mengambil daftar BON checkout.', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.dateString = formatToApiDateString(input.value);
    this.countCache = null;

    if (this.dateString) {
      this.getCheckoutList();
    }
  }

  toChecklist(docnum: string): void {
    void this.router.navigate(['/main/checkout/detail', docnum]);
  }

  onOptionSelect(e: any): void {
    this.areaSelected = e.target.value;
    this.selectedAplhabet = '';
    this.applyFilter();
  }

  private applyCount(data: { Code: string; Count: number }[]): void {
    (data || []).forEach((response) => {
      const matchingGroup = this.groupResult.find(
        (element: any) => element.customerCode === response.Code
      );

      if (matchingGroup) {
        matchingGroup.total = response.Count;
      }
    });
    this.cdr.markForCheck();
  }

  getCountCustomer(dateString: string): void {
    this.countSub?.unsubscribe();
    this.countSub = this.service
      .getCountCustomer(dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: { Code: string; Count: number }[]) => {
          this.countCache = { date: dateString, data: data || [] };
          this.applyCount(this.countCache.data);
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
  }

  groupCustomerData(salesInvoices: HeaderRes[]): void {
    const result: {
      customerName: string;
      customerCode: string;
      data: HeaderRes[];
      total?: number;
    }[] = [];

    salesInvoices.forEach((invoice) => {
      const customerName = invoice.Name;
      const customerCode = invoice.Code;
      const existingCustomer = result.find(
        (item) => item.customerCode === customerCode
      );

      if (existingCustomer) {
        existingCustomer.data.push(invoice);
      } else {
        result.push({ customerName, customerCode, data: [invoice] });
      }
    });

    this.groupResult = result;

    if (this.groupResult.length > 0) {
      if (this.countCache?.date === this.dateString) {
        this.applyCount(this.countCache.data);
      } else {
        this.getCountCustomer(this.dateString);
      }
    }
  }

  onCloseDialogDetailDocnum(): void {
    this.isDialogDetailDocnum = false;
    this.cdr.markForCheck();
  }

  openDialogDetailDocnum(data: SalesInvoicesModel[]): void {
    this.detailDocnumCustomer = data;
    this.isDialogDetailDocnum = true;
    this.cdr.markForCheck();
  }

  onSelectedAlphabet(i: string): void {
    if (i === '~') {
      this.selectedAplhabet = '';
    } else {
      this.selectedAplhabet = i;
    }
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredSalesInvoices = this.headerRes.filter((invoice: HeaderRes) => {
      const matchesAlphabet = this.selectedAplhabet
        ? (invoice.Name || '')
            .replace(/^~+/, '')
            .trim()
            .toLowerCase()
            .startsWith(this.selectedAplhabet.toLowerCase())
        : true;

      const matchesDropdown = this.areaSelected
        ? (invoice.Area || '').includes(this.areaSelected)
        : true;

      return matchesAlphabet && matchesDropdown;
    });

    if (this.filteredSalesInvoices.length === 0) {
      this.filteredSalesInvoices = this.headerRes;
    }

    this.groupCustomerData(this.filteredSalesInvoices);
    this.cdr.markForCheck();
  }

  createArrAlphabet(data: HeaderRes[]): void {
    const datas = Array.from(
      new Set(
        data
          .map((customer: any) => {
            const customerName = customer?.Name?.trim() || '';
            if (!customerName) return '';
            const firstValidChar = customerName.startsWith('~')
              ? customerName.charAt(1)
              : customerName.charAt(0);
            return firstValidChar.toUpperCase();
          })
          .filter(Boolean)
      )
    );

    this.alphabet = datas.sort((a, b) => a.localeCompare(b));
  }
}

