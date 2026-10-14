import { Component, OnInit, OnDestroy, inject, DestroyRef, ChangeDetectorRef } from '@angular/core';
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

    const savedTab = await this.storageService.get('selectedTab');
    if (savedTab === 'non-receh' || savedTab === 'receh') {
      this.selectedTab = savedTab;
    }

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
          this.getDetail();
        }
      });
  }

  ngOnDestroy(): void {
    this.signalrService.off('NotifyNewPicking', this.notifyNewPickingHandler);
    this.signalrService.off('NotifyNewReturn', this.notifyNewReturnHandler);
    this.signalrService.off('NotifyPickingLockedUnlocked', this.notifyPickingLockedUnlockedHandler);
  }

  getDetail(): void {
    this.loading = true;
    this.service
      .getPickingDetail(this.docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: SalesInvoicesModel) => {
          this.loading = false;
          this.salesInvoice = data;
          this.checkPIC(data.Remarks);
          this.arrReceh = this.filterRecehDetails(data.Details || []);
          this.arrNonReceh = this.filterNonRecehDetails(data.Details || []);
        },
        error: () => {
          this.loading = false;
          this.toastr.error('Terjadi kesalahan saat mengambil data detail', 'Error');
        },
      });
  }

  checkPIC(picName?: string): void {
    if (!picName) {
      this.toastr.warning('BON ini belum memiliki PIC atau status telah dibatalkan.', 'Perhatian');
      void this.router.navigate(['/main/picking/list', this.docnum]);
    } else {
      this.selectedPic = picName;
    }
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
        },
      });
  }

  openDialog(id: number): void {
    this.detailId = id;
    this.isDialogOpen = true;
  }

  closeDialog(): void {
    this.isDialogOpen = false;
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
        },
        error: (err) => {
          console.error('Error saving item:', err);
          this.setLoadingState(detailId, false);
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
  }

  onCancel(id: number): void {
    this.loadingPickDone = true;
    this.loadingId = id;

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
        },
        complete: () => {
          this.loadingPickDone = false;
        },
      });
  }

  async onSelectedTab(tab: 'receh' | 'non-receh'): Promise<void> {
    this.selectedTab = tab;
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
  }

  isLoading(itemId: number): boolean {
    return this.loadingStates[itemId] || false;
  }

  getShortName(fullName?: string): string {
    const maxLength = 24;
    if (!fullName) return '';
    if (fullName.length <= maxLength) return fullName;
    return fullName.substring(0, maxLength) + '...';
  }
}

