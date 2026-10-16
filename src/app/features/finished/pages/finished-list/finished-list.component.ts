import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SalesInvoiceService } from '../../../../core/services';
import { HeaderRes, Area, SalesInvoicesModel } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { ButtonHomeComponent } from '../../../../shared/components/button-home/button-home.component';
import { ToastrService } from 'ngx-toastr';

import { getDefaultDateFilter, formatToApiDateString } from '../../../../core/utils';

@Component({
  selector: 'app-finished-list',
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    LoaderComponent,
    CardComponent,
    NavbarComponent,
    ButtonHomeComponent,
  ],
  templateUrl: './finished-list.component.html',
  styleUrl: './finished-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinishedListComponent implements OnInit {
  private service = inject(SalesInvoiceService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private destroyRef = inject(DestroyRef);

  headerRes: HeaderRes[] = [];
  filteredSalesInvoices: HeaderRes[] = [];
  groupResult: any[] = [];
  loading: boolean = true;
  isDialogDetailDocnum: boolean = false;
  date: string = '';
  dateString: string = '';
  area: Area[] = [];

  detailDocnumCustomer: any[] = [];
  selectedAlphabet: string = '';
  areaSelected: string = '';
  alphabet: string[] = [];

  constructor() {
    const defaultDate = getDefaultDateFilter(3);
    this.date = defaultDate.date;
    this.dateString = defaultDate.dateString;
  }

  ngOnInit(): void {
    this.getFinishedList();
  }

  createArrArea(data: HeaderRes[]) {
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

  getFinishedList() {
    this.loading = true;
    this.service
      .getFinishedList(this.dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.loading = false;
          this.headerRes = data || [];
          this.filteredSalesInvoices = this.headerRes;
          this.createArrArea(this.headerRes);
          this.createArrAlphabet(this.headerRes);
          this.groupCustomerData(this.filteredSalesInvoices);
        },
        error: () => {
          this.loading = false;
          this.toastr.error('Gagal mengambil daftar BON selesai.', 'Error');
        },
      });
  }

  onDateChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.value) {
      this.date = input.value;
      this.dateString = formatToApiDateString(input.value);
      this.getFinishedList();
    }
  }

  toChecklist(docnum: string) {
    this.router.navigate(['/main/finished/detail', docnum]);
  }

  onOptionSelect(e: any): void {
    this.areaSelected = e.target.value;
    this.selectedAlphabet = '';
    this.applyFilter();
  }

  getCountCustomer(dateString: string) {
    this.service
      .getCountCustomer(dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: { Code: string; Count: number }[]) => {
          if (!data || !Array.isArray(data)) return;
          data.forEach((response) => {
            const matchingGroup = this.groupResult.find(
              (element: any) => element.customerCode === response.Code
            );

            if (matchingGroup) {
              matchingGroup.total = response.Count;
            }
          });
        },
        error: (e) => {},
      });
  }

  groupCustomerData(salesInvoices: HeaderRes[]) {
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
      this.getCountCustomer(this.dateString);
    }
  }

  onCloseDialogDetailDocnum() {
    this.isDialogDetailDocnum = false;
  }

  openDialogDetailDocnum(data: any[]) {
    this.detailDocnumCustomer = data;
    this.isDialogDetailDocnum = true;
  }

  onSelectedAlphabet(i: string): void {
    if (i === '~') {
      this.selectedAlphabet = '';
    } else {
      this.selectedAlphabet = i;
    }
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredSalesInvoices = this.headerRes.filter((invoice: HeaderRes) => {
      const matchesAlphabet = this.selectedAlphabet
        ? (invoice.Name || '')
            .replace(/^~+/, '')
            .trim()
            .toLowerCase()
            .startsWith(this.selectedAlphabet.toLowerCase())
        : true;

      const matchesDropdown = this.areaSelected
        ? (invoice.Area || '').includes(this.areaSelected)
        : true;

      return matchesAlphabet && matchesDropdown;
    });

    if (this.filteredSalesInvoices.length === 0 && !this.selectedAlphabet && !this.areaSelected) {
      this.filteredSalesInvoices = this.headerRes;
    }

    this.groupCustomerData(this.filteredSalesInvoices);
  }

  createArrAlphabet(data: HeaderRes[]) {
    const datas = Array.from(
      new Set(
        data
          .map((customer: any) => {
            const customerName = (customer.Name || '').trim();
            if (!customerName) return '';
            const firstValidChar = customerName.startsWith('~')
              ? customerName.charAt(1)
              : customerName.charAt(0);
            return firstValidChar.toUpperCase();
          })
          .filter((char) => char)
      )
    );

    this.alphabet = datas.sort((a, b) => a.localeCompare(b));
  }
}

