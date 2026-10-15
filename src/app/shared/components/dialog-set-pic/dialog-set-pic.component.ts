import { Component, input, output, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dialog-set-pic',
  imports: [CommonModule, FormsModule],
  templateUrl: './dialog-set-pic.component.html',
})
export class DialogSetPicComponent {
  isOpen = input<boolean>(false);
  isLoading = input<boolean>(false);
  picList = input<string[]>([]);
  currentPic = input<string | null>(null);
  title = input<string>('Siapa Nama kamu?');
  confirmText = input<string>('Simpan');
  canClose = input<boolean>(true);

  saved = output<string>();
  closed = output<void>();

  tempName = signal<string>('');

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        this.tempName.set(this.currentPic() || '');
      }
    });
  }

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
