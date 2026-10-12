import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar-reqrec',
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar-reqrec.component.html',
})
export class NavbarReqrecComponent {
  private router = inject(Router);

  isActive(url: string): boolean {
    return this.router.url.includes(url);
  }
}

