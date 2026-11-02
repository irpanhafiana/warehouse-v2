import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-request-transfer-navbar, app-navbar-reqtrans',
  imports: [RouterModule, CommonModule],
  templateUrl: './request-transfer-navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestTransferNavbarComponent {
  private router = inject(Router);

  isActive(url: string): boolean {
    return this.router.url.includes(url);
  }
}
