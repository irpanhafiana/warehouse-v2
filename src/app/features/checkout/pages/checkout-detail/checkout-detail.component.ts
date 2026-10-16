import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SalesInvoiceService } from '../../../../core/services/sales-invoice.service';
import { GoodsDeliveryService } from '../../../../core/services/goods-delivery.service';
import { StorageService } from '../../../../core/services/storage.service';
import { Detail, SalesInvoicesModel } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { TruncatePipe } from '../../../../shared/pipes';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-checkout-detail',
  imports: [
    CommonModule,
    DatePipe,
    LoaderComponent,
    FormsModule,
    ReactiveFormsModule,
    TruncatePipe
  ],
  templateUrl: './checkout-detail.component.html',
  styleUrl: './checkout-detail.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(SalesInvoiceService);
  private goodsDeliveryService = inject(GoodsDeliveryService);
  private storageService = inject(StorageService);
  private router = inject(Router);
  private location = inject(Location);
  private toastr = inject(ToastrService);
  private destroyRef = inject(DestroyRef);

  docnum = '';
  salesInvoice!: SalesInvoicesModel;
  loading = false;
  activeIndex: number | null = null;
  isDialogOpen = false;
  pickingPic: string[] = [];
  selectedPic = '';
  picName = '';
  itemLoaded: any[] = [];
  itemLoadedMap: any[] = [];
  itemCheckedOut: any[] = [];
  selectedItems: any[] = [];
  salesInvoiceLength = 0;
  itemLoadedMapLength = 0;
  isShowAddDelivery = false;
  isFilterAlphabet = false;
  initialData: Detail[] = [];
  filteredData: Detail[] = [];
  selectedAplhabet = '';
  alphabet: string[] = [];

  constructor() {
    this.docnum = this.route.snapshot.params['docnum'] || '';
    const storedItems = this.storageService.getItemSync('selectedItems');
    this.selectedItems = storedItems ? JSON.parse(storedItems) : [];
  }

  ngOnInit(): void {
    if (this.docnum) {
      this.getDetail();
    }
  }

  getCheckBON(docnum: string): void {
    this.goodsDeliveryService
      .getCheckBON(docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          (data || []).forEach((element: any) => {
            (element?.Details || []).forEach((el: any) => {
              try {
                this.itemLoaded.push(
                  typeof el.Data === 'string' ? JSON.parse(el.Data) : el.Data
                );
              } catch (err) {
                console.error('Error parsing loaded item Data:', err);
              }
            });
          });

          this.itemLoadedMap = this.itemLoaded.map((item: Detail) => ({
            id: item.Id,
          }));

          this.itemLoadedMapLength = this.itemLoadedMap.length;
        },
        error: () => {
          this.toastr.error('Gagal memeriksa status muatan BON.', 'Error');
        },
        complete: () => {
          this.isShowAddDelivery = true;
        },
      });
  }

  getDetail(): void {
    this.loading = true;
    this.service
      .getCheckoutDetail(this.docnum)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.loading = false;
          this.salesInvoice = data;
          this.initialData = data.Details || [];
          const alphabet = Array.from(
            new Set(
              this.initialData
                .map((product: any) => {
                  const name = product.ProductModel?.Name?.trim();
                  if (!name) return '';
                  const firstValidChar = name.startsWith('~')
                    ? name.charAt(1)
                    : name.charAt(0);
                  return firstValidChar.toUpperCase();
                })
                .filter(Boolean)
            )
          );

          this.alphabet = alphabet.sort((a, b) => a.localeCompare(b));
          this.applyFilter();

          this.salesInvoice.Details = (this.salesInvoice.Details || []).map(
            (item) => ({
              ...item,
              isSelected: false,
            })
          );
          this.itemCheckedOut = (data.Details || []).map((item: Detail) => ({
            id: item.Id,
            productName: item.ProductModel?.Name,
            remarks: item.Remarks,
            openQuantity: item.OpenQuantity,
            quantity: item.Quantity,
            uomModelCode: item.UoMModel?.Code,
            baseQuantity: item.BaseQuantity,
            SAPDocEntry: item.SAPDocEntry,
            SAPDocNum: item.SAPDocNum,
          }));
          this.salesInvoiceLength = this.salesInvoice.Details.length;
        },
        error: () => {
          this.loading = false;
          this.toastr.error('Gagal mengambil detail checkout.', 'Error');
        },
        complete: () => {
          this.getCheckBON(this.docnum);
        },
      });
  }

  applyFilter(): void {
    this.filteredData = this.filteredProducts(this.initialData);
    if (this.filteredData.length === 0) {
      this.filteredData = this.initialData;
    }
  }

  filteredProducts(detail: Detail[]): Detail[] {
    const storedData = JSON.parse(
      localStorage.getItem(this.docnum) || '[]'
    );

    this.filteredData.forEach((item) => {
      const localStorageItem = storedData.find(
        (storedItem: any) => storedItem.id === item.Id
      );

      if (localStorageItem) {
        item.sebagianValue = localStorageItem.sebagianValue;
      }
    });

    return detail
      .map((product) => {
        const existingDetail = this.filteredData.find(
          (d) => d.Id === product.Id
        );

        const sebagianValueFromLocalStorage = storedData.find(
          (storedItem: any) => storedItem.id === product.Id
        )?.sebagianValue;

        return {
          ...product,
          sebagianValue:
            sebagianValueFromLocalStorage ??
            existingDetail?.sebagianValue ??
            product.sebagianValue,
          isSelected: false,
          isSebagian: existingDetail?.isSebagian ?? product.isSebagian,
          ProductModel: {
            ...product.ProductModel,
            Name: product?.ProductModel?.Name?.replace(/^~+/, '').trim(),
          },
        };
      })
      .filter((product) => {
        if (!this.selectedAplhabet) return true;
        return product?.ProductModel?.Name?.toLowerCase().startsWith(
          this.selectedAplhabet.toLowerCase()
        );
      });
  }

  onSelectedAlphabet(i: string): void {
    if (i === '~') {
      this.selectedAplhabet = '';
      this.filteredData = this.initialData;
    } else {
      this.selectedAplhabet = i;
      this.applyFilter();
    }
    this.applyFilter();
  }

  isItemLoaded(item: Detail): boolean {
    return this.itemLoadedMap.some((loadedItem) => loadedItem.id === item.Id);
  }

  isItemSelected(item: any): boolean {
    return this.selectedItems.some((selected) => selected.id === item.id);
  }

  handleClick(item: any): void {
    if (this.isItemLoaded(item)) {
      return;
    }

    item.isSelected = !item.isSelected;

    if (item.isSelected) {
      this.selectedItems.push(item);
    } else {
      this.selectedItems = this.selectedItems.filter(
        (selected) => selected.Id !== item.Id
      );
    }

    const storageKey = this.docnum ? `GOODS${this.docnum}` : 'GOODS_TEMP';
    void this.storageService.set(storageKey, JSON.stringify(this.selectedItems));
  }

  onSelectAll(): void {
    this.filteredData = this.filteredData.map((item) => ({
      ...item,
      isSelected: true,
    }));

    this.filteredData.forEach((element) => {
      if (!this.selectedItems.some((item) => item.Id === element.Id)) {
        this.selectedItems.push(element);
      }
    });

    const storageKey = this.docnum ? `GOODS${this.docnum}` : 'GOODS_TEMP';
    void this.storageService.set(storageKey, JSON.stringify(this.selectedItems));
  }

  toGoodsDelivery(): void {
    void this.router.navigate(['/main/loading/add-to-delivery', this.docnum]);
  }

  onBack(): void {
    void this.storageService.remove(`GOODS${this.docnum}`);
    this.location.back();
  }

  openFilterAlphabet(): void {
    this.isFilterAlphabet = true;
  }

  closeFilterAlphabet(): void {
    this.isFilterAlphabet = false;
    this.selectedAplhabet = '';
    this.filteredData = this.initialData;
  }
}

