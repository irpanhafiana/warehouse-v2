import { Routes } from '@angular/router';

export const requestTransfersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./request-transfers.component').then(
        (m) => m.RequestTransfersComponent
      ),
    children: [
      {
        path: 'picking/list',
        loadComponent: () =>
          import(
            './pages/transfer-picking-list/transfer-picking-list.component'
          ).then((m) => m.TransferPickingListComponent),
      },
      {
        path: 'picking/list/:docnum',
        loadComponent: () =>
          import(
            './pages/transfer-picking-list/transfer-picking-list.component'
          ).then((m) => m.TransferPickingListComponent),
      },
      {
        path: 'picking/checklist/:docnum/:date',
        loadComponent: () =>
          import(
            './pages/transfer-picking-checklist/transfer-picking-checklist.component'
          ).then((m) => m.TransferPickingChecklistComponent),
      },
      {
        path: 'loading/list',
        loadComponent: () =>
          import(
            './pages/transfer-loading-list/transfer-loading-list.component'
          ).then((m) => m.TransferLoadingListComponent),
      },
      {
        path: 'loading/checklist/:customerCode/:date/:docnum',
        loadComponent: () =>
          import(
            './pages/transfer-loading-checklist/transfer-loading-checklist.component'
          ).then((m) => m.TransferLoadingChecklistComponent),
      },
      {
        path: 'goods-delivery/list',
        loadComponent: () =>
          import(
            './pages/transfer-goods-delivery-list/transfer-goods-delivery-list.component'
          ).then((m) => m.TransferGoodsDeliveryListComponent),
      },
      {
        path: 'goods-delivery/add-to-delivery/:docnum/:customerName',
        loadComponent: () =>
          import(
            './pages/transfer-goods-delivery-form/transfer-goods-delivery-form.component'
          ).then((m) => m.TransferGoodsDeliveryFormComponent),
      },
      {
        path: 'goods-delivery/form/:docnum/:customerName',
        loadComponent: () =>
          import(
            './pages/transfer-goods-delivery-form/transfer-goods-delivery-form.component'
          ).then((m) => m.TransferGoodsDeliveryFormComponent),
      },
      {
        path: 'goods-delivery/detail/:date/:transportUnit/:status',
        loadComponent: () =>
          import(
            './pages/transfer-goods-delivery-detail/transfer-goods-delivery-detail.component'
          ).then((m) => m.TransferGoodsDeliveryDetailComponent),
      },
      {
        path: '',
        redirectTo: 'picking/list',
        pathMatch: 'full',
      },
    ],
  },
];
