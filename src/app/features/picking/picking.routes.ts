import { Routes } from '@angular/router';

export const pickingRoutes: Routes = [
  {
    path: 'picking',
    loadComponent: () =>
      import('./picking.component').then((m) => m.PickingComponent),
    children: [
      {
        path: 'list',
        loadComponent: () =>
          import('./pages/picking-list/picking-list.component').then(
            (m) => m.PickingListComponent
          ),
        data: { title: 'Picking List' },
      },
      {
        path: 'list/:docnum',
        loadComponent: () =>
          import('./pages/picking-list/picking-list.component').then(
            (m) => m.PickingListComponent
          ),
        data: { title: 'Picking List' },
      },
      {
        path: 'checklist/:docnum/:date',
        loadComponent: () =>
          import(
            './pages/picking-checklist/picking-checklist.component'
          ).then((m) => m.PickingChecklistComponent),
      },
    ],
  },
];
