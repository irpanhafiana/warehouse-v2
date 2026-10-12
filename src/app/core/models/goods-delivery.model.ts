export interface GoodsDelivery {
  Alias: string;
  BasedSalesInvoiceDocNum: string;
  Details: GoodsDeliveryData[];
  DocDate: string;
  Driver: string;
  Id: string;
  Remarks: string;
  TransportUnit: string;
}

export interface GoodsDeliveryData {
  Data: string;
  Id: number;
  Remarks: string;
  Alias: string | null;
}

