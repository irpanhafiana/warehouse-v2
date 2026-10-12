import { Component, OnInit, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { LoadingService } from '../../services/loading.service';

import { HeaderRes, SalesInvoicesModel, Area } from '../../../../core/models';

import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { ButtonHomeComponent } from '../../../../shared/components/button-home/button-home.component';
import { CardComponent } from '../../../../shared/components/card/card.component';

interface GroupedCustomer {
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
})
export class LoadingListComponent implements OnInit {
  private service = inject(SalesInvoiceService);
  private loadingService = inject(LoadingService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  headerRes: HeaderRes[] = [];
  filteredSalesInvoices: HeaderRes[] = [];
  groupResult: GroupedCustomer[] = [];
  loading = true;
  isDialogDetailDocnum = false;

  date = '';
  dateString = '';
  area: Area[] = [];
  detailDocnumCustomer: SalesInvoicesModel[] = [];
  selectedAlphabet = '';
  areaSelected = '';
  alphabet: string[] = [];

  ngOnInit(): void {
    const currentDate = new Date();
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 3);
    const year = previousDate.getFullYear();
    const month = String(previousDate.getMonth() + 1).padStart(2, '0');
    const day = String(previousDate.getDate()).padStart(2, '0');
    this.date = `${year}-${month}-${day}`;
    this.dateString = `${year}${month}${day}`;

    if (this.dateString) {
      this.getLoadingList();
    }
  }

  getLoadingList(): void {
    this.loading = true;
    this.service
      .getLoadingList(this.dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: HeaderRes[]) => {
          this.loading = false;
          this.headerRes = data || [];
          this.filteredSalesInvoices = [...this.headerRes];
          this.createArrArea(this.headerRes);
          this.createArrAlphabet(this.headerRes);
          this.groupCustomerData(this.filteredSalesInvoices);
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.dateString = input.value.replace(/-/g, '');
    if (this.dateString) {
      this.getLoadingList();
    }
  }

  onOptionSelect(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this.areaSelected = select.value;
    this.selectedAlphabet = '';
    this.applyFilter();
  }

  onSelectedAlphabet(char: string): void {
    this.selectedAlphabet = char === '~' ? '' : char;
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
      this.filteredSalesInvoices = [...this.headerRes];
    }

    this.groupCustomerData(this.filteredSalesInvoices);
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

    this.groupResult = result;

    if (this.groupResult.length > 0) {
      this.getCountCustomer(this.dateString);
    }
  }

  getCountCustomer(dateString: string): void {
    this.service
      .getCountCustomer(dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: { Code: string; Count: number }[]) => {
          (data || []).forEach((response) => {
            const matchingGroup = this.groupResult.find(
              (element) => element.customerCode === response.Code
            );
            if (matchingGroup) {
              matchingGroup.total = response.Count;
            }
          });
        },
      });
  }

  createArrArea(data: HeaderRes[]): void {
    this.area = [];
    if (data) {
      const uniqueAreas = Array.from(new Set(data.map((inv) => inv.Area).filter(Boolean)));
      this.area = uniqueAreas.map((areaStr) => ({
        Code: areaStr,
        isFromInternalMessage: false,
        Description: '',
        Alias: null,
        Id: 0,
        Remarks: null,
      }));
    }
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
    this.alphabet = initials.sort((a, b) => a.localeCompare(b));
  }

  openDialogDetailDocnum(customerCode: string, docnum: string): void {
    void this.router.navigate([
      `/main/loading/checklist/${customerCode}/${this.dateString}/${docnum}`,
    ]);
  }

  toChecklist(docnum: string): void {
    this.loadingService.setDocnumSubject(docnum);
    void this.router.navigate(['/main/loading/checklist', docnum]);
  }

  onCloseDialogDetailDocnum(): void {
    this.isDialogDetailDocnum = false;
  }
}

