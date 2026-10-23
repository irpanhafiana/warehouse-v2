import { Component, OnInit, OnDestroy, inject, DestroyRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';

import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { SignalrService } from '../../../../core/services/signalr.service';
import { StorageService } from '../../../../core/services/storage.service';

import { Detail, SalesInvoicesModel } from '../../../../core/models';

import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { CardPickingItemComponent } from '../../../../shared/components/card-picking-item/card-picking-item.component';
import { DialogSetPicComponent } from '../../../../shared/components/dialog-set-pic/dialog-set-pic.component';
import { TruncatePipe } from '../../../../shared/pipes';

@Component({
  selector: 'app-picking-checklist',
  imports: [
    CommonModule,
    FormsModule,
    LoaderComponent,
    CardPickingItemComponent,
    DialogSetPicComponent,
  ],
  templateUrl: './picking-checklist.component.html',
  styleUrl: './picking-checklist.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickingChecklistComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private service = inject(SalesInvoiceService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private signalrService = inject(SignalrService);
  private storageService = inject(StorageService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  docnum = '';
  dateString = '';
  salesInvoice?: SalesInvoicesModel;
  loading = false;
  loadingPickDone = false;
  loadingId?: number;

  isDialogOpen = false;
  detailId = 0;
  pickingPic: string[] = [];
  selectedPic = '';
  selectedTab: 'receh' | 'non-receh' = 'receh';

  arrReceh: Detail[] = [];
  arrNonReceh: Detail[] = [];
  loadingStates: { [key: number]: boolean } = {};

  private notifyNewPickingHandler = (salesInvoiceModel: string): void => {
    try {
      const parsed = typeof salesInvoiceModel === 'string' ? JSON.parse(salesInvoiceModel) : salesInvoiceModel;
      const target = Array.isArray(parsed) ? parsed[0] : parsed;
      if (target) {
        this.updateDetails(target);
      }
    } catch (e) {
      console.error('SignalR notifyNewPicking error:', e);
    }
  };

  private notifyNewReturnHandler = (salesInvoiceModel: string): void => {
    try {
      const parsedData = typeof salesInvoiceModel === 'string' ? JSON.parse(salesInvoiceModel) : salesInvoiceModel;
      if (Array.isArray(parsedData)) {
        this.updateDetailsArray(parsedData);
      }
    } catch (error) {
      console.error('Error parsing NotifyNewReturn JSON:', error);
    }
  };

  private notifyPickingLockedUnlockedHandler = (salesInvoiceModel: string): void => {
    try {
      const parsed = typeof salesInvoiceModel === 'string' ? JSON.parse(salesInvoiceModel) : salesInvoiceModel;
      const target = Array.isArray(parsed) ? parsed[0] : parsed;
      if (target) {
        this.updateDetails(target);
      }
    } catch (e) {
      console.error('SignalR notifyPickingLockedUnlocked error:', e);
    }
  };

  async ngOnInit(): Promise<void> {
    this.docnum = this.route.snapshot.params['docnum'] || '';
    this.dateString = this.route.snapshot.params['date'] || '';

    const [savedTab, cachedPic] = await Promise.all([
      this.storageService.get('selectedTab'),
      this.storageService.get('phoneName'),
    ]);

    if (savedTab === 'non-receh' || savedTab === 'receh') {
      this.selectedTab = savedTab;
    }
    if (cachedPic && !this.selectedPic) {
      this.selectedPic = cachedPic.toUpperCase();
    }
    this.cdr.markForCheck();

    if (this.docnum) {
      this.getDetail();
      this.getPickingPicList();
    }

    this.signalrService.on('NotifyNewPicking', this.notifyNewPickingHandler);
    this.signalrService.on('NotifyNewReturn', this.notifyNewReturnHandler);
    this.signalrService.on('NotifyPickingLockedUnlocked', this.notifyPickingLockedUnlockedHandler);

    this.signalrService.reconnected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.docnum) {
          this.getDetail(true);
        }
      });
  }

  ngOnDestroy(): void {
    this.signalrService.off('NotifyNewPicking', this.notifyNewPickingHandler);
    this.signalrService.off('NotifyNewReturn', this.notifyNewReturnHandler);
    this.signalrService.off('NotifyPickingLockedUnlocked', this.notifyPickingLockedUnlockedHandler);
  }

  getDetail(silent = false): void {
    if (!silent) {
      this.loading = true;
      this.cdr.markForCheck();
    }
    this.service
      .getPickingDetail(this.docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: SalesInvoicesModel) => {
          if (!silent) {
            this.loading = false;
          }
          this.salesInvoice = data;
          this.checkPIC(data.Remarks, silent);
          this.arrReceh = this.filterRecehDetails(data.Details || []);
          this.arrNonReceh = this.filterNonRecehDetails(data.Details || []);
          this.cdr.markForCheck();
        },
        error: () => {
          if (!silent) {
            this.loading = false;
            this.toastr.error('Terjadi kesalahan saat mengambil data detail', 'Error');
          }
          this.cdr.markForCheck();
        },
      });
  }

  checkPIC(picName?: string, isBackgroundSync = false): void {
    if (picName && picName.trim() !== '') {
      this.selectedPic = picName;
      this.cdr.markForCheck();
      return;
    }

    // Jika pengguna sudah memiliki selectedPic (sedang aktif mengerjakan BON), pertahankan dan jangan kick out
    if (this.selectedPic) {
      return;
    }

    // Jika ini adalah background sync / reconnect, jangan kick out
    if (isBackgroundSync) {
      return;
    }

    // Hanya tendang keluar jika saat initial load memang tidak ada PIC sama sekali
    this.toastr.warning('BON ini belum memiliki PIC atau status telah dibatalkan.', 'Perhatian');
    void this.router.navigate(['/main/picking/list', this.docnum]);
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
        detail.ProductModel?.Description?.includes('~') &&
        detail.UoMModel?.Code?.trim().toUpperCase() !== 'BAL'
    );
  }

  getPickingPicList(): void {
    this.service
      .getPickingPicList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pickingPic = data || [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
  }

  openDialog(id: number): void {
    this.detailId = id;
    this.isDialogOpen = true;
    this.cdr.markForCheck();
  }

  closeDialog(): void {
    this.isDialogOpen = false;
    this.cdr.markForCheck();
  }

  onPickerSelectedFromDialog(picName: string): void {
    this.onSaveItem(this.detailId, picName);
    this.closeDialog();
  }

  onSaveItem(detailId: number, customPic?: string): void {
    if (this.isLoading(detailId)) {
      return;
    }

    this.setLoadingState(detailId, true);
    this.cdr.markForCheck();

    const pic = (customPic || this.selectedPic).toUpperCase();
    const savePayload = {
      PIC: [pic],
      DetailId: [detailId],
      DocNum: this.docnum || '',
    };

    this.service
      .putPickingListDetails(savePayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(detailId, false);
          this.closeDialog();
          // Realtime SignalR will update the state, but we also immediately reflect:
          this.updateItemLocally(detailId, pic);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error saving item:', err);
          this.setLoadingState(detailId, false);
          this.cdr.markForCheck();
        },
      });
  }

  private updateItemLocally(detailId: number, pic: string): void {
    const applyUpdate = (list: Detail[]) => {
      const idx = list.findIndex((item) => item.Id === detailId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], Remarks: pic };
      }
    };
    applyUpdate(this.arrReceh);
    applyUpdate(this.arrNonReceh);
    this.arrReceh = [...this.arrReceh];
    this.arrNonReceh = [...this.arrNonReceh];
    this.cdr.markForCheck();
  }

  onCancel(id: number): void {
    if (this.loadingPickDone) return;
    this.loadingPickDone = true;
    this.loadingId = id;
    this.cdr.markForCheck();

    const payload = {
      DetailId: id,
      PIC: this.selectedPic,
    };

    this.service
      .putPickingCancel(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          const clearRemark = (list: Detail[]) => {
            const idx = list.findIndex((item) => item.Id === id);
            if (idx >= 0) {
              list[idx] = { ...list[idx], Remarks: '' };
            }
          };
          clearRemark(this.arrReceh);
          clearRemark(this.arrNonReceh);
          this.arrReceh = [...this.arrReceh];
          this.arrNonReceh = [...this.arrNonReceh];
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingPickDone = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.loadingPickDone = false;
          this.cdr.markForCheck();
        },
      });
  }

  async onSelectedTab(tab: 'receh' | 'non-receh'): Promise<void> {
    this.selectedTab = tab;
    this.cdr.markForCheck();
    await this.storageService.set('selectedTab', tab);
  }

  async onBack(): Promise<void> {
    await this.storageService.remove('picName');
    await this.storageService.remove('selectedTab');
    void this.router.navigate(['/main/picking/list']);
  }

  async toLoadingDetail(docnum: string, customerCode: string): Promise<void> {
    if (!docnum || !this.dateString) {
      console.error('Invalid parameters for navigation:', { docnum, dateString: this.dateString });
      return;
    }

    const currentPicLoading = await this.storageService.get('picLoading');
    if (!currentPicLoading && this.selectedPic) {
      await this.storageService.set('picLoading', this.selectedPic);
    }

    void this.router.navigate([
      '/main/loading/checklist',
      customerCode,
      this.dateString,
      docnum,
    ]);
  }

  private updateDetailsArray(detailsIncoming: Detail[]): void {
    const updateArray = (arr: Detail[], updates: Detail[]) => {
      updates.forEach((detail) => {
        const index = arr.findIndex((item) => item.Id === detail.Id);
        if (index !== -1) {
          arr[index] = { ...arr[index], ...detail };
        }
      });
    };

    updateArray(this.arrReceh, detailsIncoming);
    updateArray(this.arrNonReceh, detailsIncoming);
    this.arrReceh = [...this.arrReceh];
    this.arrNonReceh = [...this.arrNonReceh];
    this.cdr.markForCheck();
  }

  private updateDetails(detailIncoming: Detail): void {
    const updateInList = (list: Detail[]) => {
      const idx = list.findIndex((item) => item.Id === detailIncoming.Id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...detailIncoming };
      }
    };
    updateInList(this.arrReceh);
    updateInList(this.arrNonReceh);
    this.arrReceh = [...this.arrReceh];
    this.arrNonReceh = [...this.arrNonReceh];
    this.cdr.markForCheck();
  }

  setLoadingState(itemId: number, state: boolean): void {
    this.loadingStates[itemId] = state;
    this.cdr.markForCheck();
  }

  isLoading(itemId: number): boolean {
    return this.loadingStates[itemId] || false;
  }
}

