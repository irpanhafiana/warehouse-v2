import { Routes } from '@angular/router';

export const loadingRoutes: Routes = [
  {
    path: 'loading',
    loadComponent: () =>
      import('./loading.component').then((m) => m.LoadingComponent),
    children: [
      {
        path: 'list',
        loadComponent: () =>
          import('./pages/loading-list/loading-list.component').then(
            (m) => m.LoadingListComponent
          ),
      },
      {
        path: 'checklist/:customerCode/:date/:docnum',
        loadComponent: () =>
          import(
            './pages/loading-checklist/loading-checklist.component'
          ).then((m) => m.LoadingChecklistComponent),
      },
      {
        path: 'checklist/:docnum',
        loadComponent: () =>
          import(
            './pages/loading-checklist/loading-checklist.component'
          ).then((m) => m.LoadingChecklistComponent),
      },
      {
        path: 'add-to-delivery/:docnum',
        loadComponent: () =>
          import(
            './pages/loading-add-to-delivery/loading-add-to-delivery.component'
          ).then((m) => m.LoadingAddToDeliveryComponent),
      },
      {
        path: 'confirmation/:docnum',
        loadComponent: () =>
          import(
            './pages/loading-confirmation/loading-confirmation.component'
          ).then((m) => m.LoadingConfirmationComponent),
      },
    ],
  },
];
