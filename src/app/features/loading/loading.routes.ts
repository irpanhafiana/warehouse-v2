import { Routes } from '@angular/router';
import { LoadingComponent } from './loading.component';
import { LoadingListComponent } from './pages/loading-list/loading-list.component';
import { LoadingChecklistComponent } from './pages/loading-checklist/loading-checklist.component';
import { LoadingAddToDeliveryComponent } from './pages/loading-add-to-delivery/loading-add-to-delivery.component';
import { LoadingConfirmationComponent } from './pages/loading-confirmation/loading-confirmation.component';

export const loadingRoutes: Routes = [
  {
    path: 'loading',
    component: LoadingComponent,
    children: [
      {
        path: 'list',
        component: LoadingListComponent,
      },
      {
        path: 'checklist/:customerCode/:date/:docnum',
        component: LoadingChecklistComponent,
      },
      {
        path: 'checklist/:docnum',
        component: LoadingChecklistComponent,
      },
      {
        path: 'add-to-delivery/:docnum',
        component: LoadingAddToDeliveryComponent,
      },
      {
        path: 'confirmation/:docnum',
        component: LoadingConfirmationComponent,
      },
    ],
  },
];

