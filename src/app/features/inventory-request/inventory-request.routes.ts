import { Routes } from '@angular/router';

export const inventoryRequestRoutes: Routes = [
  {
    path: 'inventory-request',
    loadComponent: () =>
      import('./inventory-request.component').then(
        (m) => m.InventoryRequestComponent
      ),
    children: [
      {
        path: 'list',
        loadComponent: () =>
          import(
            './pages/inventory-request-list/inventory-request-list.component'
          ).then((m) => m.InventoryRequestListComponent),
      },
      {
        path: 'view/:docnum',
        loadComponent: () =>
          import(
            './pages/inventory-request-view/inventory-request-view.component'
          ).then((m) => m.InventoryRequestViewComponent),
      },
    ],
  },
];
