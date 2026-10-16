import { Routes } from '@angular/router';

export const routeGroupRoutes: Routes = [
  {
    path: 'route-group',
    loadComponent: () =>
      import('./route-group.component').then((m) => m.RouteGroupComponent),
    children: [
      {
        path: 'list',
        loadComponent: () =>
          import('./pages/route-group-list/route-group-list.component').then(
            (m) => m.RouteGroupListComponent
          ),
        data: { title: 'Route Group List' },
      },
      {
        path: 'form',
        loadComponent: () =>
          import('./pages/route-group-form/route-group-form.component').then(
            (m) => m.RouteGroupFormComponent
          ),
      },
      {
        path: 'additional-invoice',
        loadComponent: () =>
          import(
            './pages/route-group-additional-invoice/route-group-additional-invoice.component'
          ).then((m) => m.RouteGroupAdditionalInvoiceComponent),
      },
      {
        path: 'detail/:alias',
        loadComponent: () =>
          import(
            './pages/route-group-detail/route-group-detail.component'
          ).then((m) => m.RouteGroupDetailComponent),
      },
      {
        path: 'history-detail/:alias',
        loadComponent: () =>
          import(
            './pages/route-group-detail-history/route-group-detail-history.component'
          ).then((m) => m.RouteGroupDetailHistoryComponent),
      },
    ],
  },
];
