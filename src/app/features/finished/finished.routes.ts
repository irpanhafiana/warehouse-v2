import { Routes } from '@angular/router';
import { FinishedComponent } from './finished.component';
import { FinishedListComponent } from './pages/finished-list/finished-list.component';
import { FinishedDetailComponent } from './pages/finished-detail/finished-detail.component';

export const finishedRoutes: Routes = [
  {
    path: 'finished',
    component: FinishedComponent,
    children: [
      {
        path: 'list',
        component: FinishedListComponent,
      },
      {
        path: 'detail/:docnum',
        component: FinishedDetailComponent,
      },
      {
        path: '',
        redirectTo: 'list',
        pathMatch: 'full',
      },
    ],
  },
];

