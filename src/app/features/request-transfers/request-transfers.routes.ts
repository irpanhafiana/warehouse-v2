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
            './pages/reqtrans-picking-list/reqtrans-picking-list.component'
          ).then((m) => m.ReqtransPickingListComponent),
      },
      {
        path: 'picking/list/:docnum',
        loadComponent: () =>
          import(
            './pages/reqtrans-picking-list/reqtrans-picking-list.component'
          ).then((m) => m.ReqtransPickingListComponent),
      },
      {
        path: 'picking/checklist/:docnum/:date',
        loadComponent: () =>
          import(
            './pages/reqtrans-picking-checklist/reqtrans-picking-checklist.component'
          ).then((m) => m.ReqtransPickingChecklistComponent),
      },
      {
        path: 'loading/list',
        loadComponent: () =>
          import(
            './pages/reqtrans-loading-list/reqtrans-loading-list.component'
          ).then((m) => m.ReqtransLoadingListComponent),
      },
      {
        path: 'loading/checklist/:customerCode/:date/:docnum',
        loadComponent: () =>
          import(
            './pages/reqtrans-loading-checklist/reqtrans-loading-checklist.component'
          ).then((m) => m.ReqtransLoadingChecklistComponent),
      },
      {
        path: 'goods-delivery/list',
        loadComponent: () =>
          import(
            './pages/reqtrans-goods-delivery-list/reqtrans-goods-delivery-list.component'
          ).then((m) => m.ReqtransGoodsDeliveryListComponent),
      },
      {
        path: 'goods-delivery/add-to-delivery/:docnum/:customerName',
        loadComponent: () =>
          import(
            './pages/reqtrans-goods-delivery-form/reqtrans-goods-delivery-form.component'
          ).then((m) => m.ReqtransGoodsDeliveryFormComponent),
      },
      {
        path: 'goods-delivery/detail/:date/:transportUnit/:status',
        loadComponent: () =>
          import(
            './pages/reqtrans-goods-delivery-detail/reqtrans-goods-delivery-detail.component'
          ).then((m) => m.ReqtransGoodsDeliveryDetailComponent),
      },
    ],
  },
];
