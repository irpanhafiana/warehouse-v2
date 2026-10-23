import { Component, ElementRef, viewChild, OnInit, OnDestroy, inject, DestroyRef, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  readonly isFilterAlphabet = signal(false);
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
  readonly expandedIndex = signal<number | null>(null);

  private notifyNewLoadingHandler = (salesInvoiceModel: string): void => {
    try {
      const parsed = typeof salesInvoiceModel === 'string' ? JSON.parse(salesInvoiceModel) : salesInvoiceModel;
      const target = Array.isArray(parsed) ? parsed[0] : parsed;
      if (target) {
        this.updateDetails(target);
      }
    } catch (e) {
      console.error('SignalR notifyNewLoading parse error:', e);
    }
  };

  private notifyAdditionalInvoiceHandler = (salesInvoiceModel: string): void => {
    try {
      const parsed = typeof salesInvoiceModel === 'string' ? JSON.parse(salesInvoiceModel) : salesInvoiceModel;
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

    this.getNotPickedItem();
    this.getDetailByCustomerCode(dateVal, docnumVal);
    this.getLoadingDetail(bonVal ? bonVal : docnumVal);
    this.getPickingPicList();

    this.signalrService.on('NotifyNewLoading', this.notifyNewLoadingHandler);
    this.signalrService.on('NotifyAdditionalInvoice', this.notifyAdditionalInvoiceHandler);
    this.signalrService.on('NotifyNewReturn', this.notifyNewReturnHandler);

    this.signalrService.reconnected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onRefresh(true));
  }

  ngOnDestroy(): void {
    this.signalrService.off('NotifyNewLoading', this.notifyNewLoadingHandler);
    this.signalrService.off('NotifyAdditionalInvoice', this.notifyAdditionalInvoiceHandler);
    this.signalrService.off('NotifyNewReturn', this.notifyNewReturnHandler);
  }

  getDetailByCustomerCode(dateString: string, customerCode: string, silent = false): void {
    if (!silent) {
      this.loadingBonBaru.set(true);
    }
    this.loadingService
      .getLoadingDetailByCustomerCode(dateString, customerCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: HeaderRes[]) => {
          if (!silent) {
            this.loadingBonBaru.set(false);
          }
          const sorted = [...(data || [])].sort((a, b) => {
            const dateCompare = (b.DocDate || '').localeCompare(a.DocDate || '');
            if (dateCompare !== 0) return dateCompare;
            return (b.DocNum || '').localeCompare(a.DocNum || '');
          });
          this.listBON.set(sorted);
          this.cdr.markForCheck();
        },
        error: () => {
          if (!silent) {
            this.loadingBonBaru.set(false);
          }
          this.cdr.markForCheck();
        },
      });
  }

  getLoadingDetail(docnum: string, index?: number, silent = false): void {
    this.selectedBON.set(docnum);
    if (index !== undefined) {
      this.toggleText(index);
    }

    if (!silent) {
      this.loading.set(true);
    }
    this.loadingService
      .getLoadingDetail(docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: SalesInvoicesModel) => {
          if (!silent) {
            this.loading.set(false);
          }
          (data.Details || []).forEach((element) => {
            element.isDone = false;
            element.isSebagian = false;
            element.sebagianValue = 0;
          });

          this.salesInvoice.set(data);
          this.initialData.set(data.Details || []);

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
            this.loading.set(false);
            this.isErrorUnknown.set(true);
            this.toastr.error('Silahkan cek item yang belum di pick', 'Peringatan');
          }
          this.cdr.markForCheck();
        },
        complete: () => {
          this.getPickingPicList();
          this.getNotPickedItem();
          this.getRecehExist();
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

  getNotPickedItem(): void {
    this.loadingService
      .getCheckItemNotPicked(this.selectedBON())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count: number) => {
          this.notPickedItem.set(count);
          if (count > 0) {
            this.isBonNotFinishPick.set(true);
          }
          this.cdr.markForCheck();
        },
      });
  }

  getRecehExist(): void {
    this.loadingService
      .getCheckReceh(this.selectedBON())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (exists: boolean) => {
          this.isRecehExist.set(exists);
          this.cdr.markForCheck();
        },
      });
  }

  applyFilter(): void {
    let result = this.filteredProducts(this.initialData());
    if (result.length === 0 && !this.selectedAlphabet()) {
      result = this.sortDetails(this.initialData());
    }
    this.filteredData.set(result);
    this.cdr.markForCheck();
  }

  filteredProducts(detail: Detail[]): Detail[] {
    const products = (detail || []).map((product) => ({
      ...product,
      ProductModel: {
        ...product.ProductModel,
        Name: product.ProductModel?.Name?.replace(/^~+/, '').trim() || '',
      },
    }));

    if (!this.selectedAlphabet()) {
      return this.sortDetails(products);
    }

    const filtered = products.filter((product) =>
      product.ProductModel?.Name?.toLowerCase().startsWith(this.selectedAlphabet().toLowerCase())
    );

    return this.sortDetails(filtered);
  }

  sortDetails(details: Detail[]): Detail[] {
    return [...details].sort((a, b) => {
      const aDone = this.isItemComplete(a);
      const bDone = this.isItemComplete(b);
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    });
  }

  isItemComplete(item: Detail): boolean {
    if (this.isItemLoaded(item)) return true;
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
    return this.itemLoaded().some((loadedItem) => loadedItem.Id === item.Id);
  }

  onRemarkDone(id: number, remarks: string, detailId: string, detail: Detail): void {
    if (this.isLoading(id)) return;
    this.setLoadingState(id, true);

    if (detail.sebagianValue > 0 && detail.sebagianValue !== detail.OpenQuantity) {
      this.isErrorPicSebagian.set(true);
      this.msgError.set('Jumlah yang masuk baru sebagian, tolong periksa kembali!');
      this.setLoadingState(id, false);
      return;
    }

    if (!this.picName()) {
      this.isErrorPicSebagian.set(true);
      this.msgError.set('PIC belum dipilih, silahkan pilih PIC terlebih dahulu sebelum melanjutkan loading!');
      this.setLoadingState(id, false);
      return;
    }

    const isRecehItem =
      (detail.ProductModel?.Name || '').trim().toUpperCase() === 'RECEH' ||
      (detail.ProductModel?.Description || '').trim().toUpperCase() === 'RECEH';

    if (isRecehItem) {
      this.loadingService
        .getCheckReceh(this.selectedBON())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (exists: boolean) => {
            this.isRecehExist.set(exists);
            if (this.isRecehExist()) {
              this.setLoadingState(id, false);
              return;
            }
            this.executeSaveRemarkDone(id, detailId);
          },
          error: (e) => {
            console.error('Check receh error before loading:', e);
            this.executeSaveRemarkDone(id, detailId);
          },
        });
      return;
    }

    this.executeSaveRemarkDone(id, detailId);
  }

  private executeSaveRemarkDone(id: number, detailId: string): void {
    const savePayload = {
      PIC: [this.picName()],
      DetailId: !detailId || detailId.trim() === '' ? [Number(id)] : detailId.split(',').map(Number),
      DocNum: this.selectedBON() || '',
    };

    this.service
      .putLoadingListDetails(savePayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(id, false);
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
        if (copy.sebagianValue < copy.OpenQuantity) copy.sebagianValue++;
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
    this.cdr.markForCheck();
  }

  updateDetails(detailsIncoming: Detail): void {
    const updateIn = (arr: Detail[]) => {
      const idx = arr.findIndex((d) => (detailsIncoming.Id ? d.Id === detailsIncoming.Id : d.DetailId === detailsIncoming.DetailId));
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
    const remarkNames = item.Remarks
      ? item.Remarks.replace('load by: ', '')
        .split(',')
        .map((name: string) => name.trim())
        .filter(Boolean)
      : [];

    if (item.sebagianValue > 0 && item.sebagianValue !== item.OpenQuantity) {
      return 'bg-gray-100 border-gray-300';
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
      if (this.isItemLoaded(item)) return false;
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

  onBack(): void {
    this.location.back();
  }

  onRefresh(silent = false): void {
    this.getDetailByCustomerCode(this.dateString(), this.docnum(), silent);
    this.getLoadingDetail(this.selectedBON(), undefined, silent);
  }

  toCheckout(docnum: string): void {
    void this.router.navigate(['/main/checkout/detail', docnum || this.docnum()]);
  }

  async toPickingDetail(docnum: string): Promise<void> {
    await this.storageService.set('selectedTab', 'non-receh');
    void this.router.navigate(['/main/picking/checklist', docnum, this.dateString()]);
  }
}
