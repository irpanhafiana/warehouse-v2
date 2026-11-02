import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-request-receive-navbar, app-navbar-reqrec',
  imports: [RouterModule, CommonModule],
  templateUrl: './request-receive-navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestReceiveNavbarComponent {
  private router = inject(Router);

  isActive(url: string): boolean {
    return this.router.url.includes(url);
  }
}
