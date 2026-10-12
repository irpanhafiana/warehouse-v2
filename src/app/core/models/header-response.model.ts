export interface HeaderRes {
  Id: number;
  Area: string;
  DocDate: string;
  DateCreated: string;
  DocNum: string;
  Name: string;
  Note: string;
  Code: string;
  Details: number;
  Receh?: number;
  NonReceh?: number;
  Remarks: string;
  Data?: any;
  total?: number;
  newlyAdded?: boolean;
  IsFinishLoad?: boolean;
  IsCash?: boolean;
  Alias?: string;
  IsCheckout?: boolean;
  MarkBeforeRoute?: boolean;
}

