import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ToastrService } from 'ngx-toastr';
import { RouteGroupService } from '../../services';
import { RouteGroup } from '../../../../core/models';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ButtonHomeComponent } from '../../../../shared/components/button-home/button-home.component';

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
})
export class RouteGroupListComponent implements OnInit {
  private routeGroupService = inject(RouteGroupService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

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
  }

  fetchRouteGroups(date: string, statusSelected: string): void {
    this.isLoading = true;
    const request$ =
      statusSelected === 'HISTORY'
        ? this.routeGroupService.getRouteGroupHistories(date)
        : this.routeGroupService.getRouteGroups(date);

    request$.subscribe({
      next: (response: any[]) => {
        this.routeGroups = response || [];
        this.filteredSalesInvoices = this.routeGroups;
        this.createArrAlphabet(this.routeGroups);
      },
      error: () => {
        this.isLoading = false;
        this.toastr.error('Gagal mengambil daftar jalur muat.', 'Error');
      },
      complete: () => {
        this.isDone = this.routeGroups.some((item) => item.Remarks === 'done');
        this.isLoading = false;
      },
    });
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.dateString = input.value.replace(/-/g, '');

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
    const currentDate = new Date();
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 3);
    const year = previousDate.getFullYear();
    const month = String(previousDate.getMonth() + 1).padStart(2, '0');
    const day = String(previousDate.getDate()).padStart(2, '0');
    this.date = `${year}-${month}-${day}`;
    this.dateString = `${year}${month}${day}`;
  }

  onSelectedType(): void {
    this.fetchRouteGroups(this.dateString, this.statusSelected);
  }
}

