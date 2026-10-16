import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { RouteGroupService } from '../../services';
import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { HeaderRes, Area, RouteGroup } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { getDefaultDateFilter, formatToApiDateString } from '../../../../core/utils/date.util';

@Component({
  selector: 'app-route-group-form',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoaderComponent],
  templateUrl: './route-group-form.component.html',
  styleUrls: ['./route-group-form.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteGroupFormComponent implements OnInit {
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private routeGroupService = inject(RouteGroupService);
  private service = inject(SalesInvoiceService);
  private toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  loadingData: HeaderRes[] = [];
  filteredHeaderRes: HeaderRes[] = [];
  selectedLoadingData: HeaderRes[] = [];

  routeGroup!: RouteGroup;
  routeGroupForm: FormGroup;

  date = '';
  dateString = '';
  selectedAplhabet = '';
  isLoading = false;
  alphabet: string[] = [];

  headerRes: HeaderRes[] = [];
  filteredSalesInvoices: HeaderRes[] = [];
  groupResult: any;
  loading = true;
  isDialogDetailDocnum = false;
  area: Area[] = [];
  areaSelected = '';
  isDialogOpenBarcode = false;

  selectedItem: HeaderRes[] = [];

  constructor() {
    this.routeGroupForm = this.fb.group({
      RouteName: ['', Validators.required],
      Alias: [''],
      Remarks: [''],
      Id: [0],
      Details: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    const filter = getDefaultDateFilter(3);
    this.date = filter.date;
    this.dateString = filter.dateString;

    if (this.dateString) {
      this.getLoadingList();
    }
  }

  get details(): FormArray {
    return this.routeGroupForm.get('Details') as FormArray;
  }

  onSelectedHeaderRes(headerRes: HeaderRes): void {
    const exists = this.details.controls.some(
      (control) => control.value.DocNum === headerRes.DocNum
    );

    const index = this.selectedItem.findIndex(
      (item) => item.DocNum === headerRes.DocNum
    );

    if (index === -1) {
      this.selectedItem.push(headerRes);

      const details = this.fb.group({
        Area: headerRes.Area,
        DocNum: headerRes.DocNum,
        DocDate: headerRes.DocDate,
        Code: headerRes.Code,
        Name: headerRes.Name,
        Details: headerRes.Details,
        Id: headerRes.Id,
        Remarks: headerRes.Remarks,
      });

      if (!exists) {
        this.details.push(details);
      }
    } else {
      this.selectedItem.splice(index, 1);
      const detailIndex = this.details.controls.findIndex(
        (control) => control.value.DocNum === headerRes.DocNum
      );
      if (detailIndex !== -1) {
        this.removeDetail(detailIndex);
      }
    }
  }

  isSelectedItem(item: HeaderRes): boolean {
    return this.selectedItem.some(
      (selected) => selected.DocNum === item.DocNum
    );
  }

  onSubmit(): void {
    if (this.isLoading) return;
    if (this.routeGroupForm.value.Details.length === 0) {
      this.toastr.error('Pilih setidaknya 1 BON untuk membuat jalur muat', 'Error');
      return;
    }

    this.isLoading = true;
    this.routeGroupService
      .postRouteGroup(this.routeGroupForm.value)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.selectedItem = [];
        },
        error: () => {
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
          this.onBack();
          this.toastr.success('Jalur muat berhasil ditambahkan', 'Success');
        },
      });
  }

  onBack(): void {
    void this.router.navigate(['/main/route-group/list']);
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

  getLoadingList(): void {
    this.loading = true;
    this.service
      .getLoadingList(this.dateString)
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
        },
      });
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.dateString = formatToApiDateString(input.value);

    if (this.dateString) {
      this.getLoadingList();
    }
  }

  toChecklist(docnum: string): void {
    void this.router.navigate(['/main/loading/checklist', docnum]);
  }

  onOptionSelect(e: any): void {
    this.areaSelected = e.target.value;
    this.selectedAplhabet = '';
    this.applyFilter();
  }

  getCountCustomer(dateString: string): void {
    this.service
      .getCountCustomer(dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: { Code: string; Count: number }[]) => {
          data.forEach((response) => {
            const matchingGroup = this.groupResult?.find(
              (element: any) => element.customerCode === response.Code
            );

            if (matchingGroup) {
              matchingGroup.total = response.Count;
            }
          });
        },
        error: () => {},
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
      this.getCountCustomer(this.dateString);
    }
  }

  onCloseDialogDetailDocnum(): void {
    this.isDialogDetailDocnum = false;
  }

  openDialogDetailDocnum(docnum: string): void {
    void this.router.navigate([
      `/main/loading/checklist/${docnum}/${this.dateString}`,
    ]);
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
          .filter((char) => Boolean(char))
      )
    );

    this.alphabet = datas.sort((a, b) => a.localeCompare(b));
  }

  moveUp(index: number): void {
    if (index > 0) {
      const formArray = this.details;
      const item = formArray.at(index);
      formArray.removeAt(index);
      formArray.insert(index - 1, item);
    }
  }

  moveDown(index: number): void {
    if (index < this.details.length - 1) {
      const formArray = this.details;
      const item = formArray.at(index);
      formArray.removeAt(index);
      formArray.insert(index + 1, item);
    }
  }

  removeDetail(index: number): void {
    this.details.removeAt(index);
  }
}

