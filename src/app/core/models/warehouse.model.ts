import { Branch } from './branch.model';

export interface Warehouse {
  BranchModel: Branch;
  DefaultBinModel: any;
  isVendorLocation: boolean;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

