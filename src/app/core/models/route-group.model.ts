export interface RouteGroup {
  RouteName: string;
  Details: Array<{
    Area: string;
    DocNum: string;
    DocDate: string;
    Code: string;
    Name: string;
    Details: number;
    Id: number;
    Remarks: string;
    newlyAdded?: boolean;
    IsFinishLoad?: boolean;
  }>;
  Id: number;
  Remarks: string;
  Alias: string;
}

