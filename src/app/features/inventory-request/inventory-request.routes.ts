import { Routes } from '@angular/router';
import { InventoryRequestComponent } from './inventory-request.component';
import { InventoryRequestListComponent } from './pages/inventory-request-list/inventory-request-list.component';
import { InventoryRequestViewComponent } from './pages/inventory-request-view/inventory-request-view.component';

export const inventoryRequestRoutes: Routes = [
  {
    path: 'inventory-request',
    component: InventoryRequestComponent,
    children: [
      {
        path: 'list',
        component: InventoryRequestListComponent,
      },
      {
        path: 'view/:docnum',
        component: InventoryRequestViewComponent,
      },
    ],
  },
];

