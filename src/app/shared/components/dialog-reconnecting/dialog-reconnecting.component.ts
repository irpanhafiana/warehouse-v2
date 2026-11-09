import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReconnectingService } from '../../../core/services/reconnecting.service';

@Component({
  selector: 'app-dialog-reconnecting',
  imports: [CommonModule],
  templateUrl: './dialog-reconnecting.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogReconnectingComponent {
  readonly reconnectingService = inject(ReconnectingService);
}
