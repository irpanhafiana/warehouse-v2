import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { RouteGroupService } from '../../services';
import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { HeaderRes, Area } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';

@Component({
  selector: 'app-route-group-additional-invoice',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoaderComponent, DatePipe],
  templateUrl: './route-group-additional-invoice.component.html',
  styleUrl: './route-group-additional-invoice.component.css',
})
export class RouteGroupAdditionalInvoiceComponent implements OnInit {
  private routeGroupService = inject(RouteGroupService);
  private salesInvoiceService = inject(SalesInvoiceService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  loading = true;
  headerRes: HeaderRes[] = [];
  filteredSalesInvoices: HeaderRes[] = [];
  dateString = '';
  date = '';
  area: Area[] = [];
  alphabet: string[] = [];
  selectedAplhabet = '';
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
    this.routeGroupService.getRouteGroupDetail(alias).subscribe({
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
    this.routeGroupService.getAdditionalInvoices(date).subscribe({
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
        this.createArrAlphabet(this.headerRes);
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
    this.routeGroupService.getRouteGroups(date).subscribe({
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
    this.dateString = input.value.replace(/-/g, '');

    if (this.dateString) {
      this.fetchRouteGroups(this.dateString);
    }
  }

  onOptionSelect(e: any): void {
    this.areaSelected = e.target.value;
    this.selectedAplhabet = '';
    this.applyFilter();
  }

  onSelectedJalurMuatan(e: any): void {
    this.routeNameAlias = e.target.value;
    if (this.routeNameAlias) {
      this.fetchRouteGroupDetail(this.routeNameAlias);
    }
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
    const dataToAdd = [...this.BONExisting, ...this.BONtoRoute];

    const payload = {
      Alias: this.routeNameAlias,
      Remarks: '',
      Id: 0,
      RouteName: this.routeNameInput,
      Details: dataToAdd as any,
    };

    this.routeGroupService.putRouteGroup(payload).subscribe({
      next: () => {},
      error: () => {},
      complete: () => {
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
    const currentDate = new Date();
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 3);
    const year = previousDate.getFullYear();
    const month = String(previousDate.getMonth() + 1).padStart(2, '0');
    const day = String(previousDate.getDate()).padStart(2, '0');
    this.date = `${year}-${month}-${day}`;
    this.dateString = `${year}${month}${day}`;
  }
}

