import { Area } from './area.model';
import { BpGroup } from './bp-group.model';

export interface Customer {
  Balance: number;
  CustomerName: string;
  PointReward: number;
  OverallPointReward: number;
  PIC: string;
  Phone: string;
  Fax: string;
  Mobile: string;
  BPGroup: BpGroup;
  BusinessPartnerGroup_Id: number;
  Area: Area;
  Area_Id: number;
  SalesmanNIK: string;
  Addresses: any[];
  CreditLimit: number;
  isTaxCount: boolean;
  PIN: string;
  Salt: string;
  EmailAddress: string;
  OutstandingBills: number;
  PaymentDays: string;
  PaymentDueDays: number;
  LimitType: string;
  NIK: string;
  DisplayMembership: string;
  MembershipBarcode: string;
  DeliveryDays: string;
  FeesRokok: number;
  FeesNonRokok: number;
  isFromInternalMessage: boolean;
  Latitude: number;
  Longitude: number;
  Accuracy: number;
  TransportType: string;
  Behaviour: string;
  BirthDate: string;
  Photos: any[];
  ExternalInfo: any;
  Code: string;
  Description: any;
  Alias: any;
  Id: number;
  Remarks: any;
}

