import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectorRef,
  DestroyRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { QRCodeComponent } from 'angularx-qrcode';
import { Inventory, InventoryDetail } from '../../../../core/models';
import { SignalrService, parseSignalRPayload } from '../../../../core/services/signalr.service';
import { StorageService, STORAGE_KEYS } from '../../../../core/services/storage.service';
import { DialogSetPicComponent, LoaderComponent } from '../../../../shared/components';
import { RequestReceiveService } from '../../services/request-receive.service';

@Component({
  selector: 'app-request-receive-checklist',
  imports: [
    CommonModule,
    FormsModule,
    QRCodeComponent,
    LoaderComponent,
    DialogSetPicComponent,
  ],
  templateUrl: './request-receive-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestReceiveChecklistComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private service = inject(RequestReceiveService);
  private toastr = inject(ToastrService);
  private signalRService = inject(SignalrService);
  private storage = inject(StorageService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);

  docnum: string = '';
  selectedBON: string = '';
  inventoryRequest?: Inventory;
  loading: boolean = false;
  isFilterAlphabet: boolean = false;
  filteredData: InventoryDetail[] = [];
  initialData: InventoryDetail[] = [];
  loadingStates: { [key: number]: boolean } = {};
  selectedAlphabet: string = '';
  alphabet: string[] = [];

  isDialogAddPic: boolean = false;
  isDialogOpenBarcode: boolean = false;
  isContra: boolean = false;
  isErrorPicSebagian: boolean = false;
  msgError: string = '';

  picName: string = '';
  pickingPic: string[] = [];
  QRCodes: string = '';

  private notifyNewReceiveLoadingHandler = (salesInvoiceModel: string): void => {
    const parsed = parseSignalRPayload<InventoryDetail | InventoryDetail[]>(salesInvoiceModel);
    const detail = Array.isArray(parsed) ? parsed[0] : parsed;
    if (detail) {
      this.updateDetails(detail);
    }
  };

  constructor() {
    this.docnum = this.route.snapshot.params['docnum'] || '';
    this.selectedBON = this.docnum;
    const host = window.location.host;
    this.QRCodes = `http://${host}/checkToken/${this.docnum}`;
  }

  ngOnInit(): void {
    this.initPic();
    this.fetchRequestReceiveChecklist();
    this.signalRService.on('NotifyNewReceiveLoading', this.notifyNewReceiveLoadingHandler);

    this.signalRService.reconnected$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.fetchRequestReceiveChecklist());
  }

  ngOnDestroy(): void {
    this.signalRService.off('NotifyNewReceiveLoading', this.notifyNewReceiveLoadingHandler);
  }

  async initPic(): Promise<void> {
    const cachedPic = await this.storage.getItem(STORAGE_KEYS.PHONE_NAME);
    if (cachedPic) {
      this.picName = cachedPic.toUpperCase();
    }
    this.getPickingPicList();
  }

  getPickingPicList(): void {
    this.service
      .getPickingPicList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.pickingPic = (data || []).sort((a, b) => a.localeCompare(b));
          if (!this.picName && this.pickingPic.length > 0) {
            this.picName = this.pickingPic[0].toUpperCase();
          }
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Get PIC list error:', e);
        },
      });
  }

  onRefresh(): void {
    this.fetchRequestReceiveChecklist();
  }

  fetchRequestReceiveChecklist(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.service
      .getRequestReceiveChecklist(this.docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.loading = false;
          this.inventoryRequest = data;
          this.initialData = (data?.Details || []).map((d) => ({ ...d }));

          const letters = Array.from(
            new Set(
              this.initialData
                .map((product) => {
                  const name = product.ProductModel?.Name?.trim();
                  if (!name) return '';
                  const firstValidChar = name.startsWith('~')
                    ? name.charAt(1)
                    : name.charAt(0);
                  return firstValidChar.toUpperCase();
                })
                .filter((char) => Boolean(char))
            )
          );

          this.alphabet = letters.sort((a, b) => a.localeCompare(b));
          this.applyFilter();
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.error('Fetch checklist error:', e);
          this.loading = false;
          this.toastr.error('Gagal memuat checklist penerimaan', 'Error');
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

  updateDetails(detailsIncoming: InventoryDetail): void {
    const updateInList = (list: InventoryDetail[]): boolean => {
      if (
        (detailsIncoming.Id === 0 &&
          detailsIncoming.Alias?.toUpperCase() === this.selectedBON.toUpperCase()) ||
        detailsIncoming.Id > 0
      ) {
        const found = list.find((item) => item.Id === detailsIncoming.Id);
        if (found) {
          Object.assign(found, detailsIncoming);
          return true;
        }
      }
      return false;
    };

    updateInList(this.initialData);
    updateInList(this.filteredData);
    this.setLoadingState(detailsIncoming.Id, false);
    this.cdr.markForCheck();
  }

  onOptionSelect(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const value = selectElement.value.trim().toUpperCase();
    if (value) {
      this.picName = value;
      void this.storage.setItem(STORAGE_KEYS.PHONE_NAME, this.picName);
    }
  }

  async onPicSaved(selectedOrNewPic: string): Promise<void> {
    const formatted = selectedOrNewPic.trim().toUpperCase();
    if (formatted) {
      this.picName = formatted;
      if (!this.pickingPic.some((p) => p.toUpperCase() === formatted)) {
        this.pickingPic = [...this.pickingPic, formatted].sort((a, b) =>
          a.localeCompare(b)
        );
      }
      await this.storage.setItem(STORAGE_KEYS.PHONE_NAME, formatted);
    }
    this.isDialogAddPic = false;
    this.cdr.markForCheck();
  }

  onSelectedAlphabet(char: string): void {
    if (char === '~') {
      this.selectedAlphabet = '';
    } else {
      this.selectedAlphabet = char;
    }
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredData = this.initialData
      .map((product) => ({
        ...product,
        ProductModel: {
          ...product.ProductModel,
          Name: product?.ProductModel?.Name?.replace(/^~+/, '').trim() || '',
        },
      }))
      .filter((product) => {
        if (!this.selectedAlphabet) return true;
        return (
          product.ProductModel?.Name?.toLowerCase().startsWith(
            this.selectedAlphabet.toLowerCase()
          ) ?? false
        );
      });

    if (this.filteredData.length === 0) {
      this.filteredData = this.initialData;
    }
    this.cdr.markForCheck();
  }

  getCardClass(item: InventoryDetail): string {
    const remarkStr = typeof item.Remarks === 'string' ? item.Remarks : '';
    const remarkNames = remarkStr
      ? remarkStr
        .replace('load by: ', '')
        .split(',')
        .map((name) => name.trim().toUpperCase())
        .filter((name) => name !== '')
      : [];

    if (this.picName && remarkNames.includes(this.picName.toUpperCase())) {
      return 'bg-emerald-300 border-emerald-300';
    }
    if (remarkStr) {
      return 'bg-amber-200 border-amber-300';
    }
    return 'bg-white border-gray-200';
  }

  onSubmit(item: InventoryDetail): void {
    if (this.isLoading(item.Id)) {
      return;
    }

    if (!this.picName || this.picName.trim() === '') {
      this.isErrorPicSebagian = true;
      this.msgError =
        'PIC belum dipilih, silahkan pilih PIC terlebih dahulu sebelum melanjutkan loading!';
      this.setLoadingState(item.Id, false);
      return;
    }

    this.setLoadingState(item.Id, true);

    const payload = {
      PIC: [this.picName],
      Details: [{ Id: item.Id, Quantity: item.Quantity }],
      DocNum: this.docnum,
    };

    this.service
      .putReceiveQueueFinish(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Updated via SignalR event
        },
        error: (e) => {
          console.error('Put receive queue finish error:', e);
          this.isErrorPicSebagian = true;
          this.msgError =
            'Gagal menyimpan status checklist. Silakan periksa koneksi dan coba lagi.';
          this.setLoadingState(item.Id, false);
          this.cdr.markForCheck();
        },
        complete: () => {
          this.setLoadingState(item.Id, false);
        },
      });
  }

  onCancel(id: number): void {
    this.setLoadingState(id, true);

    const payload = {
      DetailId: id,
      PIC: this.picName,
    };

    this.service
      .putCancelCheckList(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.setLoadingState(id, false);
        },
        error: (e) => {
          console.error('Cancel checklist item error:', e);
          this.setLoadingState(id, false);
          this.toastr.error('Gagal membatalkan item checklist', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  increaseQty(index: number): void {
    if (this.filteredData[index]) {
      this.filteredData[index].Quantity += 1;
      this.cdr.markForCheck();
    }
  }

  decreaseQty(index: number): void {
    if (this.filteredData[index] && this.filteredData[index].Quantity > 1) {
      this.filteredData[index].Quantity -= 1;
      this.cdr.markForCheck();
    }
  }

  checkRemarks(data: InventoryDetail[]): boolean {
    return data.every((item) => {
      const remarksStr = typeof item.Remarks === 'string' ? item.Remarks.trim() : '';
      if (!remarksStr) {
        return true;
      }

      const match = remarksStr.match(/load by:\s*([\w\s,]+)/i);
      if (match) {
        const names = match[1]
          .split(',')
          .map((name) => name.trim())
          .filter((name) => name !== '');
        return names.length > 1;
      }

      return false;
    });
  }

  onConfirmReceive(): void {
    if (this.loading) return;

    if (!this.checkRemarks(this.filteredData)) {
      this.isContra = true;
      return;
    }

    this.isContra = false;
    const data = this.filteredData.filter(
      (item) => item.LineStatus === 'Open' && Boolean(item.Remarks)
    );

    if (data.length === 0) {
      this.toastr.warning('Tidak ada item terbuka dengan catatan PIC yang siap dikonfirmasi', 'Peringatan');
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    const detailsPartial = data.map((element) => ({
      Id: element.Id,
      ItemCode: element.ProductModel?.Code,
      UoMCode: element.UoMModel?.Code,
      Quantity: element.Quantity,
      BaseQuantity: element.BaseQuantity,
    }));

    const payloadConfirm = {
      DocNum: this.docnum,
      Details: detailsPartial,
    };

    this.service
      .putReceiveDocnum(payloadConfirm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading = false;
          this.toastr.success('Berhasil Mengonfirmasi Item Diterima', 'Success');
          this.getPickingPicList();
          this.fetchRequestReceiveChecklist();
        },
        error: (e) => {
          console.error('Confirm receive error:', e);
          this.loading = false;
          this.toastr.error('Gagal mengonfirmasi penerimaan item', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  openFilterAlphabet(): void {
    this.isFilterAlphabet = true;
  }

  closeFilterAlphabet(): void {
    this.isFilterAlphabet = false;
    this.selectedAlphabet = '';
    this.filteredData = this.initialData;
    this.cdr.markForCheck();
  }

  openDialogAddPic(): void {
    this.isDialogAddPic = true;
  }

  openDialogBarcode(): void {
    this.isDialogOpenBarcode = true;
  }

  closeDialogBarcode(): void {
    this.isDialogOpenBarcode = false;
  }

  onBack(): void {
    this.location.back();
  }
}
