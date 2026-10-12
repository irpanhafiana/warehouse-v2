import { Branch } from './branch.model';

export interface EmployeeModel {
  NIK: string;
  FirstName: string;
  LastName: string;
  MobileNumber: string;
  BranchModel: Branch;
  EmployeeType: string;
  SalesTargetModels: any[];
  Id: number;
  Remarks: any;
}

