import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { SalesInvoicesModel } from '../../../core/models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-detail-docnum',
  imports: [CommonModule],
  templateUrl: './card-detail-docnum.component.html',
  styleUrl: './card-detail-docnum.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardDetailDocnumComponent {
  readonly salesInvoice = input<SalesInvoicesModel>();
}

