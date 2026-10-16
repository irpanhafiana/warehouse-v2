import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Area, HeaderRes, SalesInvoicesModel } from '../../../../core/models';
import { getDefaultDateFilter } from '../../../../core/utils/date.util';
import {
  ButtonHomeComponent,
  CardComponent,
  LoaderComponent,
  NavbarReqtransComponent,
} from '../../../../shared/components';
import { ReqTransLoadingService } from '../../services/reqtrans-loading.service';

export interface GroupedCustomerLoading {
  customerName: string;
  customerCode: string;
  docnum: string;
  data: HeaderRes[];
  total?: number;
}

@Component({
  selector: 'app-reqtrans-loading-list',
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    LoaderComponent,
    NavbarReqtransComponent,
    ButtonHomeComponent,
  ],
  templateUrl: './reqtrans-loading-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReqtransLoadingListComponent implements OnInit {
  private loadingService = inject(ReqTransLoadingService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  headerRes: HeaderRes[] = [];
  filteredSalesInvoices: HeaderRes[] = [];
  groupResult: GroupedCustomerLoading[] = [];
  loading: boolean = true;
  isDialogDetailDocnum: boolean = false;
  date: string = '';
  dateString: string = '';
  area: Area[] = [];
  detailDocnumCustomer: SalesInvoicesModel[] = [];
  areaSelected: string = '';

  constructor() {
    this.setDefaultDate();
  }

  ngOnInit(): void {
    if (this.dateString) {
      this.getLoadingList();
    }
  }

  private setDefaultDate(): void {
    const filter = getDefaultDateFilter(3);
    this.date = filter.date;
    this.dateString = filter.dateString;
  }

  getLoadingList(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.loadingService
      .getLoadingList(this.dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.loading = false;
          this.headerRes = data || [];
          this.filteredSalesInvoices = this.headerRes;
          this.createArrArea(this.headerRes);
          this.groupCustomerData(this.filteredSalesInvoices);
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Get loading list error:', e);
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  createArrArea(data: HeaderRes[]): void {
    const uniqueArea = Array.from(new Set(data.map((inv) => inv.Area)));
    this.area = uniqueArea.map((areaStr) => ({
      Code: areaStr,
      isFromInternalMessage: false,
      Description: '',
      Alias: null,
      Id: 0,
      Remarks: null,
    }));
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.value) {
      this.date = input.value;
      this.dateString = input.value.replace(/-/g, '');
      this.getLoadingList();
    }
  }

  onOptionSelect(e: Event): void {
    const target = e.target as HTMLSelectElement;
    this.areaSelected = target.value;
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredSalesInvoices = this.headerRes.filter((invoice) => {
      const matchesArea = this.areaSelected
        ? invoice.Area.includes(this.areaSelected)
        : true;

      return matchesArea;
    });

    if (this.filteredSalesInvoices.length === 0 && !this.areaSelected) {
      this.filteredSalesInvoices = this.headerRes;
    }

    this.groupCustomerData(this.filteredSalesInvoices);
    this.cdr.markForCheck();
  }

  groupCustomerData(salesInvoices: HeaderRes[]): void {
    const result: GroupedCustomerLoading[] = [];

    salesInvoices.forEach((invoice) => {
      const existingCustomer = result.find(
        (item) => item.customerCode === invoice.Code
      );

      if (existingCustomer) {
        existingCustomer.data.push(invoice);
      } else {
        result.push({
          customerName: invoice.Name,
          customerCode: invoice.Code,
          docnum: invoice.DocNum,
          data: [invoice],
        });
      }
    });

    this.groupResult = result;

    if (this.groupResult.length > 0) {
      this.getCountCustomer(this.dateString);
    }
  }

  getCountCustomer(dateString: string): void {
    this.loadingService
      .getCountCustomer(dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          data?.forEach((response: { Code: string; Count: number }) => {
            const matchingGroup = this.groupResult.find(
              (elem) => elem.customerCode === response.Code
            );
            if (matchingGroup) {
              matchingGroup.total = response.Count;
            }
          });
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get count customer warning:', e);
          this.cdr.markForCheck();
        },
      });
  }

  openDialogDetailDocnum(customerCode: string, docnum: string): void {
    void this.router.navigate([
      `/main-reqtrans/loading/checklist/${customerCode}/${this.dateString}/${docnum}`,
    ]);
  }

  onCloseDialogDetailDocnum(): void {
    this.isDialogDetailDocnum = false;
    this.cdr.markForCheck();
  }
}

