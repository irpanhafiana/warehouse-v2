import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { RouteGroupService } from '../../services';
import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { HeaderRes, Area } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { getDefaultDateFilter, formatToApiDateString } from '../../../../core/utils/date.util';

@Component({
  selector: 'app-route-group-additional-invoice',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoaderComponent, DatePipe],
  templateUrl: './route-group-additional-invoice.component.html',
  styleUrl: './route-group-additional-invoice.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteGroupAdditionalInvoiceComponent implements OnInit {
  private routeGroupService = inject(RouteGroupService);
  private salesInvoiceService = inject(SalesInvoiceService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  loading = true;
  isLoading = false;
  headerRes: HeaderRes[] = [];
  filteredSalesInvoices: HeaderRes[] = [];
  dateString = '';
  date = '';
  area: Area[] = [];
  areaSelected = '';
  groupResult: any;

  routeNameAlias = '';
  routeNameInput = '';
  BONtoRoute: HeaderRes[] = [];
  BONExisting: HeaderRes[] = [];
  isDialogAddToRoute = false;
  routeGroups: any[] = [];

  loadingDetail = false;

  ngOnInit(): void {
    this.setDefaultDate();

    if (this.dateString) {
      this.fetchRouteGroups(this.dateString);
      this.fetchRouteGroupList(this.dateString);
    }
  }

  fetchRouteGroupDetail(alias: string): void {
    this.loadingDetail = true;
    this.cdr.markForCheck();
    this.routeGroupService
      .getRouteGroupDetail(alias)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          this.BONExisting = (response.Details || []).map((item: any) => ({
            ...item,
            MarkBeforeRoute: true,
          }));
          this.routeNameInput = response.RouteName || '';
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingDetail = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.loadingDetail = false;
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  fetchRouteGroups(date: string): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.routeGroupService
      .getAdditionalInvoices(date)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any[]) => {
          if (!Array.isArray(response)) {
            this.loading = false;
            this.cdr.markForCheck();
            return;
          }

          this.headerRes = response.map((item) => ({
            ...item,
            MarkBeforeRoute: false,
          }));

          this.filteredSalesInvoices = [...this.headerRes];
          this.createArrArea(this.headerRes);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  fetchRouteGroupList(date: string): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.routeGroupService
      .getRouteGroups(date)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any[]) => {
          this.routeGroups = response || [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  openDialogDetailDocnum(customerCode: string, docnum: string): void {
    void this.router.navigate([
      `/main/loading/checklist/${customerCode}/${this.dateString}/${docnum}`,
    ]);
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.dateString = formatToApiDateString(input.value);

    if (this.dateString) {
      this.fetchRouteGroups(this.dateString);
    }
  }

  onOptionSelect(e: any): void {
    this.areaSelected = e.target.value;
    this.applyFilter();
  }

  onSelectedJalurMuatan(e: any): void {
    this.routeNameAlias = e.target.value;
    if (this.routeNameAlias) {
      this.fetchRouteGroupDetail(this.routeNameAlias);
    }
  }

  applyFilter(): void {
    this.filteredSalesInvoices = this.headerRes.filter((invoice: HeaderRes) => {
      const matchesDropdown = this.areaSelected
        ? (invoice.Area || '').includes(this.areaSelected)
        : true;

      return matchesDropdown;
    });

    if (this.filteredSalesInvoices.length === 0) {
      this.filteredSalesInvoices = this.headerRes;
    }
    this.cdr.markForCheck();
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

  onBack(): void {
    void this.router.navigate(['/main/route-group/list']);
  }

  onRemarkBeforeAdd(item: any): void {
    item.MarkBeforeRoute = !item.MarkBeforeRoute;
    this.BONtoRoute = this.filteredSalesInvoices.filter(
      (inv: any) => inv.MarkBeforeRoute
    );
    this.cdr.markForCheck();
  }

  prikitiw(): void {
    this.isDialogAddToRoute = true;
    this.cdr.markForCheck();
  }

  onSaveToJalurMuat(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.cdr.markForCheck();
    const dataToAdd = [...this.BONExisting, ...this.BONtoRoute];

    const payload = {
      Alias: this.routeNameAlias,
      Remarks: '',
      Id: 0,
      RouteName: this.routeNameInput,
      Details: dataToAdd as any,
    };

    this.routeGroupService
      .putRouteGroup(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {},
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
          this.toastr.success(
            `BON ditambahkan ke Jalur muat ${this.routeNameInput}`,
            'Success'
          );

          void this.router.navigate([
            '/main/route-group/detail/',
            this.routeNameAlias,
          ]);
        },
      });
  }

  private setDefaultDate(): void {
    const filter = getDefaultDateFilter(3);
    this.date = filter.date;
    this.dateString = filter.dateString;
  }
}

