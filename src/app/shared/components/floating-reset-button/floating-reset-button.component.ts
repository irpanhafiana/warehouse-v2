import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  OnDestroy,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StorageService, STORAGE_KEYS } from '../../../core/services/storage.service';

@Component({
  selector: 'app-floating-reset-button',
  imports: [CommonModule],
  templateUrl: './floating-reset-button.component.html',
  styleUrl: './floating-reset-button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FloatingResetButtonComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private storageService = inject(StorageService);

  readonly posX = signal<number>(20);
  readonly posY = signal<number>(200);
  readonly isDragging = signal<boolean>(false);
  readonly isDialogOpen = signal<boolean>(false);
  readonly isResetting = signal<boolean>(false);

  private dragStartX = 0;
  private dragStartY = 0;
  private initialPosX = 0;
  private initialPosY = 0;
  private hasMoved = false;

  private mouseMoveListener?: (e: MouseEvent) => void;
  private mouseUpListener?: () => void;

  ngOnInit(): void {
    this.initializePosition();
  }

  ngOnDestroy(): void {
    this.cleanupMouseListeners();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.clampCurrentPosition();
  }

  private initializePosition(): void {
    if (typeof window === 'undefined') return;

    const btnSize = 56;
    const defaultX = Math.max(10, window.innerWidth - btnSize - 16);
    const defaultY = Math.max(10, window.innerHeight - btnSize - 120);

    try {
      const saved = localStorage.getItem('floating_reset_btn_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const maxX = Math.max(10, window.innerWidth - btnSize - 10);
          const maxY = Math.max(10, window.innerHeight - btnSize - 10);
          this.posX.set(Math.min(Math.max(10, parsed.x), maxX));
          this.posY.set(Math.min(Math.max(10, parsed.y), maxY));
          return;
        }
      }
    } catch {}

    this.posX.set(defaultX);
    this.posY.set(defaultY);
  }

  private clampCurrentPosition(): void {
    if (typeof window === 'undefined') return;
    const btnSize = 56;
    const maxX = Math.max(10, window.innerWidth - btnSize - 10);
    const maxY = Math.max(10, window.innerHeight - btnSize - 10);
    this.posX.set(Math.min(Math.max(10, this.posX()), maxX));
    this.posY.set(Math.min(Math.max(10, this.posY()), maxY));
  }

  private savePosition(x: number, y: number): void {
    try {
      localStorage.setItem('floating_reset_btn_pos', JSON.stringify({ x, y }));
    } catch {}
  }

  // --- Touch Drag Handlers ---
  onTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    this.startDrag(touch.clientX, touch.clientY);
  }

  onTouchMove(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (this.moveDrag(touch.clientX, touch.clientY)) {
      e.preventDefault();
    }
  }

  onTouchEnd(): void {
    this.endDrag();
  }

  // --- Mouse Drag Handlers ---
  onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // Only primary button
    this.startDrag(e.clientX, e.clientY);

    this.mouseMoveListener = (moveEvt: MouseEvent) => {
      this.moveDrag(moveEvt.clientX, moveEvt.clientY);
    };

    this.mouseUpListener = () => {
      this.endDrag();
      this.cleanupMouseListeners();
    };

    window.addEventListener('mousemove', this.mouseMoveListener);
    window.addEventListener('mouseup', this.mouseUpListener);
  }

  private cleanupMouseListeners(): void {
    if (this.mouseMoveListener) {
      window.removeEventListener('mousemove', this.mouseMoveListener);
      this.mouseMoveListener = undefined;
    }
    if (this.mouseUpListener) {
      window.removeEventListener('mouseup', this.mouseUpListener);
      this.mouseUpListener = undefined;
    }
  }

  // --- Generic Drag Logic ---
  private startDrag(clientX: number, clientY: number): void {
    this.dragStartX = clientX;
    this.dragStartY = clientY;
    this.initialPosX = this.posX();
    this.initialPosY = this.posY();
    this.hasMoved = false;
  }

  private moveDrag(clientX: number, clientY: number): boolean {
    const deltaX = clientX - this.dragStartX;
    const deltaY = clientY - this.dragStartY;

    if (!this.hasMoved && Math.hypot(deltaX, deltaY) > 6) {
      this.hasMoved = true;
      this.isDragging.set(true);
    }

    if (this.hasMoved) {
      const btnSize = 56;
      const maxX = Math.max(10, window.innerWidth - btnSize - 10);
      const maxY = Math.max(10, window.innerHeight - btnSize - 10);

      const nextX = Math.min(Math.max(10, this.initialPosX + deltaX), maxX);
      const nextY = Math.min(Math.max(10, this.initialPosY + deltaY), maxY);

      this.posX.set(nextX);
      this.posY.set(nextY);
      return true;
    }

    return false;
  }

  private endDrag(): void {
    if (this.hasMoved) {
      this.savePosition(this.posX(), this.posY());
    }
    setTimeout(() => {
      this.isDragging.set(false);
      this.hasMoved = false;
    }, 60);
  }

  onClick(e: MouseEvent): void {
    if (this.hasMoved || this.isDragging()) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    this.openDialog();
  }

  openDialog(): void {
    this.isDialogOpen.set(true);
  }

  closeDialog(): void {
    if (this.isResetting()) return;
    this.isDialogOpen.set(false);
  }

  async onConfirmReset(): Promise<void> {
    this.isResetting.set(true);

    try {
      await this.storageService.removeItem(STORAGE_KEYS.PHONE_NAME);
      await this.storageService.removeItem('phoneName');
      await this.storageService.removeItem('picName');
      await this.storageService.removeItem('picLoading');
      await this.storageService.removeItem('selectedTab');
    } catch (e) {
      console.warn('Gagal membersihkan storage nama:', e);
    }

    this.isDialogOpen.set(false);
    this.isResetting.set(false);

    void this.router.navigate(['/']);
  }
}

