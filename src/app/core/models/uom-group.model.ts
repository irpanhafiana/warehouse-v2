import { AlternateUoMmodel } from './alternate-uom.model';

export interface UoMgroupModel {
  details: Detail2[];
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface Detail2 {
  alternateUoMModel: AlternateUoMmodel;
  alternateQuantity: number;
  baseUoMModel: BaseUoMmodel;
  baseQuantity: number;
  uomPackage: string;
  Id: number;
  Remarks: any;
}

export interface BaseUoMmodel {
  SortBy: number;
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}
