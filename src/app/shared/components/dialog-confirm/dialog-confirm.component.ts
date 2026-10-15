import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

@Component({
  selector: 'app-dialog-confirm',
  imports: [CommonModule],
  templateUrl: './dialog-confirm.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogConfirmComponent {
  title = input<string>('Konfirmasi');
  message = input<string>('Apakah Anda yakin ingin melanjutkan aksi ini?');
  confirmText = input<string>('Ya, Lanjutkan');
  cancelText = input<string>('Batal');
  confirmBtnClass = input<string>('btn-no-shadow-primary');
  isLoading = input<boolean>(false);

  confirm = output<void>();
  cancel = output<void>();

  onConfirm(): void {
    if (!this.isLoading()) {
      this.confirm.emit();
    }
  }

  onCancel(): void {
    if (!this.isLoading()) {
      this.cancel.emit();
    }
  }
}

