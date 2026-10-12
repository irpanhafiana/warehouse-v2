import { EmployeeModel } from './employee.model';

export interface TeamModel {
  Details: Detail3[];
  LocationModels: any[];
  Code: string;
  Description: string;
  Alias: any;
  Id: number;
  Remarks: any;
}

export interface Detail3 {
  EmployeeModel: EmployeeModel;
  Id: number;
  Remarks: any;
}

