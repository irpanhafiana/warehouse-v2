import { Routes } from '@angular/router';

export const goodsDeliveryRoutes: Routes = [
  {
    path: 'goods-delivery',
    loadComponent: () =>
      import('./goods-delivery.component').then(
        (m) => m.GoodsDeliveryComponent
      ),
    children: [
      {
        path: 'list',
        loadComponent: () =>
          import(
            './pages/goods-delivery-list/goods-delivery-list.component'
          ).then((m) => m.GoodsDeliveryListComponent),
      },
      {
        path: 'detail/:date/:transportUnit/:status',
        loadComponent: () =>
          import(
            './pages/goods-delivery-detail/goods-delivery-detail.component'
          ).then((m) => m.GoodsDeliveryDetailComponent),
      },
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full',
      },
    ],
  },
];
