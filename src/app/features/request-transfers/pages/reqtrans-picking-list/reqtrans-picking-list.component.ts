import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { Area, HeaderRes } from '../../../../core/models';
import { getDefaultDateFilter, formatToApiDateString } from '../../../../core/utils/date.util';
import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { SharedDataService } from '../../../../core/services/shared-data.service';
import { SignalrService } from '../../../../core/services/signalr.service';
import { StorageService, STORAGE_KEYS } from '../../../../core/services/storage.service';
import {
  ButtonHomeComponent,
  DialogSetPicComponent,
  LoaderComponent,
  NavbarReqtransComponent,
} from '../../../../shared/components';
import { ReqtransPickingService } from '../../services/reqtrans-picking.service';

@Component({
  selector: 'app-reqtrans-picking-list',
  imports: [
    CommonModule,
    FormsModule,
    LoaderComponent,
    NavbarReqtransComponent,
    ButtonHomeComponent,
    DialogSetPicComponent,
  ],
  templateUrl: './reqtrans-picking-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReqtransPickingListComponent implements OnInit, OnDestroy {
  private service = inject(SalesInvoiceService);
  private pickingService = inject(ReqtransPickingService);
  private sharedDataService = inject(SharedDataService);
  private signalRService = inject(SignalrService);
  private storage = inject(StorageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  headerRes: HeaderRes[] = [];
  bonCheckout: HeaderRes[] = [];
  filteredSalesInvoices: HeaderRes[] = [];
  area: Area[] = [];
  pickingPic: string[] = [];
  alphabet: string[] = [];

  date: string = '';
  dateString: string = '';
  picName: string = '';
  docNumSelected: string = '';
  remarksSelected: string = '';
  areaSelected: string = '';
  selectedAlphabet: string = '';

  loading: boolean = true;
  isActionLoading: boolean = false;
  isDialogBantu: boolean = false;
  isDialogGantiPIC: boolean = false;
  isDialogAmbilBON: boolean = false;

  private notifyCancelDeliveryHandler = (data: string): void => {
    try {
      console.log('SignalR NotifyCancelDelivery:', data);
      this.fetchPickingData();
    } catch (e) {
      console.warn('SignalR NotifyCancelDelivery parse warning:', e);
    }
  };

  constructor() {
    this.setDefaultDate();
    const docnumParam = this.route.snapshot.params['docnum'];
    if (docnumParam) {
      this.isDialogAmbilBON = true;
      this.docNumSelected = docnumParam;
      this.location.replaceState('/main-reqtrans/picking/list');
    }
  }

  ngOnInit(): void {
    this.initPic();
    if (this.dateString) {
      this.fetchPickerData();
      this.fetchPickingData();
    }
    this.signalRService.on('NotifyCancelDelivery', this.notifyCancelDeliveryHandler);

    this.signalRService.reconnected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.dateString) {
          this.fetchPickingData();
        }
      });
  }

  ngOnDestroy(): void {
    this.signalRService.off('NotifyCancelDelivery', this.notifyCancelDeliveryHandler);
  }

  async initPic(): Promise<void> {
    const cachedPic = await this.storage.getItem(STORAGE_KEYS.PHONE_NAME);
    if (cachedPic) {
      this.picName = cachedPic.toUpperCase();
    }
  }

  private setDefaultDate(): void {
    const filter = getDefaultDateFilter(3);
    this.date = filter.date;
    this.dateString = filter.dateString;
  }

  fetchPickingData(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.pickingService
      .getPickingList(this.dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.headerRes = data || [];
          this.filteredSalesInvoices = this.headerRes.filter((item) => !item.IsCheckout);
          this.bonCheckout = this.headerRes.filter((item) => item.IsCheckout);

          this.generateAreaList(this.headerRes);
          this.generateAlphabet(this.headerRes);
          this.applyFilter();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Fetch picking list error:', e);
          this.loading = false;
          this.toastr.error('Gagal memuat daftar picking pengiriman', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  fetchPickerData(): void {
    this.sharedDataService
      .getPicList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pickingPic = data || [];
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get picker data warning:', e);
        },
      });
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.value) {
      this.date = input.value;
      this.dateString = formatToApiDateString(input.value);
      this.fetchPickingData();
    }
  }

  applyFilter(): void {
    this.filteredSalesInvoices = this.headerRes.filter(
      (invoice) =>
        this.matchesAlphabetFilter(invoice) &&
        this.matchesAreaFilter(invoice) &&
        !invoice.IsCheckout
    );

    this.bonCheckout = this.headerRes.filter(
      (invoice) =>
        this.matchesAlphabetFilter(invoice) &&
        this.matchesAreaFilter(invoice) &&
        invoice.IsCheckout
    );

    if (this.filteredSalesInvoices.length === 0 && !this.selectedAlphabet && !this.areaSelected) {
      this.filteredSalesInvoices = this.headerRes.filter((item) => !item.IsCheckout);
    }
    if (this.bonCheckout.length === 0 && !this.selectedAlphabet && !this.areaSelected) {
      this.bonCheckout = this.headerRes.filter((item) => item.IsCheckout);
    }
    this.cdr.markForCheck();
  }

  onSelectedAlphabet(char: string): void {
    this.selectedAlphabet = char === '~' ? '' : char;
    this.areaSelected = '';
    this.applyFilter();
  }

  onOptionSelect(e: any): void {
    this.areaSelected = e.target.value;
    this.selectedAlphabet = '';
    this.applyFilter();
  }

  private matchesAreaFilter(data: HeaderRes): boolean {
    return this.areaSelected ? data.Area.includes(this.areaSelected) : true;
  }

  private matchesAlphabetFilter(invoice: HeaderRes): boolean {
    return this.selectedAlphabet
      ? (invoice.Name || '')
          .replace(/^~+/, '')
          .trim()
          .toLowerCase()
          .startsWith(this.selectedAlphabet.toLowerCase())
      : true;
  }

  private generateAlphabet(data: HeaderRes[]): void {
    const customerInitials = Array.from(
      new Set(
        data
          .map((header) => {
            const trimmedName = (header.Name || '').trim();
            if (!trimmedName) return '';
            return trimmedName.startsWith('~')
              ? trimmedName.charAt(1).toUpperCase()
              : trimmedName.charAt(0).toUpperCase();
          })
          .filter(Boolean)
      )
    );
    this.alphabet = customerInitials.sort((a, b) => a.localeCompare(b));
  }

  private generateAreaList(data: HeaderRes[]): void {
    const uniqueArea = Array.from(new Set(data.map((inv) => inv.Area)));
    this.area = uniqueArea.map((areaStr) => ({
      Code: areaStr,
      isFromInternalMessage: false,
      Description: '',
      Alias: null,
      Id: 0,
      Remarks: null,
    }));
  }

  openDialogAmbilBON(docnum: string): void {
    this.docNumSelected = docnum;
    this.isDialogAmbilBON = true;
  }

  openDialogGantiPIC(docnum: string): void {
    this.docNumSelected = docnum;
    this.isDialogGantiPIC = true;
  }

  openDialogBantu(docnum: string, remarks: string): void {
    this.docNumSelected = docnum;
    this.remarksSelected = remarks;
    this.isDialogBantu = true;
  }

  closeDialogBantu(): void {
    this.isDialogBantu = false;
    this.docNumSelected = '';
    this.remarksSelected = '';
  }

  closeDialogAmbilBON(): void {
    this.isDialogAmbilBON = false;
    this.docNumSelected = '';
    this.location.replaceState('/main-reqtrans/picking/list');
  }

  closeDialogGantiPIC(): void {
    this.isDialogGantiPIC = false;
    this.docNumSelected = '';
  }

  onBantu(): void {
    this.isDialogBantu = false;
    this.toChecklist(this.docNumSelected);
  }

  onPicSelectedForAmbil(pic: string): void {
    this.picName = pic.toUpperCase();
    this.isDialogAmbilBON = false;
    void this.storage.setItem(STORAGE_KEYS.PHONE_NAME, this.picName);
    this.onAmbilBon();
  }

  onPicSelectedForGanti(pic: string): void {
    this.picName = pic.toUpperCase();
    this.isDialogGantiPIC = false;
    void this.storage.setItem(STORAGE_KEYS.PHONE_NAME, this.picName);
    this.onGantiPIC();
  }

  onAmbilBon(): void {
    if (this.isActionLoading) return;
    this.isActionLoading = true;
    const payload = {
      DocNum: this.docNumSelected,
      PIC: this.picName,
    };

    this.pickingService
      .putPickingRemarks(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isActionLoading = false;
          this.toChecklist(this.docNumSelected);
        },
        error: (e) => {
          this.isActionLoading = false;
          console.error('Ambil BON error:', e);
          this.toastr.error('Gagal mengambil BON picking', 'Error');
        },
      });
  }

  onGantiPIC(): void {
    if (this.isActionLoading) return;
    this.isActionLoading = true;
    const payloadUnlocked = {
      DocNum: this.docNumSelected,
      PIC: this.picName,
    };

    this.service
      .putPickingRemarksUnlock(payloadUnlocked)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isActionLoading = false;
          this.onAmbilBon();
        },
        error: (e) => {
          this.isActionLoading = false;
          console.error('Ganti PIC error:', e);
          this.toastr.error('Gagal mengganti PIC', 'Error');
        },
      });
  }

  toChecklist(docnum: string): void {
    void this.router.navigate([
      '/main-reqtrans/picking/checklist',
      docnum,
      this.dateString,
    ]);
  }
}

