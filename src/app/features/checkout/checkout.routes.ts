import { Routes } from '@angular/router';

export const checkoutRoutes: Routes = [
  {
    path: 'checkout',
    loadComponent: () =>
      import('./checkout.component').then((m) => m.CheckoutComponent),
    children: [
      {
        path: 'list',
        loadComponent: () =>
          import('./pages/checkout-list/checkout-list.component').then(
            (m) => m.CheckoutListComponent
          ),
      },
      {
        path: 'detail/:docnum',
        loadComponent: () =>
          import('./pages/checkout-detail/checkout-detail.component').then(
            (m) => m.CheckoutDetailComponent
          ),
      },
    ],
  },
];
