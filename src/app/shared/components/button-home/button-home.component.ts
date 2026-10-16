import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-button-home',
  imports: [],
  templateUrl: './button-home.component.html',
  styleUrl: './button-home.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonHomeComponent {
  private router = inject(Router);

  backToHome(): void {
    void this.router.navigate(['/']);
  }
}

