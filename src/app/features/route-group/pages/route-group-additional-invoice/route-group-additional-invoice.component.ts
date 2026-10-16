import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
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
        },
        error: () => {
          this.loadingDetail = false;
        },
        complete: () => {
          this.loadingDetail = false;
          this.loading = false;
        },
      });
  }

  fetchRouteGroups(date: string): void {
    this.loading = true;
    this.routeGroupService
      .getAdditionalInvoices(date)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any[]) => {
          if (!Array.isArray(response)) {
            this.loading = false;
            return;
          }

          this.headerRes = response.map((item) => ({
            ...item,
            MarkBeforeRoute: false,
          }));

          this.filteredSalesInvoices = [...this.headerRes];
          this.createArrArea(this.headerRes);
        },
        error: () => {
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
        },
      });
  }

  fetchRouteGroupList(date: string): void {
    this.loading = true;
    this.routeGroupService
      .getRouteGroups(date)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any[]) => {
          this.routeGroups = response || [];
        },
        error: () => {
          this.loading = false;
        },
        complete: () => {
          this.loading = false;
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
  }

  prikitiw(): void {
    this.isDialogAddToRoute = true;
  }

  onSaveToJalurMuat(): void {
    if (this.isLoading) return;
    this.isLoading = true;
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
        },
        complete: () => {
          this.isLoading = false;
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

