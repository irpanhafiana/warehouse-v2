import { Component, Input } from '@angular/core';
import { Detail } from '../../../core/models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-picking-item',
  imports: [CommonModule],
  templateUrl: './card-picking-item.component.html',
  styleUrl: './card-picking-item.component.css',
})
export class CardPickingItemComponent {
  @Input() salesInvoiceDetail!: Detail;
  @Input() loadingId!: number;

  get isCompleted(): boolean {
    const r = this.salesInvoiceDetail?.Remarks;
    return r !== null && r !== '' && r !== undefined;
  }
}

