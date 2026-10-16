import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { RouteGroupService } from '../../services';
import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { AuthService } from '../../../../core/services/auth.service';
import { RouteGroup, HeaderRes, Area, Driver, Vehicle } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { getDefaultDateFilter, formatToApiDateString } from '../../../../core/utils/date.util';

@Component({
  selector: 'app-route-group-detail-history',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoaderComponent,
    DatePipe,
  ],
  templateUrl: './route-group-detail-history.component.html',
  styleUrl: './route-group-detail-history.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteGroupDetailHistoryComponent implements OnInit {
  private routeGroupService = inject(RouteGroupService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(SalesInvoiceService);
  private toastr = inject(ToastrService);
  private authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  alias = '';
  data!: RouteGroup;
  isDialogOpenBarcode = false;
  filteredSalesInvoices: HeaderRes[] = [];
  headerRes: HeaderRes[] = [];
  isLoading = false;
  dateString = '';
  area: Area[] = [];
  alphabet: string[] = [];
  groupResult: any;
  date = '';
  areaSelected = '';
  selectedAplhabet = '';

  initialLength = 0;
  dataDetails: any[] = [];
  filteredDetails: any[] = [];
  availableLetters: string[] = [];
  selectedLetter: string | null = null;
  isDialogConfirm = false;
  isDialogConfirmDelete = false;
  selectedItem: HeaderRes[] = [];

  isUrutkan = false;
  customerNameDeleted = '';
  idDeleted = '';

  isCanUpload = false;
  vehicles: Vehicle[] = [];
  drivers: Driver[] = [];

  selectedVehicle: any;
  selectedVehicleNo = '';
  selectedVehicleName = '';
  selectedDriverName = '';
  dataBONSelesai: any[] = [];

  isCanRekap = false;
  isStatusDialog = '';
  isDisabledButton = false;
  isAllBonDone = false;
  isFilterAlphabet = false;

  constructor() {
    this.alias = this.route.snapshot.params['alias'];
  }

  ngOnInit(): void {
    const filter = getDefaultDateFilter(3);
    this.date = filter.date;
    this.dateString = filter.dateString;

    if (this.alias) {
      this.fetchRouteGroupDetail(this.alias);
      this.getLoadingList();
    }
  }

  getLoading(): void {
    if (this.alias) {
      this.fetchRouteGroupDetail(this.alias);
      this.getLoadingList();
    }
  }

  fetchRouteGroupDetail(alias: string): void {
    this.isLoading = true;
    this.routeGroupService
      .getRouteGroupDetail(alias)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          this.data = response;
          this.dataDetails = (response?.Details || []).map((item: any) => ({
            ...item,
            isCanRekap: false,
          }));

          this.filteredDetails = this.dataDetails;
          this.generateAvailableLetters();

          this.isAllBonDone =
            this.dataDetails.length > 0 &&
            this.dataDetails.every(
              (item) => item.IsFinishLoad && item.IsDelivered
            );

          this.initialLength = this.data?.Details?.length || 0;
        },
        error: () => {
          this.isLoading = false;
          this.toastr.error('Gagal mengambil data detail rute riwayat.', 'Error');
        },
        complete: () => {
          this.isLoading = false;
        },
      });
  }

  generateAvailableLetters(): void {
    const firstLetters = this.dataDetails.map((item) =>
      item.Name?.trim().charAt(0).toUpperCase()
    );
    this.availableLetters = Array.from(new Set(firstLetters.filter(Boolean))).sort();
  }

  filterByLetter(letter: string): void {
    this.selectedAplhabet = letter;
    this.selectedLetter = letter;
    this.filteredDetails = this.dataDetails.filter((item) =>
      item.Name?.trim().toUpperCase().startsWith(letter)
    );
  }

  resetFilter(): void {
    this.selectedLetter = null;
    this.selectedAplhabet = '';
    this.filteredDetails = this.dataDetails;
  }

  toDetail(customerCode: string, docDate: string, docNum: string): void {
    const date = new Date(docDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}${month}${day}`;

    void this.router.navigate([
      `/main/loading/checklist/${customerCode}/${dateString}/${docNum}`,
    ]);
  }

  getLoadingList(): void {
    this.isLoading = true;
    this.service
      .getLoadingList(this.dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.isLoading = false;
          this.headerRes = data || [];
          this.filteredSalesInvoices = this.headerRes;
          this.createArrArea(this.headerRes);
          this.createArrAlphabet(this.headerRes);
          this.groupCustomerData(this.filteredSalesInvoices);
        },
        error: () => {
          this.isLoading = false;
        },
      });
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
          .filter(Boolean)
      )
    );

    this.alphabet = datas.sort((a, b) => a.localeCompare(b));
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

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.dateString = formatToApiDateString(input.value);

    if (this.dateString) {
      this.getLoadingList();
    }
  }

  onOptionSelect(e: any): void {
    this.areaSelected = e.target.value;
    this.selectedAplhabet = '';
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

  onSelectedAlphabet(i: string): void {
    if (i === '~') {
      this.selectedAplhabet = '';
    } else {
      this.selectedAplhabet = i;
    }
    this.applyFilter();
  }

  isSelectedItem(item: HeaderRes): boolean {
    return this.selectedItem.some(
      (selected) => selected.DocNum === item.DocNum
    );
  }

  onSelectedHeaderRes(headerRes: HeaderRes): void {
    const index = this.selectedItem.findIndex(
      (item) => item.DocNum === headerRes.DocNum
    );

    if (index === -1) {
      (headerRes as any).newlyAdded = true;
      this.dataDetails.push(headerRes);
      this.selectedItem.push(headerRes);
    } else {
      this.selectedItem.splice(index, 1);
      const detailIndex = this.dataDetails.findIndex(
        (item) => item.DocNum === headerRes.DocNum
      );
      if (detailIndex !== -1) {
        this.dataDetails.splice(detailIndex, 1);
      }
    }
  }

  isSelected(item: HeaderRes): boolean {
    return this.selectedItem.some(
      (selected) => selected.DocNum === item.DocNum
    );
  }

  onSubmit(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    const payload = {
      RouteName: this.data.RouteName,
      Alias: this.alias,
      Id: this.data.Id,
      Details: this.dataDetails,
      Remarks: '',
    };

    this.routeGroupService
      .putRouteGroup(payload as any)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.selectedItem = [];
          this.isUrutkan = false;
        },
        error: () => {
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
          if (this.alias) {
            this.fetchRouteGroupDetail(this.alias);
            this.getLoadingList();
          } else {
            this.onBack();
          }
          this.toastr.success('Jalur muat berhasil diperbarui!', 'Success');
        },
      });
  }

  onMobilSiapJalan(): void {
    if (this.isLoading) return;
    if (this.dataBONSelesai.length === 0) {
      this.toastr.success(
        'Jalur muat telah selesai dimuat ke dalam mobil',
        'Success'
      );
      return;
    }

    const payload = {
      TransportUnit: this.selectedVehicleNo,
      TransportDescription: this.selectedVehicleName,
      Driver: this.selectedDriverName,
      Details: this.dataBONSelesai,
      Remarks: this.data?.RouteName || '',
    };

    if (this.selectedVehicleNo && this.selectedVehicleName) {
      this.isLoading = true;
      this.routeGroupService
        .postFinishRouteGroup(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {},
          error: () => {
            this.isLoading = false;
          },
          complete: () => {
            this.isLoading = false;
            this.toastr.success(
              'Jalur muat telah selesai dimuat ke dalam mobil',
              'Success'
            );
          },
        });
    } else {
      this.toastr.error(
        'Silakan pilih mobil dan supir terlebih dahulu!',
        'Error'
      );
    }
  }

  onRekapSebagian(): void {
    this.isDisabledButton = true;

    const payload = {
      TransportUnit: this.selectedVehicleNo,
      TransportDescription: this.selectedVehicleName,
      Driver: this.selectedDriverName,
      Details: this.dataBONSelesai,
      Remarks: this.data?.RouteName || '',
    };

    if (this.selectedVehicleNo && this.selectedVehicleName) {
      this.routeGroupService
        .postFinishRouteGroup(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isDisabledButton = false;
          },
          error: () => {
            this.isDisabledButton = false;
          },
          complete: () => {
            this.isDisabledButton = false;
            this.fetchRouteGroupDetail(this.alias);
            this.getLoadingList();
            this.closeDialogRekap();
            this.toastr.success('BON yang ditandai berhasil direkap!', 'Success');
          },
        });
    } else {
      this.toastr.error(
        'Silakan pilih mobil dan supir terlebih dahulu!',
        'Error'
      );
    }
  }

  onRouteFinish(alias: string): void {
    this.isDisabledButton = true;
    const payload = {
      TransportUnit: this.selectedVehicleNo,
      TransportDescription: this.selectedVehicleName,
      Driver: this.selectedDriverName,
      Details: this.dataBONSelesai,
      Remarks: this.data?.RouteName || '',
    };

    this.routeGroupService
      .postFinishRouteGroup(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDisabledButton = false;
          this.closeDialogRekap();
          this.selectedItem = [];
        },
        error: () => {
          this.isDisabledButton = false;
        },
        complete: () => {
          this.isDisabledButton = false;
          this.onBack();
          this.onMobilSiapJalan();
        },
      });
  }

  onRouteFinishManual(alias: string): void {
    this.isDisabledButton = true;
    const payload = {
      Alias: alias,
    };

    this.routeGroupService
      .putFinishRouteGroup(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDisabledButton = false;
          this.selectedItem = [];
        },
        error: () => {
          this.isDisabledButton = false;
        },
        complete: () => {
          this.isDisabledButton = false;
          this.onBack();
        },
      });
  }

  onUrutanChange(urutan: boolean): void {
    if (urutan) {
      this.isUrutkan = false;
    } else {
      this.onSubmit();
      this.isUrutkan = true;
    }
  }

  moveUp(index: number): void {
    this.isCanUpload = true;
    if (index > 0) {
      [this.dataDetails[index], this.dataDetails[index - 1]] = [
        this.dataDetails[index - 1],
        this.dataDetails[index],
      ];
      this.updateLineNumbers();
    }
  }

  moveDown(index: number): void {
    this.isCanUpload = true;
    if (index < this.dataDetails.length - 1) {
      [this.dataDetails[index], this.dataDetails[index + 1]] = [
        this.dataDetails[index + 1],
        this.dataDetails[index],
      ];
      this.updateLineNumbers();
    }
  }

  updateLineNumbers(): void {
    this.dataDetails.forEach((item, index) => {
      item.LineNo = index + 1;
    });
  }

  toHapusDariJalur(id: string, customerName: string): void {
    this.isDialogConfirmDelete = true;
    this.customerNameDeleted = customerName;
    this.idDeleted = id;
  }

  onHapusBON(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    const dataAfterDeleted = this.dataDetails.filter(
      (item) => item.Id !== this.idDeleted
    );

    const payload = {
      RouteName: this.data.RouteName,
      Alias: this.alias,
      Id: this.data.Id,
      Details: dataAfterDeleted,
      Remarks: '',
    };

    this.routeGroupService
      .deleteRouteGroup(payload as any)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {},
        error: () => {
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
          this.isDialogConfirmDelete = false;
          this.toastr.success('BON berhasil dihapus!', 'Success');
          this.getLoading();
        },
      });
  }

  onIs4Login(): void {
    this.isLoading = true;
    this.authService
      .generateIS4Token()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.isLoading = false;
          localStorage.setItem('is4_token', data.access_token);
          localStorage.setItem('is4_refresh_token', data.refresh_token);
        },
        error: () => {
          this.isLoading = false;
        },
        complete: () => {
          this.getVehicles();
          this.getDrivers();
        },
      });
  }

  getVehicles(): void {
    this.isLoading = true;
    this.service
      .getVehicles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.isLoading = false;
          this.vehicles = data?.data || data || [];
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  getDrivers(): void {
    this.isLoading = true;
    this.service
      .getDrivers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.isLoading = false;
          this.drivers = data?.data || data || [];
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  onOpenDialog(status: string): void {
    this.dataBONSelesai = [];
    this.isStatusDialog = status;
    this.isDialogConfirm = true;
    this.onIs4Login();

    if (status === 'ALL') {
      this.dataDetails
        .filter((item) => item.IsFinishLoad && !item.IsDelivered)
        .forEach((element) => {
          this.dataBONSelesai.push({ Data: element.DocNum });
        });
    } else if (status === 'HALF') {
      this.dataDetails
        .filter(
          (item) => item.IsFinishLoad && item.isCanRekap && !item.IsDelivered
        )
        .forEach((element) => {
          this.dataBONSelesai.push({ Data: element.DocNum });
        });
    }
  }

  onSelectedVehicle(): void {
    if (this.selectedVehicle) {
      this.selectedVehicleNo = this.selectedVehicle.vehicleNo;
      this.selectedVehicleName = this.selectedVehicle.description;
    } else {
      this.selectedVehicleNo = '';
      this.selectedVehicleName = '';
    }
  }

  onSelectedDriver(e: any): void {
    this.selectedDriverName = e.target.value;
  }

  toAddMarkRecap(item: any): void {
    item.isCanRekap = true;
  }

  toCancelMarkRecap(item: any): void {
    const index = this.dataDetails.findIndex((x) => x.Code === item.Code);
    if (index > -1) {
      this.dataDetails[index] = { ...this.dataDetails[index], isCanRekap: false };
    }
  }

  onCancelRecap(): void {
    this.dataDetails = this.dataDetails.map((item: any) => ({
      ...item,
      isCanRekap: false,
    }));
    this.isCanRekap = false;
  }

  onBack(): void {
    void this.router.navigate(['/main/route-group/list']);
  }

  openFilterAlphabet(): void {
    this.isFilterAlphabet = true;
  }

  closeFilterAlphabet(): void {
    this.isFilterAlphabet = false;
    this.selectedAplhabet = '';
  }

  closeDialogRekap(): void {
    this.selectedDriverName = '';
    this.selectedVehicleNo = '';
    this.selectedVehicleName = '';
    this.isDialogConfirm = false;
  }
}

