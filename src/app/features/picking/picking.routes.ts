import { Routes } from '@angular/router';
import { PickingComponent } from './picking.component';
import { PickingListComponent } from './pages/picking-list/picking-list.component';
import { PickingChecklistComponent } from './pages/picking-checklist/picking-checklist.component';

export const pickingRoutes: Routes = [
  {
    path: 'picking',
    component: PickingComponent,
    children: [
      {
        path: 'list',
        component: PickingListComponent,
        data: { title: 'Picking List' },
      },
      {
        path: 'list/:docnum',
        component: PickingListComponent,
        data: { title: 'Picking List' },
      },
      {
        path: 'checklist/:docnum/:date',
        component: PickingChecklistComponent,
      },
    ],
  },
];

