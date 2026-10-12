import { Warehouse } from './warehouse.model';

export interface WarehouseBinModel {
  L1: string;
  L2: string;
  L3: string;
  OldCode: any;
  WarehouseModel: Warehouse;
  isDefault: boolean;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

