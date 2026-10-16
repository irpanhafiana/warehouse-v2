import { Component, ElementRef, viewChild, OnInit, OnDestroy, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
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
    TruncatePipe
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

  salesInvoice?: SalesInvoicesModel;
  initialData: Detail[] = [];
  filteredData: Detail[] = [];
  newBon?: HeaderRes;

  docnum = '';
  picName = '';
  selectedAlphabet = '';
  msgError = '';
  qrCodeUrl = '';
  dateString = '';
  selectedBON = '';

  notPickedItem = 0;
  loading = false;
  loadingBonBaru = true;
  isManualRefresh = false;

  isDialogAddPic = false;
  isDialogConfirmKeluar = false;
  isDialogOpenBarcode = false;
  isFilterAlphabet = false;
  isErrorPicSebagian = false;
  isBonNotFinishPick = false;
  isRecehExist = false;
  isErrorUnknown = false;
  isShowMenu = false;

  pickingPic: string[] = [];
  alphabet: string[] = [];
  listBON: HeaderRes[] = [];
  loadingStates: { [key: number]: boolean } = {};
  itemLoaded: any[] = [];
  expandedIndex: number | null = null;

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
      this.newBon = typeof salesInvoiceModel === 'string' ? JSON.parse(salesInvoiceModel) : salesInvoiceModel;
      this.getDetailByCustomerCode(this.dateString, this.docnum);
      if (this.newBon?.Name) {
        this.toastr.success(`BON baru dari: ${this.newBon.Name}`, 'Success');
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
    this.docnum = this.route.snapshot.params['customerCode'] || '';
    this.dateString = this.route.snapshot.params['date'] || '';
    this.selectedBON = this.route.snapshot.params['docnum'] || '';
    this.loadingService.setDocnumSubject(this.docnum);

    const host = window.location.host;
    this.qrCodeUrl = `http://${host}/checkToken/${this.docnum}/${this.dateString}`;

    const savedPhoneName = await this.storageService.get('phoneName');
    if (savedPhoneName) {
      this.picName = savedPhoneName;
    }

    this.getNotPickedItem();
    this.getDetailByCustomerCode(this.dateString, this.docnum);
    this.getLoadingDetail(this.selectedBON ? this.selectedBON : this.docnum);
    this.getPickingPicList();

    this.signalrService.on('NotifyNewLoading', this.notifyNewLoadingHandler);
    this.signalrService.on('NotifyAdditionalInvoice', this.notifyAdditionalInvoiceHandler);
    this.signalrService.on('NotifyNewReturn', this.notifyNewReturnHandler);

    this.signalrService.reconnected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onRefresh());
  }

  ngOnDestroy(): void {
    this.signalrService.off('NotifyNewLoading', this.notifyNewLoadingHandler);
    this.signalrService.off('NotifyAdditionalInvoice', this.notifyAdditionalInvoiceHandler);
    this.signalrService.off('NotifyNewReturn', this.notifyNewReturnHandler);
  }

  getDetailByCustomerCode(dateString: string, customerCode: string): void {
    this.loadingBonBaru = true;
    this.loadingService
      .getLoadingDetailByCustomerCode(dateString, customerCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: HeaderRes[]) => {
          this.loadingBonBaru = false;
          this.listBON = [...(data || [])].sort((a, b) => {
            const dateCompare = (b.DocDate || '').localeCompare(a.DocDate || '');
            if (dateCompare !== 0) return dateCompare;
            return (b.DocNum || '').localeCompare(a.DocNum || '');
          });
        },
        error: () => {
          this.loadingBonBaru = false;
        },
      });
  }

  getLoadingDetail(docnum: string, index?: number): void {
    this.selectedBON = docnum;
    if (index !== undefined) {
      this.toggleText(index);
    }

    this.loading = true;
    this.loadingService
      .getLoadingDetail(docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: SalesInvoicesModel) => {
          this.loading = false;
          (data.Details || []).forEach((element) => {
            element.isDone = false;
            element.isSebagian = false;
            element.sebagianValue = 0;
          });

          this.salesInvoice = data;
          this.initialData = data.Details || [];

          const initials = Array.from(
            new Set(
              this.initialData
                .map((product) => {
                  const name = (product.ProductModel?.Name || '').trim();
                  if (!name) return '';
                  return name.startsWith('~') ? name.charAt(1).toUpperCase() : name.charAt(0).toUpperCase();
                })
                .filter(Boolean)
            )
          );
          this.alphabet = initials.sort((a, b) => a.localeCompare(b));
          this.applyFilter();
        },
        error: () => {
          this.loading = false;
          this.isErrorUnknown = true;
          this.toastr.error('Silahkan cek item yang belum di pick', 'Peringatan');
          void this.router.navigate(['/main/picking/checklist', this.docnum, this.dateString]);
        },
        complete: () => {
          this.getPickingPicList();
          this.getNotPickedItem();
          this.getRecehExist();
          this.getCheckBON(this.selectedBON);
        },
      });
  }

  getCheckBON(docnum: string): void {
    this.goodsDeliveryService
      .getCheckBON(docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.itemLoaded = [];
          (data || []).forEach((element: any) => {
            (element.Details || []).forEach((el: any) => {
              try {
                this.itemLoaded.push(JSON.parse(el.Data));
              } catch {
                // Ignore parse errors
              }
            });
          });
          this.applyFilter();
        },
      });
  }

  getPickingPicList(): void {
    this.service
      .getPickingPicList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: string[]) => {
          this.pickingPic = [...(data || [])].sort((a, b) => a.localeCompare(b));
          if (!this.picName && this.pickingPic.length > 0) {
            this.picName = this.pickingPic[0];
          }
        },
      });
  }

  getNotPickedItem(): void {
    this.loadingService
      .getCheckItemNotPicked(this.selectedBON)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (count: number) => {
          this.notPickedItem = count;
          if (this.notPickedItem > 0) {
            this.isBonNotFinishPick = true;
          }
        },
      });
  }

  getRecehExist(): void {
    this.loadingService
      .getCheckReceh(this.selectedBON)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (exists: boolean) => {
          this.isRecehExist = exists;
        },
      });
  }

  applyFilter(): void {
    this.filteredData = this.filteredProducts(this.initialData);
    if (this.filteredData.length === 0 && !this.selectedAlphabet) {
      this.filteredData = this.sortDetails(this.initialData);
    }
  }

  filteredProducts(detail: Detail[]): Detail[] {
    const products = (detail || []).map((product) => ({
      ...product,
      ProductModel: {
        ...product.ProductModel,
        Name: product.ProductModel?.Name?.replace(/^~+/, '').trim() || '',
      },
    }));

    if (!this.selectedAlphabet) {
      return this.sortDetails(products);
    }

    const filtered = products.filter((product) =>
      product.ProductModel?.Name?.toLowerCase().startsWith(this.selectedAlphabet.toLowerCase())
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
    return this.itemLoaded.some((loadedItem) => loadedItem.Id === item.Id);
  }

  onRemarkDone(id: number, remarks: string, detailId: string, detail: Detail): void {
    if (this.isLoading(id)) return;
    this.setLoadingState(id, true);

    if (detail.sebagianValue > 0 && detail.sebagianValue !== detail.OpenQuantity) {
      this.isErrorPicSebagian = true;
      this.msgError = 'Jumlah yang masuk baru sebagian, tolong periksa kembali!';
      this.setLoadingState(id, false);
      return;
    }

    if (!this.picName) {
      this.isErrorPicSebagian = true;
      this.msgError = 'PIC belum dipilih, silahkan pilih PIC terlebih dahulu sebelum melanjutkan loading!';
      this.setLoadingState(id, false);
      return;
    }

    const isRecehItem =
      (detail.ProductModel?.Name || '').trim().toUpperCase() === 'RECEH' ||
      (detail.ProductModel?.Description || '').trim().toUpperCase() === 'RECEH';

    if (isRecehItem) {
      this.loadingService
        .getCheckReceh(this.selectedBON)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (exists: boolean) => {
            this.isRecehExist = exists;
            if (this.isRecehExist) {
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
      PIC: [this.picName],
      DetailId: !detailId || detailId.trim() === '' ? [Number(id)] : detailId.split(',').map(Number),
      DocNum: this.selectedBON || '',
    };

    this.service
      .putLoadingListDetails(savePayload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(id, false);
        },
        error: () => {
          this.isErrorPicSebagian = true;
          this.msgError = 'Terjadi kesalahan saat menyimpan checklist loading.';
          this.setLoadingState(id, false);
        },
      });
  }

  onCancel(id: number): void {
    if (this.isLoading(id)) return;

    if (!this.picName) {
      this.isErrorPicSebagian = true;
      this.msgError = 'PIC belum dipilih, silahkan pilih PIC terlebih dahulu!';
      return;
    }

    this.setLoadingState(id, true);

    const payload = {
      DetailId: id,
      PIC: this.picName,
      DocNum: this.selectedBON,
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
    const item = this.filteredData.find((i) => i.Id === id);
    if (!item) return;

    if (item.sebagianValue === undefined) {
      item.sebagianValue = 0;
    }

    if (indicator === '-') {
      if (item.sebagianValue > 0) item.sebagianValue--;
    } else if (indicator === '+') {
      if (item.sebagianValue < item.OpenQuantity) item.sebagianValue++;
    }

    // Sinkronkan ke initialData agar tidak ter-reset saat applyFilter() dipicu event SignalR
    const source = this.initialData.find((i) => i.Id === id);
    if (source) {
      source.sebagianValue = item.sebagianValue;
    }
  }

  updateDetails(detailsIncoming: Detail): void {
    const updateIn = (arr: Detail[]) => {
      const idx = arr.findIndex((d) => (detailsIncoming.Id ? d.Id === detailsIncoming.Id : d.DetailId === detailsIncoming.DetailId));
      if (idx !== -1) {
        arr[idx] = { ...arr[idx], ...detailsIncoming };
      }
    };
    updateIn(this.initialData);
    updateIn(this.filteredData);
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
    if (remarkNames.includes(this.picName)) {
      return 'bg-emerald-300 border-emerald-400';
    }
    if (item.Remarks) {
      return 'bg-amber-200 border-amber-300';
    }
    return 'bg-white border-gray-200';
  }

  async toAddDelivery(): Promise<void> {
    if (this.checkRemarks(this.filteredData)) {
      await this.storageService.set(
        `GOODS${this.selectedBON}`,
        JSON.stringify(this.filterValidRemarks(this.filteredData))
      );
      void this.router.navigate(['/main/loading/add-to-delivery', this.selectedBON]);
    } else {
      this.isErrorPicSebagian = true;
      this.msgError = 'Ada Item/Produk yang belum di klik berdua, Mohon cek kembali';
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
    this.picName = select.value;
    void this.storageService.set('picLoading', select.value);
  }

  onAddPicFromDialog(newPic: string): void {
    const formatted = newPic.toUpperCase().trim();
    if (formatted && !this.pickingPic.includes(formatted)) {
      this.pickingPic = [formatted, ...this.pickingPic];
    }
    this.picName = formatted;
    void this.storageService.set('picLoading', formatted);
    this.isDialogAddPic = false;
  }

  onSelectedAlphabet(char: string): void {
    this.selectedAlphabet = char === '~' ? '' : char;
    this.applyFilter();
  }

  toggleText(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  setLoadingState(itemId: number, state: boolean): void {
    this.loadingStates[itemId] = state;
  }

  isLoading(itemId: number): boolean {
    return this.loadingStates[itemId] || false;
  }

  onBack(): void {
    this.location.back();
  }

  onRefresh(): void {
    this.getDetailByCustomerCode(this.dateString, this.docnum);
    this.getLoadingDetail(this.selectedBON);
  }

  toCheckout(docnum: string): void {
    void this.router.navigate(['/main/checkout/detail', docnum || this.docnum]);
  }

  async toPickingDetail(docnum: string): Promise<void> {
    await this.storageService.set('selectedTab', 'non-receh');
    void this.router.navigate(['/main/picking/checklist', docnum, this.dateString]);
  }
}

