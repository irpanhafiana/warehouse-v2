import { ChangeDetectorRef, Component, DestroyRef, OnDestroy, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { QRCodeComponent } from 'angularx-qrcode';
import { Detail, HeaderRes, SalesInvoicesModel } from '../../../../core/models';
import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { SignalrService, parseSignalRPayload } from '../../../../core/services/signalr.service';
import { StorageService, STORAGE_KEYS } from '../../../../core/services/storage.service';
import { DialogSetPicComponent, LoaderComponent } from '../../../../shared/components';
import { ReqTransLoadingService } from '../../services/reqtrans-loading.service';

@Component({
  selector: 'app-reqtrans-loading-checklist',
  imports: [
    CommonModule,
    FormsModule,
    LoaderComponent,
    QRCodeComponent,
    DialogSetPicComponent,
  ],
  templateUrl: './reqtrans-loading-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReqtransLoadingChecklistComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private toastr = inject(ToastrService);
  private loadingService = inject(ReqTransLoadingService);
  private salesInvoiceService = inject(SalesInvoiceService);
  private signalRService = inject(SignalrService);
  private storage = inject(StorageService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  salesInvoice: SalesInvoicesModel | null = null;
  initialData: Detail[] = [];
  filteredData: Detail[] = [];

  customerCodeParam: string = '';
  docnum: string = '';
  dateString: string = '';
  selectedBON: string = '';

  picName: string = '';
  selectedAlphabet: string = '';
  msgError: string = '';
  QRCodes: string = '';
  notPickedItem: number = 0;

  isDialogAddPic: boolean = false;
  isDialogConfirmKeluar: boolean = false;
  isDialogOpenBarcode: boolean = false;
  isFilterAlphabet: boolean = false;
  isErrorPicSebagian: boolean = false;
  isBonNotFinishPick: boolean = false;
  isRecehExist: boolean = false;
  isShowMenu: boolean = false;
  loading: boolean = false;

  pickingPic: string[] = [];
  alphabet: string[] = [];
  listBON: any[] = [];
  loadingStates: { [key: number]: boolean } = {};
  itemLoaded: any[] = [];

  private notifyNewLoadingHandler = (data: string): void => {
    const parsed = parseSignalRPayload<Detail | Detail[]>(data);
    const detail = Array.isArray(parsed) ? parsed[0] : parsed;
    if (detail) {
      this.updateDetails(detail);
    }
  };

  private notifyAdditionalInvoiceHandler = (data: string): void => {
    const newBon = parseSignalRPayload<HeaderRes>(data);
    this.getDetailByCustomerCode(this.dateString, this.customerCodeParam);
    this.toastr.success(`BON baru dari: ${newBon?.Name || ''}`, 'Success');
  };

  private notifyNewReturnHandler = (data: string): void => {
    const parsed = parseSignalRPayload<Detail[]>(data);
    if (Array.isArray(parsed)) {
      this.updateDetailsArray(parsed);
    }
  };

  constructor() {
    this.customerCodeParam = this.route.snapshot.params['customerCode'] || '';
    this.dateString = this.route.snapshot.params['date'] || '';
    this.selectedBON = this.route.snapshot.params['docnum'] || '';
    this.docnum = this.customerCodeParam;

    const host = window.location.host;
    this.QRCodes = `http://${host}/checkToken/${this.customerCodeParam}/${this.dateString}`;
  }

  async ngOnInit(): Promise<void> {
    const cachedPic = await this.storage.getItem(STORAGE_KEYS.PHONE_NAME);
    if (cachedPic) {
      this.picName = cachedPic.toUpperCase();
    }

    this.getNotPickedItem();
    this.getRecehExist();
    this.getDetailByCustomerCode(this.dateString, this.customerCodeParam);
    this.getLoadingDetail(this.selectedBON || this.customerCodeParam);

    this.signalRService.on('NotifyNewDeliveryLoading', this.notifyNewLoadingHandler);
    this.signalRService.on('NotifyAdditionalInvoice', this.notifyAdditionalInvoiceHandler);
    this.signalRService.on('NotifyNewReturn', this.notifyNewReturnHandler);

    this.signalRService.reconnected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onRefresh());
  }

  ngOnDestroy(): void {
    this.signalRService.off('NotifyNewDeliveryLoading', this.notifyNewLoadingHandler);
    this.signalRService.off('NotifyAdditionalInvoice', this.notifyAdditionalInvoiceHandler);
    this.signalRService.off('NotifyNewReturn', this.notifyNewReturnHandler);
  }

  getDetailByCustomerCode(dateString: string, customerCode: string): void {
    this.loadingService
      .getLoadingDetailByCustomerCode(dateString, customerCode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.listBON = (data || []).sort((a: any, b: any) => {
            const dateCompare = (b.DocDate || '').localeCompare(a.DocDate || '');
            if (dateCompare !== 0) return dateCompare;
            return (b.DocNum || '').localeCompare(a.DocNum || '');
          });
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get loading detail by customer code error:', e);
          this.cdr.markForCheck();
        },
      });
  }

  getLoadingDetail(docnum: string, index?: number): void {
    this.selectedBON = docnum;
    this.loading = true;
    this.cdr.markForCheck();

    this.getPickingPicList();
    this.getNotPickedItem();
    this.getRecehExist();

    this.loadingService
      .getLoadingDetail(docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: SalesInvoicesModel) => {
          this.loading = false;
          data?.Details?.forEach((element: any) => {
            element.isDone = false;
            element.isSebagian = false;
            element.sebagianValue = 0;
          });

          this.salesInvoice = data;
          this.initialData = data?.Details || [];
          this.createAlphabetList(this.initialData);
          this.applyFilter();
          this.getCheckBON(this.selectedBON);
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Get loading detail error:', e);
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  getPickingPicList(): void {
    this.salesInvoiceService
      .getPickingPicList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pickingPic = (data || []).sort((a, b) => a.localeCompare(b));
          if (!this.picName && this.pickingPic.length > 0) {
            this.picName = this.pickingPic[0];
          }
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get picking PIC list warning:', e);
          this.cdr.markForCheck();
        },
      });
  }

  getCheckBON(docnum: string): void {
    this.loadingService
      .getDeliveredItems(docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.itemLoaded = [];
          data?.forEach((element: any) => {
            element?.Details?.forEach((el: any) => {
              try {
                this.itemLoaded.push({
                  id: el.Id,
                  data: JSON.parse(el.Data),
                });
              } catch {
                this.itemLoaded.push({ id: el.Id, data: el.Data });
              }
            });
          });
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get check BON warning:', e);
          this.cdr.markForCheck();
        },
      });
  }

  getNotPickedItem(): void {
    if (!this.selectedBON) return;
    this.loadingService
      .getCheckItemNotPicked(this.selectedBON)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.notPickedItem = Number(data) || 0;
          if (this.notPickedItem > 0) {
            this.isBonNotFinishPick = true;
          }
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get not picked item warning:', e);
          this.cdr.markForCheck();
        },
      });
  }

  getRecehExist(): void {
    if (!this.selectedBON) return;
    this.loadingService
      .getCheckReceh(this.selectedBON)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.isRecehExist = Boolean(data);
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get receh exist warning:', e);
          this.cdr.markForCheck();
        },
      });
  }

  createAlphabetList(details: Detail[]): void {
    const letters = Array.from(
      new Set(
        details
          .map((item) => {
            const name = item.ProductModel?.Name?.trim() || '';
            if (!name) return '';
            const char = name.startsWith('~') ? name.charAt(1) : name.charAt(0);
            return char.toUpperCase();
          })
          .filter(Boolean)
      )
    );
    this.alphabet = letters.sort((a, b) => a.localeCompare(b));
  }

  applyFilter(): void {
    const storedData = JSON.parse(localStorage.getItem(this.selectedBON) || '[]');

    this.filteredData = this.initialData
      .map((product) => {
        const storedItem = storedData.find((s: any) => s.id === product.Id);
        return {
          ...product,
          sebagianValue: storedItem?.sebagianValue ?? product.sebagianValue ?? 0,
          ProductModel: {
            ...product.ProductModel,
            Name: product.ProductModel?.Name?.replace(/^~+/, '').trim() || '',
          },
        };
      })
      .filter((product) => {
        if (!this.selectedAlphabet) return true;
        return product.ProductModel?.Name?.toLowerCase().startsWith(
          this.selectedAlphabet.toLowerCase()
        );
      });

    if (this.filteredData.length === 0 && !this.selectedAlphabet) {
      this.filteredData = this.initialData;
    }
    this.cdr.markForCheck();
  }

  updateDetails(detailIncoming: Detail): void {
    const updateInArr = (arr: Detail[]): void => {
      const item = arr.find((d) => d.Id === detailIncoming.Id);
      if (item) {
        Object.assign(item, detailIncoming);
      }
    };
    updateInArr(this.initialData);
    updateInArr(this.filteredData);
    this.setLoadingState(detailIncoming.Id, false);
    this.cdr.markForCheck();
  }

  updateDetailsArray(updates: Detail[]): void {
    updates.forEach((item) => this.updateDetails(item));
  }

  onRemarkDone(id: number, remarks: string, detailId: string, detail: Detail): void {
    if (detail.OpenQuantity === 0 || this.isLoading(id)) return;

    if (detail.sebagianValue > 0 && detail.sebagianValue !== detail.OpenQuantity) {
      this.isErrorPicSebagian = true;
      this.msgError = 'Jumlah yang masuk baru sebagian, tolong periksa kembali!';
      return;
    }

    if (!this.picName) {
      this.isErrorPicSebagian = true;
      this.msgError = 'PIC belum dipilih, silahkan pilih PIC terlebih dahulu sebelum melanjutkan loading!';
      return;
    }

    this.setLoadingState(id, true);

    const isRecehItem =
      (detail.ProductModel?.Name || '').trim().toUpperCase() === 'RECEH' ||
      (detail.ProductModel?.Description || '').trim().toUpperCase() === 'RECEH';

    if (isRecehItem) {
      this.loadingService
        .getCheckReceh(this.selectedBON)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (data) => {
            this.isRecehExist = Boolean(data);
            this.cdr.markForCheck();

            if (this.isRecehExist) {
              this.setLoadingState(id, false);
              return;
            }

            this.executeSaveRemarkDone(id, detail);
          },
          error: (e) => {
            console.error('Check receh error before loading:', e);
            this.executeSaveRemarkDone(id, detail);
          },
        });
      return;
    }

    this.executeSaveRemarkDone(id, detail);
  }

  private executeSaveRemarkDone(id: number, detail: Detail): void {
    const qty = detail.sebagianValue > 0 ? detail.sebagianValue : detail.OpenQuantity;

    const payload = {
      PIC: [this.picName],
      DetailId: [Number(id)],
      Details: [
        {
          ItemCode: detail.ProductModel.Code,
          UoMCode: detail.UoMModel.Code,
          Quantity: qty,
          BaseQuantity: detail.BaseQuantity,
        },
      ],
      DocNum: this.selectedBON || '',
    };

    this.loadingService
      .putLoadingListDetails(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(id, false);
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Remark done error:', e);
          this.isErrorPicSebagian = true;
          this.msgError = 'Gagal menyimpan data loading. Silahkan periksa koneksi.';
          this.setLoadingState(id, false);
          this.cdr.markForCheck();
        },
      });
  }

  onCancel(id: number): void {
    if (!this.picName) {
      this.isErrorPicSebagian = true;
      this.msgError = 'PIC belum dipilih, silahkan pilih PIC terlebih dahulu sebelum membatalkan!';
      this.cdr.markForCheck();
      return;
    }

    if (this.isLoading(id)) return;
    this.setLoadingState(id, true);
    const payload = {
      DetailId: id,
      PIC: this.picName,
    };

    this.loadingService
      .putLoadingCancel(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(id, false);
          localStorage.removeItem(this.docnum);
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Cancel loading item error:', e);
          this.setLoadingState(id, false);
          this.cdr.markForCheck();
        },
      });
  }

  onSebagianValueChange(indicator: '+' | '-', id: number): void {
    const itemInFiltered = this.filteredData.find((i) => i.Id === id);
    const itemInInitial = this.initialData.find((i) => i.Id === id);

    if (!itemInFiltered || !itemInInitial) return;

    if (itemInFiltered.sebagianValue === undefined) {
      itemInFiltered.sebagianValue = 0;
      itemInInitial.sebagianValue = 0;
    }

    const maxQty = Number((itemInFiltered.OpenQuantity || 0) + (itemInFiltered.Quantity || 0));

    if (indicator === '-') {
      if (itemInFiltered.sebagianValue > 0) {
        itemInFiltered.sebagianValue--;
        itemInInitial.sebagianValue--;
      }
    } else if (indicator === '+') {
      if (itemInFiltered.sebagianValue < maxQty) {
        itemInFiltered.sebagianValue++;
        itemInInitial.sebagianValue++;
      }
    }

    const storedData = JSON.parse(localStorage.getItem(this.selectedBON) || '[]');
    const existing = storedData.find((s: any) => s.id === id);
    if (existing) {
      existing.sebagianValue = itemInFiltered.sebagianValue;
    } else {
      storedData.push({ id, sebagianValue: itemInFiltered.sebagianValue });
    }
    localStorage.setItem(this.selectedBON, JSON.stringify(storedData));
    this.cdr.markForCheck();
  }

  onOptionSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.picName = target.value;
    void this.storage.setItem(STORAGE_KEYS.PHONE_NAME, this.picName);
  }

  onPicSelectedFromModal(pic: string): void {
    this.picName = pic.toUpperCase();
    this.isDialogAddPic = false;
    void this.storage.setItem(STORAGE_KEYS.PHONE_NAME, this.picName);
    if (!this.pickingPic.includes(this.picName)) {
      this.pickingPic.push(this.picName);
    }
    this.cdr.markForCheck();
  }

  onSelectedAlphabet(char: string): void {
    this.selectedAlphabet = char === '~' ? '' : char;
    this.applyFilter();
  }

  getCardClass(item: any): string {
    const remarkNames = item.Remarks
      ? item.Remarks.replace('load by: ', '')
        .split(',')
        .map((n: string) => n.trim())
        .filter(Boolean)
      : [];

    if (item.sebagianValue > 0 && item.sebagianValue !== item.Quantity) {
      return 'bg-gray-200 border-gray-400';
    }
    if (remarkNames.includes(this.picName)) {
      return 'bg-green-100 border-green-500';
    }
    if (item.Remarks) {
      return 'bg-orange-100 border-orange-400';
    }
    return 'bg-white border-gray-300';
  }

  isItemLoaded(item: any): boolean {
    return this.itemLoaded.some((loadedItem) => loadedItem.id === item.Id);
  }

  setLoadingState(itemId: number, state: boolean): void {
    this.loadingStates[itemId] = state;
    this.cdr.markForCheck();
  }

  isLoading(itemId: number): boolean {
    return Boolean(this.loadingStates[itemId]);
  }

  toAddDelivery(): void {
    if (!this.salesInvoice) return;
    const validData = this.filterValidRemarks(this.filteredData);
    localStorage.setItem(`GOODSREQTRANS${this.selectedBON}`, JSON.stringify(validData));

    void this.router.navigate([
      '/main-reqtrans/goods-delivery/add-to-delivery',
      this.selectedBON,
      this.salesInvoice.CustomerModel?.Code || '',
    ]);
  }

  private filterValidRemarks(data: Detail[]): Detail[] {
    return data.filter((item) => {
      const isFullyLoaded = this.itemLoaded.some(
        (loaded) => loaded.id === item.Id && loaded.OpenQuantity === 0
      );
      if (isFullyLoaded) return false;

      const match = item.Remarks?.match(/load by:\s*([\w\s,]+)/i);
      if (!match) return false;

      const names = match[1]
        .split(',')
        .map((n: string) => n.trim())
        .filter(Boolean);

      return names.length > 1;
    });
  }

  toCheckout(docnum: string): void {
    void this.router.navigate(['/main/checkout/detail', docnum || this.docnum]);
  }

  toPickingDetail(docnum: string): void {
    localStorage.setItem('selectedTab', 'non-receh');
    void this.router.navigate(['/main-reqtrans/picking/checklist', docnum, this.dateString]);
  }

  onBack(): void {
    this.isDialogConfirmKeluar = false;
    this.location.back();
  }

  onRefresh(): void {
    this.getDetailByCustomerCode(this.dateString, this.customerCodeParam);
    this.getLoadingDetail(this.selectedBON);
  }
}

