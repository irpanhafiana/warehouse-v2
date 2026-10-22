import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderRes } from '../../../core/models';

@Component({
  selector: 'app-card',
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block w-full',
  },
})
export class CardComponent {
  readonly dataFrom = input<string>('LOADING');
  readonly salesInvoicesModel = input<any>();
  readonly headerRes = input<HeaderRes | undefined>(undefined);
  readonly dialogOpen = output<void>();

  openDialogDetail(): void {
    this.dialogOpen.emit();
  }
}
