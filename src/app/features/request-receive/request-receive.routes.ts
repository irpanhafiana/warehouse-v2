import { Routes } from '@angular/router';

export const requestReceiveRoutes: Routes = [
  {
    path: 'request-receive',
    loadComponent: () =>
      import('./request-receive.component').then(
        (m) => m.RequestReceiveComponent
      ),
    children: [
      {
        path: 'list',
        loadComponent: () =>
          import(
            './pages/request-receive-list/request-receive-list.component'
          ).then((m) => m.RequestReceiveListComponent),
      },
      {
        path: 'processed-bon',
        loadComponent: () =>
          import(
            './pages/request-receive-list-processed/request-receive-list-processed.component'
          ).then((m) => m.RequestReceiveListProcessedComponent),
      },
      {
        path: 'detail/:docnum',
        loadComponent: () =>
          import(
            './pages/request-receive-detail/request-receive-detail.component'
          ).then((m) => m.RequestReceiveDetailComponent),
      },
      {
        path: 'checklist/:docnum',
        loadComponent: () =>
          import(
            './pages/request-receive-checklist/request-receive-checklist.component'
          ).then((m) => m.RequestReceiveChecklistComponent),
      },
      {
        path: 'detail-history/:docnum',
        loadComponent: () =>
          import(
            './pages/request-receive-history-detail/request-receive-history-detail.component'
          ).then((m) => m.RequestReceiveHistoryDetailComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import(
            './pages/request-receive-history/request-receive-history.component'
          ).then((m) => m.RequestReceiveHistoryComponent),
      },
    ],
  },
];
