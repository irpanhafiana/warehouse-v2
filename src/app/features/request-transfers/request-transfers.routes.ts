import { Routes } from '@angular/router';
import { RequestTransfersComponent } from './request-transfers.component';
import { ReqtransPickingListComponent } from './pages/reqtrans-picking-list/reqtrans-picking-list.component';
import { ReqtransPickingChecklistComponent } from './pages/reqtrans-picking-checklist/reqtrans-picking-checklist.component';
import { ReqtransLoadingListComponent } from './pages/reqtrans-loading-list/reqtrans-loading-list.component';
import { ReqtransLoadingChecklistComponent } from './pages/reqtrans-loading-checklist/reqtrans-loading-checklist.component';
import { ReqtransGoodsDeliveryListComponent } from './pages/reqtrans-goods-delivery-list/reqtrans-goods-delivery-list.component';
import { ReqtransGoodsDeliveryFormComponent } from './pages/reqtrans-goods-delivery-form/reqtrans-goods-delivery-form.component';
import { ReqtransGoodsDeliveryDetailComponent } from './pages/reqtrans-goods-delivery-detail/reqtrans-goods-delivery-detail.component';

export const requestTransfersRoutes: Routes = [
  {
    path: '',
    component: RequestTransfersComponent,
    children: [
      {
        path: 'picking/list',
        component: ReqtransPickingListComponent,
      },
      {
        path: 'picking/list/:docnum',
        component: ReqtransPickingListComponent,
      },
      {
        path: 'picking/checklist/:docnum/:date',
        component: ReqtransPickingChecklistComponent,
      },
      {
        path: 'loading/list',
        component: ReqtransLoadingListComponent,
      },
      {
        path: 'loading/checklist/:customerCode/:date/:docnum',
        component: ReqtransLoadingChecklistComponent,
      },
      {
        path: 'goods-delivery/list',
        component: ReqtransGoodsDeliveryListComponent,
      },
      {
        path: 'goods-delivery/add-to-delivery/:docnum/:customerName',
        component: ReqtransGoodsDeliveryFormComponent,
      },
      {
        path: 'goods-delivery/detail/:date/:transportUnit/:status',
        component: ReqtransGoodsDeliveryDetailComponent,
      },
    ],
  },
];

