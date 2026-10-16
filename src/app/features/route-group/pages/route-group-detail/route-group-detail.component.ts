import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { RouteGroupService } from '../../services';
import { LoadingService } from '../../../loading/services';
import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { AuthService } from '../../../../core/services/auth.service';
import { RouteGroup, HeaderRes, Area, Driver, Vehicle } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { DialogConfirmComponent } from '../../../../shared/components/dialog-confirm/dialog-confirm.component';

@Component({
  selector: 'app-route-group-detail',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoaderComponent,
    DialogConfirmComponent,
    DatePipe,
  ],
  templateUrl: './route-group-detail.component.html',
  styleUrl: './route-group-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteGroupDetailComponent implements OnInit {
  private routeGroupService = inject(RouteGroupService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  private service = inject(SalesInvoiceService);
  private toastr = inject(ToastrService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
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
  isDialogConfirmFinishManual = false;
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
    const currentDate = new Date();
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 3);
    const year = previousDate.getFullYear();
    const month = String(previousDate.getMonth() + 1).padStart(2, '0');
    const day = String(previousDate.getDate()).padStart(2, '0');
    this.date = `${year}-${month}-${day}`;
    this.dateString = `${year}${month}${day}`;

    if (this.dateString && this.alias) {
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
    this.cdr.markForCheck();
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
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.toastr.error('Gagal mengambil data detail rute.', 'Error');
          this.cdr.markForCheck();
        },
        complete: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
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
    this.cdr.markForCheck();
  }

  resetFilter(): void {
    this.selectedLetter = null;
    this.selectedAplhabet = '';
    this.filteredDetails = this.dataDetails;
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
    this.loadingService
      .getLoadingAllList(this.dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.isLoading = false;
          this.headerRes = data || [];
          this.filteredSalesInvoices = this.headerRes;
          this.createArrArea(this.headerRes);
          this.createArrAlphabet(this.headerRes);
          this.groupCustomerData(this.filteredSalesInvoices);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
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
          this.cdr.markForCheck();
        },
        error: () => {
          this.cdr.markForCheck();
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
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
  }

  isSelected(item: HeaderRes): boolean {
    return this.selectedItem.some(
      (selected) => selected.DocNum === item.DocNum
    );
  }

  onSubmit(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.cdr.markForCheck();
    const payload = {
      RouteName: this.data.RouteName,
      Alias: this.alias,
      Id: this.data.Id,
      Details: this.dataDetails,
      Remarks: '',
    };

    this.routeGroupService
      .changeOrderBON(payload as any)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.selectedItem = [];
          this.isUrutkan = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.toastr.error('Gagal memperbarui urutan BON.', 'Error');
          this.cdr.markForCheck();
        },
        complete: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
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
    };

    if (this.selectedVehicleNo && this.selectedVehicleName) {
      this.isLoading = true;
      this.cdr.markForCheck();
      this.routeGroupService
        .postFinishRouteGroup(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => { },
          error: () => {
            this.isLoading = false;
            this.toastr.error('Gagal memproses muatan mobil siap jalan.', 'Error');
            this.cdr.markForCheck();
          },
          complete: () => {
            this.isLoading = false;
            this.toastr.success(
              'Jalur muat telah selesai dimuat ke dalam mobil',
              'Success'
            );
            this.cdr.markForCheck();
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
    this.cdr.markForCheck();

    const payload = {
      TransportUnit: this.selectedVehicleNo,
      TransportDescription: this.selectedVehicleName,
      Driver: this.selectedDriverName,
      Details: this.dataBONSelesai,
    };

    if (this.selectedVehicleNo && this.selectedVehicleName) {
      this.routeGroupService
        .postFinishRouteGroup(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isDisabledButton = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.isDisabledButton = false;
            this.toastr.error('Gagal merekap BON sebagian.', 'Error');
            this.cdr.markForCheck();
          },
          complete: () => {
            this.isDisabledButton = false;
            this.fetchRouteGroupDetail(this.alias);
            this.getLoadingList();
            this.closeDialogRekap();
            this.toastr.success('BON yang ditandai berhasil direkap!', 'Success');
            this.cdr.markForCheck();
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
    this.cdr.markForCheck();
    const payload = {
      TransportUnit: this.selectedVehicleNo,
      TransportDescription: this.selectedVehicleName,
      Driver: this.selectedDriverName,
      Details: this.dataBONSelesai,
    };

    this.routeGroupService
      .postFinishRouteGroup(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDisabledButton = false;
          this.closeDialogRekap();
          this.selectedItem = [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.isDisabledButton = false;
          this.toastr.error('Gagal menyelesaikan rute.', 'Error');
          this.cdr.markForCheck();
        },
        complete: () => {
          this.isDisabledButton = false;
          this.cdr.markForCheck();
          this.onBack();
          this.onMobilSiapJalan();
        },
      });
  }

  onRouteFinishManual(alias: string): void {
    this.isDisabledButton = true;
    this.cdr.markForCheck();
    const payload = {
      Alias: alias,
    };

    this.routeGroupService
      .putFinishRouteGroup(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDisabledButton = false;
          this.isDialogConfirmFinishManual = false;
          this.selectedItem = [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.isDisabledButton = false;
          this.isDialogConfirmFinishManual = false;
          this.toastr.error('Gagal menyelesaikan rute secara manual.', 'Error');
          this.cdr.markForCheck();
        },
        complete: () => {
          this.isDisabledButton = false;
          this.isDialogConfirmFinishManual = false;
          this.cdr.markForCheck();
          this.toastr.success('Jalur muat berhasil diselesaikan!', 'Success');
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
    this.cdr.markForCheck();
  }

  moveUp(index: number): void {
    this.isCanUpload = true;
    if (index > 0) {
      [this.dataDetails[index], this.dataDetails[index - 1]] = [
        this.dataDetails[index - 1],
        this.dataDetails[index],
      ];
      this.updateLineNumbers();
      this.cdr.markForCheck();
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
      this.cdr.markForCheck();
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
    this.cdr.markForCheck();
  }

  onHapusBON(): void {
    if (this.isLoading) return;
    this.isLoading = true;
    this.cdr.markForCheck();
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
        next: () => { },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.isLoading = false;
          this.isDialogConfirmDelete = false;
          this.cdr.markForCheck();
          this.toastr.success('BON berhasil dihapus!', 'Success');
          this.getLoading();
        },
      });
  }

  onIs4Login(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.authService
      .generateIS4Token()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.isLoading = false;
          localStorage.setItem('is4_token', data.access_token);
          localStorage.setItem('is4_refresh_token', data.refresh_token);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.getVehicles();
          this.getDrivers();
        },
      });
  }

  getVehicles(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.service
      .getVehicles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.isLoading = false;
          this.vehicles = data?.data || data || [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  getDrivers(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.service
      .getDrivers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: any) => {
          this.isLoading = false;
          this.drivers = data?.data || data || [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  onOpenDialog(status: string): void {
    this.dataBONSelesai = [];
    this.isStatusDialog = status;
    this.isDialogConfirm = true;
    this.cdr.markForCheck();
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
    this.cdr.markForCheck();
  }

  onSelectedVehicle(): void {
    if (this.selectedVehicle) {
      this.selectedVehicleNo = this.selectedVehicle.vehicleNo;
      this.selectedVehicleName = this.selectedVehicle.description;
    } else {
      this.selectedVehicleNo = '';
      this.selectedVehicleName = '';
    }
    this.cdr.markForCheck();
  }

  onSelectedDriver(e: any): void {
    this.selectedDriverName = e.target.value;
    this.cdr.markForCheck();
  }

  toAddMarkRecap(item: any): void {
    item.isCanRekap = true;
    this.cdr.markForCheck();
  }

  toCancelMarkRecap(item: any): void {
    const index = this.dataDetails.findIndex((x) => x.Code === item.Code);
    if (index > -1) {
      this.dataDetails[index] = { ...this.dataDetails[index], isCanRekap: false };
      this.cdr.markForCheck();
    }
  }

  onCancelRecap(): void {
    this.dataDetails = this.dataDetails.map((item: any) => ({
      ...item,
      isCanRekap: false,
    }));
    this.isCanRekap = false;
    this.cdr.markForCheck();
  }

  onBack(): void {
    void this.router.navigate(['/main/route-group/list']);
  }

  openFilterAlphabet(): void {
    this.isFilterAlphabet = true;
    this.cdr.markForCheck();
  }

  closeFilterAlphabet(): void {
    this.isFilterAlphabet = false;
    this.selectedAplhabet = '';
    this.cdr.markForCheck();
  }

  closeDialogRekap(): void {
    this.selectedDriverName = '';
    this.selectedVehicleNo = '';
    this.selectedVehicleName = '';
    this.isDialogConfirm = false;
    this.cdr.markForCheck();
  }
}

