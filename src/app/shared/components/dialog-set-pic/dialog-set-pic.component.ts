import { Component, ChangeDetectionStrategy, input, output, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dialog-set-pic',
  imports: [CommonModule, FormsModule],
  templateUrl: './dialog-set-pic.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogSetPicComponent {
  readonly isOpen = input<boolean>(false);
  readonly isLoading = input<boolean>(false);
  readonly picList = input<string[]>([]);
  readonly currentPic = input<string | null>(null);
  readonly title = input<string>('Siapa Nama kamu?');
  readonly confirmText = input<string>('Simpan');
  readonly canClose = input<boolean>(true);

  readonly saved = output<string>();
  readonly closed = output<void>();

  readonly tempName = linkedSignal({
    source: () => ({ open: this.isOpen(), pic: this.currentPic() }),
    computation: (s) => (s.open ? (s.pic || '') : '')
  });

  onSelectPic(pic: string): void {
    const formatted = pic.toUpperCase().trim();
    this.tempName.set(formatted);
    this.saved.emit(formatted);
  }

  onConfirm(): void {
    const val = this.tempName().trim();
    if (val.length > 0) {
      this.saved.emit(val.toUpperCase());
    }
  }

  onClose(): void {
    this.closed.emit();
  }
}
