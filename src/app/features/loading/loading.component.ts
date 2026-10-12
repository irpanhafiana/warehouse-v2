import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-loading',
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class LoadingComponent {}

