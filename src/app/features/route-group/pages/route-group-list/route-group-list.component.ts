import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ToastrService } from 'ngx-toastr';
import { RouteGroupService } from '../../services';
import { RouteGroup } from '../../../../core/models';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ButtonHomeComponent } from '../../../../shared/components/button-home/button-home.component';
import { getDefaultDateFilter, formatToApiDateString } from '../../../../core/utils/date.util';

@Component({
  selector: 'app-route-group-list',
  imports: [
    CommonModule,
    FormsModule,
    NavbarComponent,
    LoaderComponent,
    ButtonHomeComponent,
  ],
  templateUrl: './route-group-list.component.html',
  styleUrl: './route-group-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteGroupListComponent implements OnInit {
  private routeGroupService = inject(RouteGroupService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  routeGroups: RouteGroup[] = [];
  filteredSalesInvoices: RouteGroup[] = [];

  dateString = '';
  date = '';

  isLoading = false;
  isShowMenu = false;
  isDone = false;

  statusSelected = 'ONGOING';
  alphabet: string[] = [];
  selectedAplhabet = '';

  ngOnInit(): void {
    this.setDefaultDate();
    this.fetchRouteGroups(this.dateString, this.statusSelected);
  }

  createArrAlphabet(data: any[]): void {
    const datas = Array.from(
      new Set(
        data
          .map((customer: any) => {
            const customerName = customer?.RouteName?.trim() || '';
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

  onSelectedAlphabet(i: string): void {
    if (i === '~') {
      this.selectedAplhabet = '';
    } else {
      this.selectedAplhabet = i;
    }
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredSalesInvoices = this.routeGroups.filter((invoice: any) => {
      const matchesAlphabet = this.selectedAplhabet
        ? (invoice.RouteName || '')
            .replace(/^~+/, '')
            .trim()
            .toLowerCase()
            .startsWith(this.selectedAplhabet.toLowerCase())
        : true;

      return matchesAlphabet;
    });

    if (this.filteredSalesInvoices.length === 0) {
      this.filteredSalesInvoices = this.routeGroups;
    }
    this.cdr.markForCheck();
  }

  fetchRouteGroups(date: string, statusSelected: string): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    const request$ =
      statusSelected === 'HISTORY'
        ? this.routeGroupService.getRouteGroupHistories(date)
        : this.routeGroupService.getRouteGroups(date);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response: any[]) => {
        this.routeGroups = response || [];
        this.filteredSalesInvoices = this.routeGroups;
        this.createArrAlphabet(this.routeGroups);
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Gagal mengambil daftar jalur muat.', 'Error');
        this.cdr.markForCheck();
      },
      complete: () => {
        this.isDone = this.routeGroups.some((item) => item.Remarks === 'done');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.dateString = formatToApiDateString(input.value);

    if (this.dateString) {
      this.fetchRouteGroups(this.dateString, this.statusSelected);
    }
  }

  toAddRouteGroup(): void {
    void this.router.navigate(['/main/route-group/form']);
  }

  toLoadingList(): void {
    void this.router.navigate(['/main/loading/list']);
  }

  toAdditionalInvoice(): void {
    void this.router.navigate(['/main/route-group/additional-invoice']);
  }

  toDetail(alias: string): void {
    void this.router.navigate(['/main/route-group/detail', alias]);
  }

  toDetailHistory(alias: string): void {
    void this.router.navigate(['/main/route-group/history-detail', alias]);
  }

  private setDefaultDate(): void {
    const filter = getDefaultDateFilter(3);
    this.date = filter.date;
    this.dateString = filter.dateString;
  }

  onSelectedType(): void {
    this.fetchRouteGroups(this.dateString, this.statusSelected);
  }
}

