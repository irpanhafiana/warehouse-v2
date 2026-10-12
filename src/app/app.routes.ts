import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { environment } from '../environments/environment';

export const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
    data: {
      username: environment.posUsername,
      password: environment.posPassword,
    },
  },
  {
    path: 'main',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/picking/picking.routes').then(
            (m) => m.pickingRoutes
          ),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/loading/loading.routes').then(
            (m) => m.loadingRoutes
          ),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/route-group/route-group.routes').then(
            (m) => m.routeGroupRoutes
          ),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/checkout/checkout.routes').then(
            (m) => m.checkoutRoutes
          ),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/goods-delivery/goods-delivery.routes').then(
            (m) => m.goodsDeliveryRoutes
          ),
      },
      {
        path: '',
        loadChildren: () =>
          import('./features/finished/finished.routes').then(
            (m) => m.finishedRoutes
          ),
      },
    ],
  },
  {
    path: 'main-reqrec',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./features/request-receive/request-receive.routes').then(
            (m) => m.requestReceiveRoutes
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
