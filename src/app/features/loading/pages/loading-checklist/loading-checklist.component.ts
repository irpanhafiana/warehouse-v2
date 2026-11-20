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
        if (Array.isArray((parsed as any).Details)) {
          this.updateDetailsArray((parsed as any).Details);
        } else {
          this.updateDetails(parsed);
        }
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
      } else if (parsedData && Array.isArray((parsedData as any).Details)) {
        this.updateDetailsArray((parsedData as any).Details);
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
    this.filteredData.set(this.sortDetails(result));
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
      const aReceh = this.isReceh(a);
      const bReceh = this.isReceh(b);

      if (aReceh !== bReceh) {
        return aReceh ? 1 : -1;
      }

      const aDone = this.isItemComplete(a);
      const bDone = this.isItemComplete(b);
      if (aDone !== bDone) {
        return aDone ? 1 : -1;
      }

      return 0;
    });
  }

  isReceh(item: Detail): boolean {
    const name = (item?.ProductModel?.Name || '').replace(/^~+/, '').trim().toUpperCase();
    const desc = (item?.ProductModel?.Description || '').replace(/^~+/, '').trim().toUpperCase();
    return name === 'RECEH' || desc === 'RECEH' || name.startsWith('RECEH');
  }

  isRecehWithoutAlias(item: Detail): boolean {
    return this.isReceh(item) && (!item?.Alias || !item.Alias.trim());
  }

  isItemComplete(item: Detail): boolean {
    if (this.isItemLoaded(item)) return true;
    if (!item.Remarks) return false;
    const names = this.extractPicsFromRemarks(item.Remarks);
    return names.length > 1;
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

  onRemarkDone(id: number, remarks: string, detailId: string, detail: Detail): void {
    if (this.isLoading(id) || this.isItemLoaded(detail) || this.isRecehWithoutAlias(detail)) return;

    if (!this.picName()) {
      this.isErrorPicSebagian.set(true);
      this.msgError.set('PIC belum dipilih, silahkan pilih PIC terlebih dahulu sebelum melanjutkan loading!');
      return;
    }

    if (this.isReceh(detail)) {
      this.setLoadingState(id, true);
      this.applyOptimisticRemark(detail);
      this.loadingService
        .getCheckReceh(this.selectedBON())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (exists: boolean) => {
            this.isRecehExist.set(exists);
            if (exists) {
              this.revertOptimisticRemark(detail);
              this.setLoadingState(id, false);
              this.cdr.markForCheck();
              return;
            }
            this.executeSaveRecehDone(id, detail);
          },
          error: (e) => {
            console.error('Check receh error before loading:', e);
            this.executeSaveRecehDone(id, detail);
          },
        });
      return;
    }

    this.setLoadingState(id, true);
    this.applyOptimisticRemark(detail);
    this.executeSaveRemarkDone(id, detail);
  }

  extractPicsFromRemarks(remarks?: string | null): string[] {
    if (!remarks) return [];
    return remarks
      .replace(/load by:\s*/i, '')
      .split(',')
      .map((name) => name.trim().toUpperCase())
      .filter(Boolean);
  }

  mergeRemarks(existingRemarks?: string | null, incomingRemarks?: string | null): string | null {
    const existing = this.extractPicsFromRemarks(existingRemarks);
    const incoming = this.extractPicsFromRemarks(incomingRemarks);
    const merged = Array.from(new Set([...existing, ...incoming]));
    return merged.length > 0 ? `load by: ${merged.join(', ')}` : (incomingRemarks || existingRemarks || null);
  }

  isCurrentPicInRemarks(remarks: string | null | undefined): boolean {
    if (!remarks) return false;
    const currentPic = (this.picName() || '').trim().toUpperCase();
    if (!currentPic) return false;
    return this.extractPicsFromRemarks(remarks).includes(currentPic);
  }

  private applyOptimisticRemark(detail: Detail): void {
    const currentRemarks = (detail.Remarks || '').trim();
    const pic = this.picName().trim().toUpperCase();
    let newRemarks = currentRemarks;
    if (!currentRemarks) {
      newRemarks = `load by: ${pic}`;
    } else if (!this.isCurrentPicInRemarks(currentRemarks)) {
      newRemarks = `${currentRemarks}, ${pic}`;
    }
    detail.Remarks = newRemarks;

    const matcher = (d: Detail) =>
      (detail.Id && detail.Id > 0 && d.Id === detail.Id) ||
      (detail.DetailId && d.DetailId && d.DetailId === detail.DetailId) ||
      (this.isReceh(d) && this.isReceh(detail));

    this.initialData.update((list) =>
      list.map((d) => (matcher(d) ? { ...d, Remarks: newRemarks } : d))
    );
    this.filteredData.update((list) =>
      list.map((d) => (matcher(d) ? { ...d, Remarks: newRemarks } : d))
    );
    this.cdr.markForCheck();
  }

  private revertOptimisticRemark(detail: Detail): void {
    const currentRemarks = (detail.Remarks || '').trim();
    let newRemarks: string | null = null;
    if (currentRemarks) {
      const currentPic = (this.picName() || '').trim().toUpperCase();
      const names = this.extractPicsFromRemarks(currentRemarks).filter((n) => n !== currentPic);
      newRemarks = names.length > 0 ? `load by: ${names.join(', ')}` : null;
    }
    detail.Remarks = newRemarks;

    const matcher = (d: Detail) =>
      (detail.Id && detail.Id > 0 && d.Id === detail.Id) ||
      (detail.DetailId && d.DetailId && d.DetailId === detail.DetailId) ||
      (this.isReceh(d) && this.isReceh(detail));

    this.initialData.update((list) =>
      list.map((d) => (matcher(d) ? { ...d, Remarks: newRemarks } : d))
    );
    this.filteredData.update((list) =>
      list.map((d) => (matcher(d) ? { ...d, Remarks: newRemarks } : d))
    );
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
          this.revertOptimisticRemark(detail);
          this.setLoadingState(id, false);
          this.cdr.markForCheck();
        },
      });
  }

  private executeSaveRemarkDone(id: number, detail: Detail): void {
    const qty = detail.sebagianValue > 0 ? detail.sebagianValue : detail.OpenQuantity;

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
          this.revertOptimisticRemark(detail);
          this.setLoadingState(id, false);
          this.cdr.markForCheck();
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

    const currentDetail = this.initialData().find((d) => d.Id === id);
    const prevRemarks = currentDetail?.Remarks ?? null;

    // LANGSUNG jadikan putih / batalkan secara optimistik tanpa nunggu server!
    this.revertRemarkForPic(id, this.picName());
    this.setLoadingState(id, true);

    const payload = {
      DetailId: id,
      PIC: this.picName().trim().toUpperCase(),
      DocNum: this.selectedBON(),
    };

    this.service
      .putLoadingCancel(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(id, false);
          this.clearSebagianFromStorage(id);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Cancel loading error:', err);
          this.isErrorPicSebagian.set(true);
          this.msgError.set('Gagal membatalkan checklist loading.');
          // Revert jika gagal cancel
          this.setRemarkLocally(id, prevRemarks);
          this.setLoadingState(id, false);
          this.cdr.markForCheck();
        },
      });
  }

  private revertRemarkForPic(id: number, picToCancel: string): void {
    const formattedPic = picToCancel.trim().toUpperCase();

    const updateList = (list: Detail[]) =>
      list.map((item) => {
        if (item.Id !== id) return item;
        const currentRemarks = item.Remarks || '';
        const names = this.extractPicsFromRemarks(currentRemarks).filter(
          (name) => name !== formattedPic
        );
        const newRemarks = names.length > 0 ? `load by: ${names.join(', ')}` : null;
        return { ...item, Remarks: newRemarks };
      });

    this.initialData.update((list) => this.sortDetails(updateList(list)));
    this.filteredData.update((list) => this.sortDetails(updateList(list)));
    this.applyFilter();
    this.cdr.markForCheck();
  }

  private setRemarkLocally(id: number, remarks: string | null): void {
    const updateList = (list: Detail[]) =>
      list.map((item) => (item.Id === id ? { ...item, Remarks: remarks } : item));

    this.initialData.update((list) => this.sortDetails(updateList(list)));
    this.filteredData.update((list) => this.sortDetails(updateList(list)));
    this.applyFilter();
    this.cdr.markForCheck();
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
        const maxLimit = copy.OpenQuantity;
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
      const idx = arr.findIndex((d) => {
        const incomingDoc = (detailsIncoming as any).DocNum;
        if (incomingDoc && this.selectedBON() && incomingDoc !== this.selectedBON() && incomingDoc !== this.docnum()) {
          return false;
        }

        if (detailsIncoming.Id && detailsIncoming.Id > 0 && d.Id === detailsIncoming.Id) {
          return true;
        }
        if (detailsIncoming.DetailId && d.DetailId && d.DetailId === detailsIncoming.DetailId) {
          return true;
        }
        if (this.isReceh(d) && d.DetailId) {
          const detailIdList = d.DetailId.split(',').map((x) => x.trim());
          if (detailsIncoming.Id && detailIdList.includes(String(detailsIncoming.Id))) {
            return true;
          }
          if (detailsIncoming.DetailId && detailIdList.includes(String(detailsIncoming.DetailId))) {
            return true;
          }
        }
        if (
          incomingDoc &&
          (incomingDoc === this.selectedBON() || incomingDoc === this.docnum()) &&
          this.isReceh(d) &&
          this.isReceh(detailsIncoming)
        ) {
          return true;
        }
        return false;
      });
      if (idx !== -1) {
        const copy = [...arr];
        const currentItem = copy[idx];

        let resolvedRemarks: string | null = detailsIncoming.Remarks ?? null;

        // Jika HP ini sedang dalam proses simpan aktif untuk item ini, pertahankan PIC aktif
        if (this.isLoading(currentItem.Id) && this.isCurrentPicInRemarks(currentItem.Remarks)) {
          resolvedRemarks = this.mergeRemarks(detailsIncoming.Remarks, this.picName().trim().toUpperCase());
        } else if (detailsIncoming.Remarks === undefined) {
          // Jika server tidak mengirim field Remarks sama sekali, pertahankan nilai lokal
          resolvedRemarks = currentItem.Remarks ?? null;
        }

        if (this.isReceh(currentItem)) {
          copy[idx] = {
            ...currentItem,
            Remarks: resolvedRemarks,
          };
        } else {
          copy[idx] = {
            ...currentItem,
            ...detailsIncoming,
            Remarks: resolvedRemarks,
          };
        }
        return copy;
      }
      return arr;
    };
    this.initialData.set(this.sortDetails(updateIn(this.initialData())));
    this.filteredData.set(updateIn(this.filteredData()));
    this.setLoadingState(detailsIncoming.Id, false);
    this.applyFilter();
  }

  updateDetailsArray(detailsIncoming: Detail[]): void {
    detailsIncoming.forEach((d) => this.updateDetails(d));
  }

  getCardClass(item: Detail): string {
    if (this.isRecehWithoutAlias(item)) {
      return 'bg-gray-100 border-gray-300';
    }
    if (!this.isReceh(item)) {
      if (item.sebagianValue > 0 && item.sebagianValue !== item.OpenQuantity) {
        return 'bg-gray-100 border-gray-300';
      }
    }
    if (this.isCurrentPicInRemarks(item.Remarks)) {
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
      if (!this.isReceh(item) && this.isItemLoaded(item)) return false;
      const names = this.extractPicsFromRemarks(item.Remarks);
      return names.length > 1;
    });
  }

  checkRemarks(data: Detail[]): boolean {
    return data.every((item) => {
      if (!item.Remarks || !item.Remarks.trim()) return true;
      const names = this.extractPicsFromRemarks(item.Remarks);
      return names.length > 1;
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
