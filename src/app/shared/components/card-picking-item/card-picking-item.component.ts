import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { Detail } from '../../../core/models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-picking-item',
  imports: [CommonModule],
  templateUrl: './card-picking-item.component.html',
  styleUrl: './card-picking-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardPickingItemComponent {
  readonly salesInvoiceDetail = input.required<Detail>();
  readonly loadingId = input<number>();

  readonly isCompleted = computed(() => {
    const r = this.salesInvoiceDetail()?.Remarks;
    return r !== null && r !== '' && r !== undefined;
  });
}

