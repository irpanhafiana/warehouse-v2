import { Routes } from '@angular/router';
import { CheckoutComponent } from './checkout.component';
import { CheckoutListComponent } from './pages/checkout-list/checkout-list.component';
import { CheckoutDetailComponent } from './pages/checkout-detail/checkout-detail.component';

export const checkoutRoutes: Routes = [
  {
    path: 'checkout',
    component: CheckoutComponent,
    children: [
      {
        path: 'list',
        component: CheckoutListComponent,
      },
      {
        path: 'detail/:docnum',
        component: CheckoutDetailComponent,
      },
    ],
  },
];

