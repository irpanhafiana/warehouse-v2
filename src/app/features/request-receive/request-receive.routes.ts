import { Routes } from '@angular/router';
import { RequestReceiveComponent } from './request-receive.component';
import { RequestReceiveListComponent } from './pages/request-receive-list/request-receive-list.component';
import { RequestReceiveDetailComponent } from './pages/request-receive-detail/request-receive-detail.component';
import { RequestReceiveChecklistComponent } from './pages/request-receive-checklist/request-receive-checklist.component';
import { RequestReceiveListProcessedComponent } from './pages/request-receive-list-processed/request-receive-list-processed.component';
import { RequestReceiveHistoryComponent } from './pages/request-receive-history/request-receive-history.component';
import { RequestReceiveHistoryDetailComponent } from './pages/request-receive-history-detail/request-receive-history-detail.component';

export const requestReceiveRoutes: Routes = [
  {
    path: 'request-receive',
    component: RequestReceiveComponent,
    children: [
      {
        path: 'list',
        component: RequestReceiveListComponent,
      },
      {
        path: 'processed-bon',
        component: RequestReceiveListProcessedComponent,
      },
      {
        path: 'detail/:docnum',
        component: RequestReceiveDetailComponent,
      },
      {
        path: 'checklist/:docnum',
        component: RequestReceiveChecklistComponent,
      },
      {
        path: 'detail-history/:docnum',
        component: RequestReceiveHistoryDetailComponent,
      },
      {
        path: 'history',
        component: RequestReceiveHistoryComponent,
      },
    ],
  },
];

