import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar-reqrec',
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar-reqrec.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarReqrecComponent {
  private router = inject(Router);

  isActive(url: string): boolean {
    return this.router.url.includes(url);
  }
}

