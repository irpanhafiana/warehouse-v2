import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SalesInvoiceService } from '../../../../core/services';
import { SalesInvoicesModel } from '../../../../core/models';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-finished-detail',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    LoaderComponent,
  ],
  templateUrl: './finished-detail.component.html',
  styleUrl: './finished-detail.component.css',
})
export class FinishedDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(SalesInvoiceService);
  private toastr = inject(ToastrService);

  docnum: string = '';
  salesInvoice?: SalesInvoicesModel;
  loading: boolean = false;

  constructor() {
    this.docnum = this.route.snapshot.params['docnum'] || '';
  }

  ngOnInit(): void {
    if (this.docnum) {
      this.getDetail();
    }
  }

  getDetail() {
    this.loading = true;
    this.service.getFinishedDetail(this.docnum).subscribe({
      next: (data) => {
        this.loading = false;
        this.salesInvoice = data;
      },
      error: () => {
        this.loading = false;
        this.toastr.error('Gagal mengambil detail BON selesai.', 'Error');
      },
    });
  }

  onBack() {
    this.router.navigate(['/main/finished/list']);
  }
}

