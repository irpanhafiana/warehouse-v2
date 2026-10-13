import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar-reqtrans',
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar-reqtrans.component.html',
})
export class NavbarReqtransComponent {
  private router = inject(Router);

  isActive(url: string): boolean {
    return this.router.url.includes(url);
  }
}

