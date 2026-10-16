import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { Inventory } from '../../../../core/models';
import { StorageService, STORAGE_KEYS } from '../../../../core/services/storage.service';
import { ButtonHomeComponent, LoaderComponent, NavbarReqrecComponent } from '../../../../shared/components';
import { RequestReceiveService } from '../../services/request-receive.service';

@Component({
  selector: 'app-request-receive-list',
  imports: [
    CommonModule,
    LoaderComponent,
    NavbarReqrecComponent,
    ButtonHomeComponent,
  ],
  templateUrl: './request-receive-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestReceiveListComponent implements OnInit {
  private service = inject(RequestReceiveService);
  private router = inject(Router);
  private storage = inject(StorageService);
  private toastr = inject(ToastrService);
  private cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  isLoading: boolean = false;
  defaultBranch: string = '';
  inventoryRequests: Inventory[] = [];
  arrDocNum: string[] = [];
  arrDocNumNotExist: string[] = [];

  ngOnInit(): void {
    this.initDefaultBranch();
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

    this.service
      .getDefaultBranch()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
    this.arrDocNum = [];
    this.cdr.markForCheck();

    this.service
      .getRequestReceiveList(defaultBranch)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.inventoryRequests = data || [];
          this.arrDocNum = this.inventoryRequests.map((item) => item.DocNum);
          this.isLoading = false;
          this.cdr.markForCheck();

          if (this.arrDocNum.length > 0) {
            this.postCheckReceiveByDocNum(this.arrDocNum);
          }
        },
        error: (e) => {
          console.error('Fetch request receive list error:', e);
          this.isLoading = false;
          this.toastr.error('Gagal memuat daftar permintaan penerimaan', 'Error');
          this.cdr.markForCheck();
        },
      });
  }

  postCheckReceiveByDocNum(data: string[]): void {
    this.service
      .postCheckReceiveByDocNum(data)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.arrDocNumNotExist = res || [];
          this.cdr.markForCheck();
        },
        error: (e) => {
          console.warn('Check receive by docnum warning:', e);
          this.cdr.markForCheck();
        },
      });
  }

  toInventoryRequestView(docnum: string): void {
    void this.router.navigate(['/main-reqrec/request-receive/detail', docnum]);
  }
}

