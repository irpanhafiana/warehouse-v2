import { TeamModel } from './team.model';

export interface SalesPickingModel {
  PickingStatus: string;
  TeamModel: TeamModel;
  Checker: any;
  Pickers: string;
  PickersName: string;
  BoxUsed: number;
  Id: number;
  Remarks: any;
}

