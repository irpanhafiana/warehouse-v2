import { Routes } from '@angular/router';
import { GoodsDeliveryComponent } from './goods-delivery.component';
import { GoodsDeliveryListComponent } from './pages/goods-delivery-list/goods-delivery-list.component';
import { GoodsDeliveryDetailComponent } from './pages/goods-delivery-detail/goods-delivery-detail.component';

export const goodsDeliveryRoutes: Routes = [
  {
    path: 'goods-delivery',
    component: GoodsDeliveryComponent,
    children: [
      {
        path: 'list',
        component: GoodsDeliveryListComponent,
      },
      {
        path: 'detail/:status/:date/:transportUnit',
        component: GoodsDeliveryDetailComponent,
      },
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full',
      },
    ],
  },
];

