import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderRes } from '../../../core/models';

@Component({
  selector: 'app-card',
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
})
export class CardComponent {
  @Input() dataFrom: string = 'LOADING';
  @Input() salesInvoicesModel!: any;
  @Input() headerRes!: HeaderRes;
  @Output() dialogOpen: EventEmitter<void> = new EventEmitter();

  openDialogDetail(): void {
    this.dialogOpen.emit();
  }
}

