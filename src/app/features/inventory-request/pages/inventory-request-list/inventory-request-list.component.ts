import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Inventory } from '../../../../core/models';
import { StorageService, STORAGE_KEYS } from '../../../../core/services/storage.service';
import { ButtonHomeComponent, LoaderComponent } from '../../../../shared/components';
import { InventoryRequestService } from '../../services/inventory-request.service';

@Component({
  selector: 'app-inventory-request-list',
  imports: [CommonModule, LoaderComponent, ButtonHomeComponent],
  templateUrl: './inventory-request-list.component.html',
})
export class InventoryRequestListComponent implements OnInit {
  private service = inject(InventoryRequestService);
  private router = inject(Router);
  private storage = inject(StorageService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);

  isLoading: boolean = false;
  defaultBranch: string = '';
  inventoryRequests: Inventory[] = [];

  ngOnInit(): void {
    this.initDefaultBranch();
  }

  onRefresh(): void {
    this.fetchDefaultBranch();
  }

  async initDefaultBranch(): Promise<void> {
    const cachedBranch = await this.storage.getItem(STORAGE_KEYS.DEFAULT_BRANCH);
    if (cachedBranch) {
      this.defaultBranch = cachedBranch;
      this.fetchDeliveryList(this.defaultBranch);
    } else {
      this.fetchDefaultBranch();
    }
  }

  fetchDefaultBranch(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.service.getDefaultBranch().subscribe({
      next: async (branch) => {
        this.defaultBranch = branch;
        await this.storage.setItem(STORAGE_KEYS.DEFAULT_BRANCH, branch);
        this.fetchDeliveryList(this.defaultBranch);
      },
      error: (e) => {
        console.error('Fetch default branch error:', e);
        this.isLoading = false;
        this.toastr.error('Gagal mengambil cabang default', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  fetchDeliveryList(defaultBranch: string): void {
    if (!defaultBranch) {
      this.fetchDefaultBranch();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    this.service.getDeliveryList(defaultBranch).subscribe({
      next: (data) => {
        this.inventoryRequests = data || [];
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        console.error('Fetch delivery list error:', e);
        this.isLoading = false;
        this.toastr.error('Gagal memuat daftar permintaan pengiriman', 'Error');
        this.cdr.markForCheck();
      },
    });
  }

  toInventoryRequestView(docnum: string): void {
    void this.router.navigate(['/main-reqtrans/inventory-request/view', docnum]);
  }

  toPickingListPengiriman(): void {
    void this.router.navigate(['/main-reqtrans/picking/list']);
  }
}

