export const environment = {
  production: false,
  api: 'http://192.168.1.15:10100/pos-api/',
  signalRapi: 'http://192.168.1.15:10010',

  posTokenReqUrl: 'token',
  posUsername: 'interface',
  posPassword: 'P@ssw0rd!@#',

  // dev
  is4urlTOKEN: 'http://192.168.1.15:44310/',
  is4urlCMS: 'http://192.168.1.15:42023/',
  is4urlCloud: 'http://192.168.1.15:10100/pos-api/',
  is4PassTokenReqUrl: 'connect/token',
  is4Username: 'dev',
  is4Password: 'QwertY!23',
  is4ClientID: 'B2C_Customer_CMS',
  is4ClientSecret: 'B2C_Customer_CMS',
  is4Scope:
    'B2C_CMS_Scope Create Update Delete Read General_Scope offline_access',

  // Centralized App Update Center (appsmanager.tokossonlineshop.com)
  appId: 'com.sjmart.warehouse',
  versionCheckUrl: 'https://appsmanager.tokossonlineshop.com/api/public/check-update.php',
};
