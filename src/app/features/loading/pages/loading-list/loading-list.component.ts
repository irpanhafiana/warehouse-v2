import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { LoadingService } from '../../services/loading.service';

import { HeaderRes, SalesInvoicesModel, Area } from '../../../../core/models';
import { getDefaultDateFilter, formatToApiDateString } from '../../../../core/utils/date.util';

import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { ButtonHomeComponent } from '../../../../shared/components/button-home/button-home.component';
import { CardComponent } from '../../../../shared/components/card/card.component';

export interface GroupedCustomer {
  customerName: string;
  customerCode: string;
  data: HeaderRes[];
  total?: number;
}

@Component({
  selector: 'app-loading-list',
  imports: [
    CommonModule,
    FormsModule,
    LoaderComponent,
    NavbarComponent,
    ButtonHomeComponent,
    CardComponent,
  ],
  templateUrl: './loading-list.component.html',
  styleUrl: './loading-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingListComponent implements OnInit {
  private service = inject(SalesInvoiceService);
  private loadingService = inject(LoadingService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  readonly cdr = inject(ChangeDetectorRef);

  readonly headerRes = signal<HeaderRes[]>([]);
  readonly filteredSalesInvoices = signal<HeaderRes[]>([]);
  readonly groupResult = signal<GroupedCustomer[]>([]);
  readonly loading = signal(true);
  readonly isDialogDetailDocnum = signal(false);

  readonly date = signal('');
  readonly dateString = signal('');
  readonly area = signal<Area[]>([]);
  readonly detailDocnumCustomer = signal<SalesInvoicesModel[]>([]);
  readonly selectedAlphabet = signal('');
  readonly areaSelected = signal('');
  readonly alphabet = signal<string[]>([]);

  ngOnInit(): void {
    const filter = getDefaultDateFilter(3);
    this.date.set(filter.date);
    this.dateString.set(filter.dateString);

    if (this.dateString()) {
      this.getLoadingList();
    }
  }

  getLoadingList(): void {
    this.loading.set(true);
    this.cdr.markForCheck();
    this.service
      .getLoadingList(this.dateString())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: HeaderRes[]) => {
          this.loading.set(false);
          const list = data || [];
          this.headerRes.set(list);
          this.filteredSalesInvoices.set([...list]);
          this.createArrArea(list);
          this.createArrAlphabet(list);
          this.groupCustomerData(this.filteredSalesInvoices());
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.date.set(input.value);
    this.dateString.set(formatToApiDateString(input.value));
    if (this.dateString()) {
      this.getLoadingList();
    }
  }

  onOptionSelect(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this.areaSelected.set(select.value);
    this.selectedAlphabet.set('');
    this.applyFilter();
  }

  onSelectedAlphabet(char: string): void {
    this.selectedAlphabet.set(char === '~' ? '' : char);
    this.applyFilter();
  }

  applyFilter(): void {
    const alpha = this.selectedAlphabet();
    const areaVal = this.areaSelected();
    const source = this.headerRes();

    let filtered = source.filter((invoice: HeaderRes) => {
      const matchesAlphabet = alpha
        ? (invoice.Name || '')
            .replace(/^~+/, '')
            .trim()
            .toLowerCase()
            .startsWith(alpha.toLowerCase())
        : true;

      const matchesDropdown = areaVal
        ? (invoice.Area || '').includes(areaVal)
        : true;

      return matchesAlphabet && matchesDropdown;
    });

    if (filtered.length === 0 && !alpha && !areaVal) {
      filtered = [...source];
    }

    this.filteredSalesInvoices.set(filtered);
    this.groupCustomerData(filtered);
    this.cdr.markForCheck();
  }

  groupCustomerData(salesInvoices: HeaderRes[]): void {
    const result: GroupedCustomer[] = [];

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

    this.groupResult.set(result);

    if (result.length > 0) {
      this.getCountCustomer(this.dateString());
    }
    this.cdr.markForCheck();
  }

  getCountCustomer(dateString: string): void {
    this.service
      .getCountCustomer(dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: { Code: string; Count: number }[]) => {
          this.groupResult.update((current) => {
            const updated = current.map((item) => ({ ...item }));
            (data || []).forEach((response) => {
              const matchingGroup = updated.find(
                (element) => element.customerCode === response.Code
              );
              if (matchingGroup) {
                matchingGroup.total = response.Count;
              }
            });
            return updated;
          });
          this.cdr.markForCheck();
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
  }

  createArrArea(data: HeaderRes[]): void {
    if (data) {
      const uniqueAreas = Array.from(new Set(data.map((inv) => inv.Area).filter(Boolean)));
      this.area.set(
        uniqueAreas.map((areaStr) => ({
          Code: areaStr,
          isFromInternalMessage: false,
          Description: '',
          Alias: null,
          Id: 0,
          Remarks: null,
        }))
      );
    } else {
      this.area.set([]);
    }
    this.cdr.markForCheck();
  }

  createArrAlphabet(data: HeaderRes[]): void {
    const initials = Array.from(
      new Set(
        data
          .map((customer) => {
            const customerName = (customer.Name || '').trim();
            if (!customerName) return '';
            const firstValidChar = customerName.startsWith('~')
              ? customerName.charAt(1)
              : customerName.charAt(0);
            return firstValidChar.toUpperCase();
          })
          .filter(Boolean)
      )
    );
    this.alphabet.set(initials.sort((a, b) => a.localeCompare(b)));
    this.cdr.markForCheck();
  }

  openDialogDetailDocnum(customerCode: string, docnum: string): void {
    void this.router.navigate([
      `/main/loading/checklist/${customerCode}/${this.dateString()}/${docnum}`,
    ]);
  }

  toChecklist(docnum: string): void {
    this.loadingService.setDocnumSubject(docnum);
    void this.router.navigate(['/main/loading/checklist', docnum]);
  }

  onCloseDialogDetailDocnum(): void {
    this.isDialogDetailDocnum.set(false);
    this.cdr.markForCheck();
  }
}
