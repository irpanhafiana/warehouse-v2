import { Routes } from '@angular/router';

export const finishedRoutes: Routes = [
  {
    path: 'finished',
    loadComponent: () =>
      import('./finished.component').then((m) => m.FinishedComponent),
    children: [
      {
        path: 'list',
        loadComponent: () =>
          import('./pages/finished-list/finished-list.component').then(
            (m) => m.FinishedListComponent
          ),
      },
      {
        path: 'detail/:docnum',
        loadComponent: () =>
          import('./pages/finished-detail/finished-detail.component').then(
            (m) => m.FinishedDetailComponent
          ),
      },
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full',
      },
    ],
  },
];
