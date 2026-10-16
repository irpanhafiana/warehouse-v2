import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { Detail, SalesInvoicesModel } from '../../../../core/models';
import { SignalrService, parseSignalRPayload } from '../../../../core/services/signalr.service';
import { StorageService, STORAGE_KEYS } from '../../../../core/services/storage.service';
import { DialogSetPicComponent, LoaderComponent } from '../../../../shared/components';
import { ReqtransPickingService } from '../../services/reqtrans-picking.service';

@Component({
  selector: 'app-reqtrans-picking-checklist',
  imports: [CommonModule, FormsModule, LoaderComponent, DialogSetPicComponent],
  templateUrl: './reqtrans-picking-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReqtransPickingChecklistComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private pickingService = inject(ReqtransPickingService);
  private signalRService = inject(SignalrService);
  private storage = inject(StorageService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  docnum: string = '';
  dateString: string = '';
  salesInvoice: SalesInvoicesModel | null = null;
  loading: boolean = false;
  isDialogOpen: boolean = false;

  pickingPic: string[] = [];
  selectedPic: string = '';
  picName: string = '';
  selectedTab: 'receh' | 'non-receh' = 'receh';

  arrReceh: Detail[] = [];
  arrNonReceh: Detail[] = [];
  detailId: number = 0;
  loadingStates: { [key: number]: boolean } = {};
  boxQty: string = '';

  private notifyNewDeliveryPickingHandler = (salesInvoiceModel: string): void => {
    const parsed = parseSignalRPayload<Detail | Detail[]>(salesInvoiceModel);
    const detail = Array.isArray(parsed) ? parsed[0] : parsed;
    if (detail) {
      this.updateDetails(detail);
    }
  };

  private notifyNewDeliveryBoxUsedHandler = (salesInvoiceModel: string): void => {
    const resp = parseSignalRPayload<{ DocNum?: string }>(salesInvoiceModel);
    if (resp?.DocNum === this.docnum) {
      this.getDetail();
    }
  };

  private notifyNewDeliveryReturnHandler = (salesInvoiceModel: string): void => {
    const parsedData = parseSignalRPayload<Detail[]>(salesInvoiceModel);
    if (Array.isArray(parsedData)) {
      this.updateDetailsArray(parsedData);
    }
  };

  private notifyDeliveryPickingLockedUnlockedHandler = (salesInvoiceModel: string): void => {
    const parsed = parseSignalRPayload<Detail | Detail[]>(salesInvoiceModel);
    const detail = Array.isArray(parsed) ? parsed[0] : parsed;
    if (detail) {
      this.updateDetails(detail);
    }
  };

  constructor() {
    this.docnum = this.route.snapshot.params['docnum'] || '';
    this.dateString = this.route.snapshot.params['date'] || '';
    const storedTab = localStorage.getItem('selectedTab');
    if (storedTab === 'receh' || storedTab === 'non-receh') {
      this.selectedTab = storedTab;
    }
  }

  async ngOnInit(): Promise<void> {
    const cachedPic = await this.storage.getItem(STORAGE_KEYS.PHONE_NAME);
    if (cachedPic) {
      this.selectedPic = cachedPic.toUpperCase();
      this.picName = this.selectedPic;
    }

    if (this.docnum) {
      this.getDetail();
      this.getPickingPicList();
    }

    this.signalRService.on('NotifyNewDeliveryPicking', this.notifyNewDeliveryPickingHandler);
    this.signalRService.on('NotifyNewDeliveryBoxUsed', this.notifyNewDeliveryBoxUsedHandler);
    this.signalRService.on('NotifyNewDeliveryReturn', this.notifyNewDeliveryReturnHandler);
    this.signalRService.on('NotifyDeliveryPickingLockedUnlocked', this.notifyDeliveryPickingLockedUnlockedHandler);

    this.signalRService.reconnected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.docnum) {
          this.getDetail();
        }
      });
  }

  ngOnDestroy(): void {
    this.signalRService.off('NotifyNewDeliveryPicking', this.notifyNewDeliveryPickingHandler);
    this.signalRService.off('NotifyNewDeliveryBoxUsed', this.notifyNewDeliveryBoxUsedHandler);
    this.signalRService.off('NotifyNewDeliveryReturn', this.notifyNewDeliveryReturnHandler);
    this.signalRService.off('NotifyDeliveryPickingLockedUnlocked', this.notifyDeliveryPickingLockedUnlockedHandler);
  }

  getDetail(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.pickingService
      .getPickingDetail(this.docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.loading = false;
          this.salesInvoice = data;
          this.checkPIC(this.salesInvoice?.Remarks || '');
          this.arrReceh = this.filterRecehDetails(data?.Details || []);
          this.arrNonReceh = this.filterNonRecehDetails(data?.Details || []);
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Get picking detail error:', e);
          this.loading = false;
          this.toastr.error('Terjadi kesalahan saat mengambil data detail', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  checkPIC(picName: string): void {
    if (!picName || picName.trim() === '') {
      this.toastr.warning('BON ini belum memiliki PIC atau status telah dibatalkan.', 'Perhatian');
      void this.router.navigate(['/main-reqtrans/picking/list', this.docnum]);
    } else {
      this.selectedPic = picName;
    }
  }

  getPickingPicList(): void {
    this.pickingService
      .getPickingPicList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pickingPic = data || [];
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get picking pic list warning:', e);
          this.cdr.markForCheck();
        },
      });
  }

  private filterRecehDetails(details: Detail[]): Detail[] {
    return details.filter(
      (detail) =>
        !detail.ProductModel?.Description?.includes('~') ||
        detail.UoMModel?.Code?.trim().toUpperCase() === 'BAL'
    );
  }

  private filterNonRecehDetails(details: Detail[]): Detail[] {
    return details.filter(
      (detail) =>
        Boolean(detail.ProductModel?.Description?.includes('~')) &&
        detail.UoMModel?.Code?.trim().toUpperCase() !== 'BAL'
    );
  }

  updateDetailsArray(detailsIncoming: Detail[]): void {
    const updateArr = (arr: Detail[]): void => {
      detailsIncoming.forEach((incoming) => {
        const idx = arr.findIndex((item) => item.Id === incoming.Id);
        if (idx !== -1) {
          arr[idx] = { ...arr[idx], ...incoming };
        }
      });
    };
    updateArr(this.arrReceh);
    updateArr(this.arrNonReceh);
    this.arrReceh = [...this.arrReceh];
    this.arrNonReceh = [...this.arrNonReceh];
    this.cdr.markForCheck();
  }

  updateDetails(detailIncoming: Detail): void {
    const idxReceh = this.arrReceh.findIndex((item) => item.Id === detailIncoming.Id);
    if (idxReceh !== -1) {
      this.arrReceh[idxReceh] = { ...this.arrReceh[idxReceh], ...detailIncoming };
    }
    const idxNon = this.arrNonReceh.findIndex((item) => item.Id === detailIncoming.Id);
    if (idxNon !== -1) {
      this.arrNonReceh[idxNon] = { ...this.arrNonReceh[idxNon], ...detailIncoming };
    }
    this.arrReceh = [...this.arrReceh];
    this.arrNonReceh = [...this.arrNonReceh];
    this.cdr.markForCheck();
  }

  onSelectedTab(tab: 'receh' | 'non-receh'): void {
    this.selectedTab = tab;
    localStorage.setItem('selectedTab', tab);
    this.cdr.markForCheck();
  }

  openPickerModal(detailId: number): void {
    this.detailId = detailId;
    this.isDialogOpen = true;
    this.cdr.markForCheck();
  }

  onPicSelected(pic: string): void {
    this.picName = pic.toUpperCase();
    this.isDialogOpen = false;
    this.cdr.markForCheck();
    this.onSaveItem(this.detailId, this.picName);
  }

  onSaveItem(detailId: number, picOverride?: string): void {
    if (this.isLoading(detailId)) return;

    this.setLoadingState(detailId, true);
    const picToUse = picOverride || this.selectedPic;

    const payload = {
      PIC: [picToUse],
      DetailId: [detailId],
      DocNum: this.docnum || '',
    };

    this.pickingService
      .putPickingListDetails(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(detailId, false);
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Save picking item error:', e);
          this.toastr.error('Gagal menyelesaikan item picking', 'Error');
          this.setLoadingState(detailId, false);
          this.cdr.markForCheck();
        },
      });
  }

  onCancel(id: number): void {
    if (this.isLoading(id)) return;
    this.setLoadingState(id, true);
    const payload = {
      DetailId: id,
      PIC: this.selectedPic,
    };

    this.pickingService
      .putPickingCancel(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(id, false);
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Cancel picking item error:', e);
          this.toastr.error('Gagal membatalkan item picking', 'Error');
          this.setLoadingState(id, false);
          this.cdr.markForCheck();
        },
      });
  }

  setLoadingState(itemId: number, state: boolean): void {
    this.loadingStates[itemId] = state;
    this.cdr.markForCheck();
  }

  isLoading(itemId: number): boolean {
    return Boolean(this.loadingStates[itemId]);
  }

  onBack(): void {
    localStorage.removeItem('selectedTab');
    void this.router.navigate(['/main-reqtrans/picking/list']);
  }

  toLoadingDetail(): void {
    if (!this.salesInvoice) return;
    const customerCode = this.salesInvoice.CustomerModel?.Code || '';
    void this.router.navigate([
      '/main-reqtrans/loading/checklist',
      customerCode,
      this.dateString,
      this.docnum,
    ]);
  }
}

