import { Component, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { PickingService } from '../../services/picking.service';
import { SharedDataService } from '../../../../core/services/shared-data.service';
import { SignalrService } from '../../../../core/services/signalr.service';
import { StorageService } from '../../../../core/services/storage.service';

import { HeaderRes, Area } from '../../../../core/models';

import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { ButtonHomeComponent } from '../../../../shared/components/button-home/button-home.component';
import { DialogSetPicComponent } from '../../../../shared/components/dialog-set-pic/dialog-set-pic.component';

interface FlutterWindow extends Window {
  flutter?: {
    postMessage: (message: string) => void;
  };
}
declare const window: FlutterWindow;

@Component({
  selector: 'app-picking-list',
  imports: [
    CommonModule,
    FormsModule,
    LoaderComponent,
    NavbarComponent,
    ButtonHomeComponent,
    DialogSetPicComponent,
  ],
  templateUrl: './picking-list.component.html',
  styleUrl: './picking-list.component.css',
})
export class PickingListComponent implements OnInit, OnDestroy {
  private service = inject(SalesInvoiceService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private pickingService = inject(PickingService);
  private signalrService = inject(SignalrService);
  private sharedDataService = inject(SharedDataService);
  private storageService = inject(StorageService);
  private destroyRef = inject(DestroyRef);

  headerRes: HeaderRes[] = [];
  bonCheckout: HeaderRes[] = [];
  filteredSalesInvoices: HeaderRes[] = [];
  filteredSalesBONInvoices: HeaderRes[] = [];
  area: Area[] = [];
  pickingPic: string[] = [];
  alphabet: string[] = [];

  date = '';
  dateString = '';
  picName = '';
  docNumSelected = '';
  remarksSelected = '';
  areaSelected = '';
  selectedAlphabet = '';

  loading = true;
  isDialogBantu = false;
  isDialogGantiPIC = false;
  isDialogAmbilBON = false;

  private notifyNewInvoiceHandler = (salesInvoiceModel: string): void => {
    this.onSendMessageToFlutter();
    this.playAudioNotification();
    this.handleNewInvoiceSignalR(salesInvoiceModel);
  };

  private notifyPickingLockedUnlockedHandler = (salesInvoiceModel: string): void => {
    this.handlePickingLockedUnlocked(salesInvoiceModel);
  };

  ngOnInit(): void {
    if (this.route.snapshot.params['docnum']) {
      this.docNumSelected = this.route.snapshot.params['docnum'];
      this.isDialogAmbilBON = true;
    }

    this.setDefaultDate();

    if (this.dateString) {
      this.fetchPickerData();
      this.fetchPickingData();
    }

    this.signalrService.on('NotifyNewInvoice', this.notifyNewInvoiceHandler);
    this.signalrService.on('NotifyPickingLockedUnlocked', this.notifyPickingLockedUnlockedHandler);
  }

  ngOnDestroy(): void {
    this.signalrService.off('NotifyNewInvoice', this.notifyNewInvoiceHandler);
    this.signalrService.off('NotifyPickingLockedUnlocked', this.notifyPickingLockedUnlockedHandler);
  }

  private handleNewInvoiceSignalR(data: string): void {
    try {
      const model: HeaderRes = typeof data === 'string' ? JSON.parse(data) : data;
      if (model.IsCheckout) {
        this.bonCheckout = [model, ...this.bonCheckout];
      } else {
        this.filteredSalesInvoices = [model, ...this.filteredSalesInvoices];
      }
    } catch (e) {
      console.error('SignalR parse error:', e);
    }
  }

  private handlePickingLockedUnlocked(data: string): void {
    try {
      const updateInvoice: HeaderRes = typeof data === 'string' ? JSON.parse(data) : data;
      this.updateFilteredInvoices(updateInvoice);
    } catch (e) {
      console.error('SignalR parse error:', e);
    }
  }

  private updateFilteredInvoices(headerRes: HeaderRes): boolean {
    const indexCheckout = this.bonCheckout.findIndex((res) => res.Id === headerRes.Id);
    if (indexCheckout >= 0) {
      this.bonCheckout[indexCheckout] = headerRes;
      this.bonCheckout = [...this.bonCheckout];
      return true;
    }

    const indexInvoice = this.filteredSalesInvoices.findIndex((res) => res.Id === headerRes.Id);
    if (indexInvoice >= 0) {
      this.filteredSalesInvoices[indexInvoice] = headerRes;
      this.filteredSalesInvoices = [...this.filteredSalesInvoices];
      return true;
    }

    return false;
  }

  fetchPickingData(): void {
    this.loading = true;
    this.pickingService
      .getPickingList(this.dateString)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: HeaderRes[]): void => {
          this.headerRes = [...(data || [])];
          this.filteredSalesInvoices = this.headerRes.filter((item) => !item.IsCheckout);
          this.filteredSalesBONInvoices = [...this.filteredSalesInvoices];
          this.bonCheckout = this.headerRes.filter((item) => item.IsCheckout);

          this.generateAreaList(this.headerRes);
          this.generateAlphabet(this.headerRes);
          this.applyFilter();
        },
        error: (): void => {
          this.loading = false;
        },
        complete: (): void => {
          this.loading = false;
        },
      });
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
  }

  onSelectedAlphabet(char: string): void {
    this.selectedAlphabet = char === '~' ? '' : char;
    this.areaSelected = '';
    this.applyFilter();
  }

  onDateChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.dateString = input.value.replace(/-/g, '');
    if (this.dateString) {
      this.fetchPickingData();
    }
  }

  onOptionSelect(e: Event): void {
    const select = e.target as HTMLSelectElement;
    this.areaSelected = select.value;
    this.selectedAlphabet = '';
    this.applyFilter();
  }

  async openDialogAmbilBON(docnum: string): Promise<void> {
    const phoneName = await this.storageService.get('phoneName');
    this.docNumSelected = docnum;

    if (phoneName) {
      this.onAmbilBon(phoneName);
    } else {
      this.isDialogAmbilBON = true;
    }
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
    this.docNumSelected = '';
    this.remarksSelected = '';
    this.isDialogBantu = false;
  }

  closeDialogAmbilBON(): void {
    this.docNumSelected = '';
    this.isDialogAmbilBON = false;
  }

  closeDialogGantiPIC(): void {
    this.docNumSelected = '';
    this.isDialogGantiPIC = false;
  }

  onAmbilBon(picName: string): void {
    const targetDocNum = this.docNumSelected;
    const payload = {
      DocNum: targetDocNum,
      PIC: picName.toUpperCase(),
    };

    this.service
      .putPickingRemarks(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.closeDialogAmbilBON();
          this.toChecklist(targetDocNum);
        },
        error: (err) => {
          console.error('Failed to take BON:', err);
        },
      });
  }

  onGantiPIC(newPic: string): void {
    const targetDocNum = this.docNumSelected;
    const payloadUnlocked = {
      DocNum: targetDocNum,
      PIC: newPic.toUpperCase(),
    };

    this.service
      .putPickingRemarksUnlock(payloadUnlocked)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.closeDialogGantiPIC();
          this.toChecklist(targetDocNum);
        },
        error: (err) => {
          console.error('Failed to change PIC:', err);
        },
      });
  }

  onBantu(): void {
    const targetDocNum = this.docNumSelected;
    this.closeDialogBantu();
    this.toChecklist(targetDocNum);
  }

  toChecklist(docnum: string): void {
    void this.router.navigate(['/main/picking/checklist', docnum, this.dateString]);
  }

  private setDefaultDate(): void {
    const currentDate = new Date();
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 8);
    const year = previousDate.getFullYear();
    const month = String(previousDate.getMonth() + 1).padStart(2, '0');
    const day = String(previousDate.getDate()).padStart(2, '0');
    this.date = `${year}-${month}-${day}`;
    this.dateString = `${year}${month}${day}`;
  }

  private generateAreaList(data: HeaderRes[]): void {
    const uniqueArea = Array.from(new Set(data.map((inv) => inv.Area).filter(Boolean)));
    this.area = uniqueArea.map((areaStr) => ({
      Code: areaStr,
      isFromInternalMessage: false,
      Description: '',
      Alias: null,
      Id: 0,
      Remarks: null,
    }));
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

  private matchesAreaFilter(data: HeaderRes): boolean {
    return this.areaSelected ? (data.Area || '').includes(this.areaSelected) : true;
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

  private fetchPickerData(): void {
    this.sharedDataService
      .getPicList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data: string[]) => {
          this.pickingPic = data || [];
        },
      });
  }

  private playAudioNotification(): void {
    try {
      const audio = new Audio('sounds/wow.mp3');
      audio.play().catch(() => {
        // Ignored if browser blocks autoplay before user gesture
      });
    } catch {
      // Audio not supported
    }
  }

  private onSendMessageToFlutter(): void {
    if (window.flutter && typeof window.flutter.postMessage === 'function') {
      window.flutter.postMessage('newOrderPlay');
    }
  }
}

