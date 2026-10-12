import { ItemGroupModel } from './item-group.model';
import { ManufacturerModel } from './manufacturer.model';
import { UoMgroupModel } from './uom-group.model';

export interface ProductModel {
  isTaxCount: boolean;
  PricesModel: any;
  Manufacturer_Id: number;
  ManufacturerModel: ManufacturerModel;
  Brand: string;
  ItemGroup1: string;
  ItemGroup2: string;
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
  ItemGroupModel: ItemGroupModel;
  UoMGroup_Id: number;
  UoMGroupModel: UoMgroupModel;
  ProductImageUrl: string;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

