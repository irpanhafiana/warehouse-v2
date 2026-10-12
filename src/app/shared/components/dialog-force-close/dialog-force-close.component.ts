import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dialog-force-close',
  imports: [],
  templateUrl: './dialog-force-close.component.html',
})
export class DialogForceCloseComponent {
  isOpen = input<boolean>(false);
  confirm = output<void>();
  cancel = output<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}

