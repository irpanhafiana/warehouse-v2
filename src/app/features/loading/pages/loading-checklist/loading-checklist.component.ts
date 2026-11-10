import { Component, ElementRef, viewChild, OnInit, OnDestroy, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { QRCodeComponent } from 'angularx-qrcode';

import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { LoadingService } from '../../services/loading.service';
import { GoodsDeliveryService } from '../../../../core/services/goods-delivery.service';
import { SignalrService } from '../../../../core/services/signalr.service';
import { StorageService } from '../../../../core/services/storage.service';

import { Detail, SalesInvoicesModel, HeaderRes } from '../../../../core/models';

import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { DialogSetPicComponent } from '../../../../shared/components/dialog-set-pic/dialog-set-pic.component';
import { TruncatePipe } from '../../../../shared/pipes';

@Component({
  selector: 'app-loading-checklist',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoaderComponent,
    QRCodeComponent,
    DialogSetPicComponent,
    TruncatePipe,
  ],
  templateUrl: './loading-checklist.component.html',
  styleUrl: './loading-checklist.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingChecklistComponent implements OnInit, OnDestroy {
  readonly scrollableElement = viewChild<ElementRef>('scrollable');

  private route = inject(ActivatedRoute);
  private service = inject(SalesInvoiceService);
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  private signalrService = inject(SignalrService);
  private goodsDeliveryService = inject(GoodsDeliveryService);
  private location = inject(Location);
  private toastr = inject(ToastrService);
  private storageService = inject(StorageService);
  private destroyRef = inject(DestroyRef);
  readonly cdr = inject(ChangeDetectorRef);

  readonly salesInvoice = signal<SalesInvoicesModel | undefined>(undefined);
  readonly initialData = signal<Detail[]>([]);
  readonly filteredData = signal<Detail[]>([]);
  readonly newBon = signal<HeaderRes | undefined>(undefined);

  readonly docnum = signal('');
  readonly picName = signal('');
  readonly selectedAlphabet = signal('');
  readonly msgError = signal('');
  readonly qrCodeUrl = signal('');
  readonly dateString = signal('');
  readonly selectedBON = signal('');

  readonly notPickedItem = signal(0);
  readonly loading = signal(false);
  readonly loadingBonBaru = signal(true);
  readonly isManualRefresh = signal(false);

  readonly isDialogAddPic = signal(false);
  readonly isDialogConfirmKeluar = signal(false);
  readonly isDialogOpenBarcode = signal(false);
  readonly isErrorPicSebagian = signal(false);
  readonly isBonNotFinishPick = signal(false);
  readonly isRecehExist = signal(false);
  readonly isErrorUnknown = signal(false);
  readonly isShowMenu = signal(false);

  readonly pickingPic = signal<string[]>([]);
  readonly alphabet = signal<string[]>([]);
  readonly listBON = signal<HeaderRes[]>([]);
  readonly loadingStates = signal<{ [key: number]: boolean }>({});
  readonly itemLoaded = signal<any[]>([]);
  readonly loadedIdSet = computed(() => new Set((this.itemLoaded() || []).map((item) => item?.Id)));
  readonly expandedIndex = signal<number | null>(null);

  private loadingDetailSub?: Subscription;
  private detailCustomerSub?: Subscription;

  private notifyNewLoadingHandler = (salesInvoiceModel: string): void => {
    try {
      const parsed = typeof salesInvoiceModel === 'string' ? JSON.parse(salesInvoiceModel) : salesInvoiceModel;
      if (Array.isArray(parsed)) {
        this.updateDetailsArray(parsed);
      } else if (parsed) {
        this.updateDetails(parsed);
      }
    } catch (e) {
      console.error('SignalR notifyNewLoading parse error:', e);
    }
  };

  private notifyAdditionalInvoiceHandler = (salesInvoiceModel: string): void => {
    try {
      const parsed = typeof salesInvoiceModel === 'string' ? JSON.parse(salesInvoiceModel) : salesInvoiceModel;
      const incomingCode = parsed?.Code || parsed?.CustomerModel?.Code;
      if (incomingCode && incomingCode !== this.docnum()) {
        return;
      }
      this.newBon.set(parsed);
      this.getDetailByCustomerCode(this.dateString(), this.docnum());
      if (this.newBon()?.Name) {
        this.toastr.success(`BON baru dari: ${this.newBon()!.Name}`, 'Success');
      }
    } catch (e) {
      console.error('SignalR notifyAdditionalInvoice parse error:', e);
    }
  };

  private notifyNewReturnHandler = (salesInvoiceModel: string): void => {
    try {
      const parsedData = typeof salesInvoiceModel === 'string' ? JSON.parse(salesInvoiceModel) : salesInvoiceModel;
      if (Array.isArray(parsedData)) {
        this.updateDetailsArray(parsedData);
      }
    } catch (error) {
      console.error('SignalR notifyNewReturn error:', error);
    }
  };

  async ngOnInit(): Promise<void> {
    const docnumVal = this.route.snapshot.params['customerCode'] || '';
    const dateVal = this.route.snapshot.params['date'] || '';
    const bonVal = this.route.snapshot.params['docnum'] || '';

    this.docnum.set(docnumVal);
    this.dateString.set(dateVal);
    this.selectedBON.set(bonVal);
    this.loadingService.setDocnumSubject(docnumVal);

    const host = window.location.host;
    this.qrCodeUrl.set(`http://${host}/checkToken/${docnumVal}/${dateVal}`);

    const savedPhoneName = await this.storageService.get('phoneName');
    if (savedPhoneName) {
      this.picName.set(savedPhoneName);
    }

    this.getDetailByCustomerCode(dateVal, docnumVal);
    this.getLoadingDetail(bonVal ? bonVal : docnumVal, undefined, false, true);
    this.getPickingPicList();

    this.signalrService.on('NotifyNewLoading', this.notifyNewLoadingHandler);
    this.signalrService.on('NotifyAdditionalInvoice', this.notifyAdditionalInvoiceHandler);
    this.signalrService.on('NotifyNewReturn', this.notifyNewReturnHandler);
  }

  ngOnDestroy(): void {
    this.loadingDetailSub?.unsubscribe();
    this.detailCustomerSub?.unsubscribe();
    this.signalrService.off('NotifyNewLoading', this.notifyNewLoadingHandler);
    this.signalrService.off('NotifyAdditionalInvoice', this.notifyAdditionalInvoiceHandler);
    this.signalrService.off('NotifyNewReturn', this.notifyNewReturnHandler);
  }

  getDetailByCustomerCode(dateString: string, customerCode: string, silent = false): void {
    this.detailCustomerSub?.unsubscribe();
    if (!silent) {
      this.loadingBonBaru.set(true);
    }
    this.detailCustomerSub = this.loadingService
      .getLoadingDetailByCustomerCode(dateString, customerCode)
      .pipe(
        finalize(() => {
          if (!silent) {
            this.loadingBonBaru.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data: HeaderRes[]) => {
          const sorted = [...(data || [])].sort((a, b) => {
            const dateCompare = (b.DocDate || '').localeCompare(a.DocDate || '');
            if (dateCompare !== 0) return dateCompare;
            return (b.DocNum || '').localeCompare(a.DocNum || '');
          });
          this.listBON.set(sorted);
          this.cdr.markForCheck();
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
  }

  getLoadingDetail(docnum: string, index?: number, silent = false, showDialog = false): void {
    const isSwitchBon = !!this.selectedBON() && this.selectedBON() !== docnum;
    this.selectedBON.set(docnum);
    if (index !== undefined) {
      this.toggleText(index);
    }

    this.loadingDetailSub?.unsubscribe();
    if (!silent) {
      this.loading.set(true);
    }
    this.loadingDetailSub = this.loadingService
      .getLoadingDetail(docnum)
      .pipe(
        finalize(() => {
          if (!silent) {
            this.loading.set(false);
          }
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data: SalesInvoicesModel) => {
          (data.Details || []).forEach((element) => {
            element.isDone = false;
            element.isSebagian = false;
            element.sebagianValue = 0;
          });

          this.salesInvoice.set(data);
          const restored = this.restoreSebagianFromStorage(data.Details || []);
          this.initialData.set(this.sortDetails(restored));

          const initials = Array.from(
            new Set(
              (data.Details || [])
                .map((product) => {
                  const name = (product.ProductModel?.Name || '').trim();
                  if (!name) return '';
                  return name.startsWith('~') ? name.charAt(1).toUpperCase() : name.charAt(0).toUpperCase();
                })
                .filter(Boolean)
            )
          );
          this.alphabet.set(initials.sort((a, b) => a.localeCompare(b)));
          this.applyFilter();
          this.cdr.markForCheck();
        },
        error: () => {
          if (!silent) {
            this.isErrorUnknown.set(true);
            this.toastr.error('Silahkan cek item yang belum di pick', 'Peringatan');
          }
          this.cdr.markForCheck();
        },
        complete: () => {
          this.getNotPickedItem(showDialog || isSwitchBon);
          this.getRecehExist(showDialog || isSwitchBon);
          this.getCheckBON(this.selectedBON());
        },
      });
  }

  getCheckBON(docnum: string): void {
    this.goodsDeliveryService
      .getCheckBON(docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const loaded: any[] = [];
          (data || []).forEach((element: any) => {
            (element.Details || []).forEach((el: any) => {
              try {
                loaded.push(JSON.parse(el.Data));
              } catch {
                // Ignore parse errors
              }
            });
          });
          this.itemLoaded.set(loaded);
          this.initialData.set(this.sortDetails(this.initialData()));
          this.applyFilter();
          this.cdr.markForCheck();
        },
      });
  }

  getPickingPicList(): void {
    this.service
      .getPickingPicList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: string[]) => {
          const list = [...(data || [])].sort((a, b) => a.localeCompare(b));
          this.pickingPic.set(list);
          if (!this.picName() && list.length > 0) {
            this.picName.set(list[0]);
          }
          this.cdr.markForCheck();
        },
      });
  }

  getNotPickedItem(showDialog = false): void {
    this.loadingService
      .getCheckItemNotPicked(this.selectedBON())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count: number) => {
          this.notPickedItem.set(count);
          if (showDialog && count > 0) {
            this.isBonNotFinishPick.set(true);
          } else if (count === 0) {
            this.isBonNotFinishPick.set(false);
          }
          this.cdr.markForCheck();
        },
      });
  }

  getRecehExist(showDialog = false): void {
    this.loadingService
      .getCheckReceh(this.selectedBON())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (exists: boolean) => {
          if (showDialog && exists) {
            this.isRecehExist.set(true);
          } else if (!exists) {
            this.isRecehExist.set(false);
          }
          this.cdr.markForCheck();
        },
      });
  }

  applyFilter(): void {
    const result = this.filteredProducts(this.initialData());
    this.filteredData.set(result);
    this.cdr.markForCheck();
  }

  filteredProducts(detail: Detail[]): Detail[] {
    const products = (detail || []).map((product) => {
      const existingDetail = this.filteredData().find((d) => d.Id === product.Id);
      return {
        ...product,
        sebagianValue: existingDetail?.sebagianValue ?? product.sebagianValue,
        isSebagian: existingDetail?.isSebagian ?? product.isSebagian,
        ProductModel: {
          ...product.ProductModel,
          Name: product.ProductModel?.Name?.replace(/^~+/, '').trim() || '',
        },
      };
    });

    if (!this.selectedAlphabet()) {
      return products;
    }

    return products.filter((product) =>
      product.ProductModel?.Name?.toLowerCase().startsWith(this.selectedAlphabet().toLowerCase())
    );
  }

  sortDetails(details: Detail[]): Detail[] {
    return [...details].sort((a, b) => {
      const aDone = this.isItemComplete(a);
      const bDone = this.isItemComplete(b);
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    });
  }

  isReceh(item: Detail): boolean {
    return (
      (item.ProductModel?.Name || '').trim().toUpperCase() === 'RECEH' ||
      (item.ProductModel?.Description || '').trim().toUpperCase() === 'RECEH'
    );
  }

  isItemComplete(item: Detail): boolean {
    if (!this.isReceh(item) && this.isFullyDelivered(item)) return true;
    if (!item.Remarks) return false;
    const match = item.Remarks.match(/load by:\s*([\w\s,]+)/i);
    if (match) {
      const names = match[1]
        .split(',')
        .map((name: string) => name.trim())
        .filter(Boolean);
      return names.length > 1;
    }
    return false;
  }

  isItemLoaded(item: Detail): boolean {
    if (this.isReceh(item)) return false;
    return this.loadedIdSet().has(item.Id);
  }

  calculateApprovalQty(openQuantity: number, quantity: number): number {
    if (openQuantity > 0) {
      return Number(openQuantity + quantity);
    }
    return Number(quantity);
  }

  getDeliveredQty(item: Detail): number {
    if (this.isReceh(item)) return 0;
    const qty = Number(item.Quantity || 0);
    const openQty = item.OpenQuantity !== undefined && item.OpenQuantity !== null ? Number(item.OpenQuantity) : qty;

    if (qty > openQty && openQty >= 0) {
      return qty - openQty;
    }

    if (openQty === 0 && this.isItemLoaded(item)) {
      return qty;
    }

    const loadedMatches = (this.itemLoaded() || []).filter(
      (l) => l?.Id === item.Id || l?.id === item.Id
    );
    if (loadedMatches.length > 0) {
      const sum = loadedMatches.reduce(
        (total, curr) => total + Number(curr.sebagianValue || curr.Quantity || 0),
        0
      );
      if (sum > 0) return sum;
    }

    return 0;
  }

  getRemainingQty(item: Detail): number {
    if (item.OpenQuantity !== undefined && item.OpenQuantity !== null) {
      return Number(item.OpenQuantity);
    }
    return Number(item.Quantity || 0);
  }

  getTotalQty(item: Detail): number {
    return Number(item.Quantity || 0);
  }

  hasDelivered(item: Detail): boolean {
    if (this.isReceh(item)) return false;
    return (
      this.isItemLoaded(item) ||
      this.getDeliveredQty(item) > 0 ||
      (item.OpenQuantity !== undefined && item.OpenQuantity !== null && Number(item.OpenQuantity) < Number(item.Quantity || 0))
    );
  }

  isFullyDelivered(item: Detail): boolean {
    if (this.isReceh(item)) return false;
    const openQty = item.OpenQuantity !== undefined && item.OpenQuantity !== null ? Number(item.OpenQuantity) : Number(item.Quantity || 0);
    return openQty === 0 && this.hasDelivered(item);
  }

  onRemarkDone(id: number, remarks: string, detailId: string, detail: Detail): void {
    if (this.isLoading(id)) return;
    if (!this.isReceh(detail) && this.isFullyDelivered(detail)) return;

    if (!this.picName()) {
      this.isErrorPicSebagian.set(true);
      this.msgError.set('PIC belum dipilih, silahkan pilih PIC terlebih dahulu sebelum melanjutkan loading!');
      return;
    }

    if (this.isReceh(detail)) {
      this.setLoadingState(id, true);
      this.loadingService
        .getCheckReceh(this.selectedBON())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (exists: boolean) => {
            this.isRecehExist.set(exists);
            if (exists) {
              this.setLoadingState(id, false);
              this.cdr.markForCheck();
              return;
            }
            this.applyOptimisticRemark(detail);
            this.executeSaveRecehDone(id, detail);
          },
          error: (e) => {
            console.error('Check receh error before loading:', e);
            this.applyOptimisticRemark(detail);
            this.executeSaveRecehDone(id, detail);
          },
        });
      return;
    }

    this.setLoadingState(id, true);
    this.applyOptimisticRemark(detail);
    this.executeSaveRemarkDone(id, detail);
  }

  private applyOptimisticRemark(detail: Detail): void {
    const currentRemarks = (detail.Remarks || '').trim();
    if (!currentRemarks) {
      detail.Remarks = `load by: ${this.picName()}`;
    } else if (!currentRemarks.includes(this.picName())) {
      detail.Remarks = `${currentRemarks}, ${this.picName()}`;
    }
    this.cdr.markForCheck();
  }

  private executeSaveRecehDone(id: number, detail: Detail): void {
    const detailIds =
      detail.DetailId && detail.DetailId.trim() !== ''
        ? detail.DetailId.split(',')
            .map((x) => Number(x.trim()))
            .filter((x) => !isNaN(x) && x > 0)
        : [Number(id)];

    const savePayload = {
      PIC: [this.picName()],
      DetailId: detailIds.length > 0 ? detailIds : [Number(id)],
      DocNum: this.selectedBON() || '',
    };

    this.service
      .putLoadingListDetails(savePayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(id, false);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Save RECEH error:', err);
          this.isErrorPicSebagian.set(true);
          this.msgError.set('Terjadi kesalahan saat menyimpan checklist loading RECEH.');
          this.setLoadingState(id, false);
          this.cdr.markForCheck();
        },
      });
  }

  private executeSaveRemarkDone(id: number, detail: Detail): void {
    const qty = detail.sebagianValue > 0 ? detail.sebagianValue : this.getRemainingQty(detail);

    const detailIds =
      detail.DetailId && detail.DetailId.trim() !== ''
        ? detail.DetailId.split(',')
            .map((x) => Number(x.trim()))
            .filter((x) => !isNaN(x) && x > 0)
        : [Number(id)];

    const savePayload = {
      PIC: [this.picName()],
      DetailId: detailIds.length > 0 ? detailIds : [Number(id)],
      Details: [
        {
          ItemCode: detail.ProductModel.Code,
          UoMCode: detail.UoMModel.Code,
          Quantity: qty,
          BaseQuantity: detail.BaseQuantity,
        },
      ],
      DocNum: this.selectedBON() || '',
    };

    this.service
      .putLoadingListDetails(savePayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(id, false);
          // Reset sebagianValue di localStorage setelah berhasil disimpan
          this.clearSebagianFromStorage(id);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isErrorPicSebagian.set(true);
          this.msgError.set('Terjadi kesalahan saat menyimpan checklist loading.');
          this.setLoadingState(id, false);
        },
      });
  }

  onCancel(id: number): void {
    if (this.isLoading(id)) return;

    if (!this.picName()) {
      this.isErrorPicSebagian.set(true);
      this.msgError.set('PIC belum dipilih, silahkan pilih PIC terlebih dahulu!');
      return;
    }

    this.setLoadingState(id, true);

    const payload = {
      DetailId: id,
      PIC: this.picName(),
      DocNum: this.selectedBON(),
    };

    this.service
      .putLoadingCancel(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(id, false);
        },
        error: () => {
          this.setLoadingState(id, false);
        },
      });
  }

  onSebagianValueChange(indicator: string, id: number): void {
    const filtered = this.filteredData().map((i) => {
      if (i.Id !== id) return i;
      const copy = { ...i };
      if (copy.sebagianValue === undefined) {
        copy.sebagianValue = 0;
      }
      if (indicator === '-') {
        if (copy.sebagianValue > 0) copy.sebagianValue--;
      } else if (indicator === '+') {
        const maxLimit = this.getRemainingQty(copy);
        if (copy.sebagianValue < maxLimit) copy.sebagianValue++;
      }
      return copy;
    });

    const changed = filtered.find((i) => i.Id === id);
    if (!changed) return;

    this.filteredData.set(filtered);

    // Sinkronkan ke initialData agar tidak ter-reset saat applyFilter() dipicu event SignalR
    this.initialData.update((items) =>
      items.map((i) => (i.Id === id ? { ...i, sebagianValue: changed.sebagianValue } : i))
    );

    // Simpan sebagianValue ke localStorage agar tidak hilang saat refresh/berpindah BON
    this.saveSebagianToStorage(id, changed.sebagianValue);
    this.cdr.markForCheck();
  }

  updateDetails(detailsIncoming: Detail): void {
    const updateIn = (arr: Detail[]) => {
      const idx = arr.findIndex(
        (d) =>
          (detailsIncoming.Id ? d.Id === detailsIncoming.Id : d.DetailId === detailsIncoming.DetailId) ||
          ((d.ProductModel?.Name || '').trim().toUpperCase() === 'RECEH' &&
            (detailsIncoming.ProductModel?.Name || '').trim().toUpperCase() === 'RECEH')
      );
      if (idx !== -1) {
        const copy = [...arr];
        copy[idx] = { ...copy[idx], ...detailsIncoming };
        return copy;
      }
      return arr;
    };
    this.initialData.set(updateIn(this.initialData()));
    this.filteredData.set(updateIn(this.filteredData()));
    this.setLoadingState(detailsIncoming.Id, false);
    this.applyFilter();
  }

  updateDetailsArray(detailsIncoming: Detail[]): void {
    detailsIncoming.forEach((d) => this.updateDetails(d));
  }

  getCardClass(item: Detail): string {
    if (!this.isReceh(item) && this.isFullyDelivered(item)) {
      return 'bg-emerald-50 border-emerald-300 opacity-90';
    }

    const remarkNames = item.Remarks
      ? item.Remarks.replace('load by: ', '')
        .split(',')
        .map((name: string) => name.trim())
        .filter(Boolean)
      : [];

    if (!this.isReceh(item)) {
      const remaining = this.getRemainingQty(item);
      if (item.sebagianValue > 0 && item.sebagianValue !== remaining) {
        return 'bg-gray-100 border-gray-300';
      }
    }
    if (remarkNames.includes(this.picName())) {
      return 'bg-emerald-300 border-emerald-400';
    }
    if (item.Remarks) {
      return 'bg-amber-200 border-amber-300';
    }
    return 'bg-white border-gray-200';
  }

  async toAddDelivery(): Promise<void> {
    if (this.checkRemarks(this.filteredData())) {
      await this.storageService.set(
        `GOODS${this.selectedBON()}`,
        JSON.stringify(this.filterValidRemarks(this.filteredData()))
      );
      void this.router.navigate(['/main/loading/add-to-delivery', this.selectedBON()]);
    } else {
      this.isErrorPicSebagian.set(true);
      this.msgError.set('Ada Item/Produk yang belum di klik berdua, Mohon cek kembali');
      this.cdr.markForCheck();
    }
  }

  filterValidRemarks(data: Detail[]): Detail[] {
    return data.filter((item) => {
      if (!this.isReceh(item) && (this.isFullyDelivered(item) || item.OpenQuantity === 0)) return false;
      const match = (item.Remarks || '').match(/load by:\s*([\w\s,]+)/i);
      if (match) {
        const names = match[1]
          .split(',')
          .map((n: string) => n.trim())
          .filter(Boolean);
        return names.length > 1;
      }
      return false;
    });
  }

  checkRemarks(data: Detail[]): boolean {
    return data.every((item) => {
      if (!item.Remarks || !item.Remarks.trim()) return true;
      const match = item.Remarks.match(/load by:\s*([\w\s,]+)/i);
      if (match) {
        const names = match[1]
          .split(',')
          .map((n: string) => n.trim())
          .filter(Boolean);
        return names.length > 1;
      }
      return false;
    });
  }

  onOptionSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.picName.set(select.value);
    void this.storageService.set('picLoading', select.value);
    this.cdr.markForCheck();
  }

  onAddPicFromDialog(newPic: string): void {
    const formatted = newPic.toUpperCase().trim();
    if (formatted && !this.pickingPic().includes(formatted)) {
      this.pickingPic.update((list) => [formatted, ...list]);
    }
    this.picName.set(formatted);
    void this.storageService.set('picLoading', formatted);
    this.isDialogAddPic.set(false);
    this.cdr.markForCheck();
  }

  onSelectedAlphabet(char: string): void {
    this.selectedAlphabet.set(char === '~' ? '' : char);
    this.applyFilter();
  }

  toggleText(index: number): void {
    this.expandedIndex.set(this.expandedIndex() === index ? null : index);
    this.cdr.markForCheck();
  }

  setLoadingState(itemId: number, state: boolean): void {
    this.loadingStates.update((states) => ({ ...states, [itemId]: state }));
    this.cdr.markForCheck();
  }

  isLoading(itemId: number): boolean {
    return this.loadingStates()[itemId] || false;
  }

  private saveSebagianToStorage(id: number, sebagianValue: number): void {
    try {
      const storedData: { id: number; sebagianValue: number }[] = JSON.parse(
        localStorage.getItem(this.selectedBON()) || '[]'
      );
      const existingItem = storedData.find((item) => item.id === id);
      if (existingItem) {
        existingItem.sebagianValue = sebagianValue;
      } else {
        storedData.push({ id, sebagianValue });
      }
      localStorage.setItem(this.selectedBON(), JSON.stringify(storedData));
    } catch {
      // Ignore localStorage errors
    }
  }

  private clearSebagianFromStorage(id: number): void {
    try {
      const storedData: { id: number; sebagianValue: number }[] = JSON.parse(
        localStorage.getItem(this.selectedBON()) || '[]'
      );
      const filtered = storedData.filter((item) => item.id !== id);
      if (filtered.length > 0) {
        localStorage.setItem(this.selectedBON(), JSON.stringify(filtered));
      } else {
        localStorage.removeItem(this.selectedBON());
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private restoreSebagianFromStorage(details: Detail[]): Detail[] {
    try {
      const storedData: { id: number; sebagianValue: number }[] = JSON.parse(
        localStorage.getItem(this.selectedBON()) || '[]'
      );
      if (storedData.length === 0) return details;

      return details.map((item) => {
        const stored = storedData.find((s) => s.id === item.Id);
        if (stored) {
          return { ...item, sebagianValue: stored.sebagianValue };
        }
        return item;
      });
    } catch {
      return details;
    }
  }

  onBack(): void {
    this.location.back();
  }

  onRefresh(silent = false): void {
    this.selectedAlphabet.set('');
    this.getPickingPicList();
    this.getDetailByCustomerCode(this.dateString(), this.docnum(), silent);
    this.getLoadingDetail(this.selectedBON(), undefined, silent, false);
  }

  toCheckout(docnum: string): void {
    void this.router.navigate(['/main/checkout/detail', docnum || this.docnum()]);
  }

  async toPickingDetail(docnum: string): Promise<void> {
    await this.storageService.set('selectedTab', 'non-receh');
    void this.router.navigate(['/main/picking/checklist', docnum, this.dateString()]);
  }
}
