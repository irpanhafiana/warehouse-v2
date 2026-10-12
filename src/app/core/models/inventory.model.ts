export interface Inventory {
  isLocked: boolean;
  LastUpdatedBy: any;
  ApprovalStatus: string;
  Approver: string;
  ApprovalDate: string;
  Details: InventoryDetail[];
  WarehouseModel: WarehouseModel;
  TransportUnitModel: TransportUnitModel;
  DocNum: string;
  DocDate: string;
  DocDueDate: string;
  DeliveryDate: string;
  DocStatus: string;
  DeliveryStatus: any;
  POSDocNum: any;
  Id: number;
  Remarks: any;
  Alias: any;
  Note: any;
  DetailsCount: number;
}

export interface InventoryDetail {
  ApprovalQuantity: number;
  ApprovalBaseQuantity: number;
  ApprovalOpenQuantity: number;
  OpenQuantity: number;
  InStockQuantity: any;
  ApprovalUoMModel: ApprovalUoMModel;
  ToWarehouseModel: ToWarehouseModel;
  ToWarehouseBinModel: any;
  LineNo: number;
  DocType: string;
  BasedDocType: string;
  TargetDocType: any;
  LineStatus: string;
  ProductModel: ProductModel;
  Quantity: number;
  QuantityScanned: number;
  BaseQuantity: number;
  UoMModel: UoMModel;
  WarehouseModel: WarehouseModel;
  WarehouseBinModel: WarehouseBinModel;
  Id: number;
  Remarks: any;
  Alias: any;
  sebagianValue: number;
}

export interface ApprovalUoMModel {
  SortBy: number;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface ToWarehouseModel {
  BranchModel: BranchModel;
  DefaultBinModel: any;
  isVendorLocation: boolean;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface BranchModel {
  Latitude: number;
  Longitude: number;
  Accuracy: number;
  ImageUrl: any;
  NominalPerPointRokok: number;
  NominalPerPointRokokCredit: number;
  MultiplyPointFullPaymentRokok: number;
  NominalPerPointNonRokok: number;
  NominalPerPointNonRokokCredit: number;
  MultiplyPointFullPaymentNonRokok: number;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface ProductModel {
  isTaxCount: boolean;
  PricesModel: any;
  Manufacturer_Id: number;
  ManufacturerModel: ManufacturerModel;
  Brand: string;
  ItemGroup: ItemGroupModel;
  isInactive: boolean;
  isInOpname: boolean;
  Barcode2: string;
  Barcode3: string;
  Barcode4: string;
  NominalPoint: number;
  isCalculatePrice: boolean;
  isForSalesmanWeb: boolean;
  Name: string;
  isInventoryItem: boolean;
  isSalesItem: boolean;
  isPurchaseItem: boolean;
  BasePrice: number;
  Barcode: string;
  ItemGroup_Id: number;
  UoMGroup_Id: number;
  UoMGroupModel: UoMGroupModel;
  ProductImageUrl: any;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface ManufacturerModel {
  Description: string;
  Id: number;
  Remarks: any;
  Alias: any;
}

export interface ItemGroupModel {
  NominalPerPoint: number;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface UoMGroupModel {
  details: DetailUoM[];
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface DetailUoM {
  alternateUoMModel: AlternateUoMModel;
  alternateQuantity: number;
  baseUoMModel: BaseUoMModel;
  baseQuantity: number;
  uomPackage: string;
  Id: number;
  Remarks: any;
  Alias: any;
}

export interface AlternateUoMModel {
  SortBy: number;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface BaseUoMModel {
  SortBy: number;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface UoMModel {
  SortBy: number;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface WarehouseModel {
  BranchModel: BranchModel;
  DefaultBinModel: any;
  isVendorLocation: boolean;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface WarehouseBinModel {
  L1: string;
  L2: string;
  L3: string;
  OldCode: any;
  WarehouseModel: WarehouseModel;
  isDefault: boolean;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface TransportUnitModel {
  Code: string;
}

