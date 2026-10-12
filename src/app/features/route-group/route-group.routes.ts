import { Routes } from '@angular/router';
import { RouteGroupComponent } from './route-group.component';
import { RouteGroupListComponent } from './pages/route-group-list/route-group-list.component';
import { RouteGroupFormComponent } from './pages/route-group-form/route-group-form.component';
import { RouteGroupAdditionalInvoiceComponent } from './pages/route-group-additional-invoice/route-group-additional-invoice.component';
import { RouteGroupDetailComponent } from './pages/route-group-detail/route-group-detail.component';
import { RouteGroupDetailHistoryComponent } from './pages/route-group-detail-history/route-group-detail-history.component';

export const routeGroupRoutes: Routes = [
  {
    path: 'route-group',
    component: RouteGroupComponent,
    children: [
      {
        path: 'list',
        component: RouteGroupListComponent,
        data: { title: 'Route Group List' },
      },
      {
        path: 'form',
        component: RouteGroupFormComponent,
      },
      {
        path: 'additional-invoice',
        component: RouteGroupAdditionalInvoiceComponent,
      },
      {
        path: 'detail/:alias',
        component: RouteGroupDetailComponent,
      },
      {
        path: 'history-detail/:alias',
        component: RouteGroupDetailHistoryComponent,
      },
    ],
  },
];

