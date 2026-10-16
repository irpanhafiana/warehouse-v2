import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { SignalrService } from '../../core/services/signalr.service';
import { HeaderRes } from '../../core/models';

@Component({
  selector: 'app-route-group',
  imports: [RouterOutlet, CommonModule],
  template: '<router-outlet></router-outlet>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RouteGroupComponent implements OnInit, OnDestroy {
  private signalrService = inject(SignalrService);
  private toastr = inject(ToastrService);

  newBon!: HeaderRes;
  private notifyAdditionalInvoiceHandler = (salesInvoiceModel: string): void => {
    this.handleNotifyAdditionalInvoiceSignalR(salesInvoiceModel);
  };

  ngOnInit(): void {
    this.signalrService.on(
      'NotifyAdditionalInvoice',
      this.notifyAdditionalInvoiceHandler
    );
  }

  private handleNotifyAdditionalInvoiceSignalR(data: string): void {
    try {
      this.newBon = typeof data === 'string' ? JSON.parse(data) : data;
      this.toastr.success(`BON baru dari: ${this.newBon.Name}`, 'Success');
    } catch (e) {
      console.error('Error parsing NotifyAdditionalInvoice payload:', e);
    }
  }

  ngOnDestroy(): void {
    this.signalrService.off(
      'NotifyAdditionalInvoice',
      this.notifyAdditionalInvoiceHandler
    );
  }
}

