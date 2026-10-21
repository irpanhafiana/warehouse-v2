export interface AppVersionInfo {
  versionCode: number;
  versionName: string;
  minVersionCode?: number;
  forceUpdate?: boolean;
  downloadUrl: string;
  changelog?: string[];
  releaseDate?: string;
}

