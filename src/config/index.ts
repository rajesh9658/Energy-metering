// src/config/index.ts

const DEFAULT_API_BASE_URL = "https://em.sochiot.com";
// const DEFAULT_API_BASE_URL = "http://192.168.68.124:8000";

export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,    

  ENDPOINTS: {
    LOGIN: "/api/mobile-login",
    SITE_DATA: "/api/mobile/site/",
    METER_CURRENT: "/api/meter/{siteId}/current2",
    METER_DAILY_CONSUMPTION: "/api/meter/{siteId}/daily-consumptionV2",
    METER_MONTHLY_CONSUMPTION: "/api/meter/{siteId}/monthly-consumptionV2",
    METER_YEARLY_CONSUMPTION: "/api/meter/{siteId}/consumption/yearlyv2",
    CHANGE_PASSWORD: "/api/changeFirstTimePassword",
    METER_MONTHLY_REPORT: "/api/meter/{siteId}/consumption/monthly_report",
    RAZORPAY_ORDER: "/api/razorpay/order",
    RAZORPAY_VERIFY: "/api/razorpay/verify",
    WALLET_TRANSACTIONS: "/api/v1/wallet/transactions",
    
    // Recharge Fee Settings Endpoints
    RECHARGE_FEE_CONFIG: "/api/v1/recharge/fee-config",
    RECHARGE_FEE_QUOTE: "/api/v1/recharge/fee-quote",
  },
};

export const getApiUrl = (endpoint: string) => {
  return API_CONFIG.BASE_URL + endpoint;
};

export const getWalletTransactionsUrl = (siteId: string | number, type?: string, fromDate?: string) => {
  const baseUrl = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.WALLET_TRANSACTIONS;
  const params: string[] = [];
  if (siteId) params.push(`site_id=${siteId}`);
  if (type) params.push(`type=${type}`);
  if (fromDate) params.push(`from_date=${fromDate}`);
  
  return params.length > 0 ? `${baseUrl}?${params.join("&")}` : baseUrl;
};

export const getSiteDataUrl = (siteName: string) => {
  return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SITE_DATA + siteName;
};

export const getMeterCurrentUrl = (siteId: string | number) => {
  return (
    API_CONFIG.BASE_URL + 
    API_CONFIG.ENDPOINTS.METER_CURRENT.replace("{siteId}", siteId.toString())
  );
};

export const getMeterDailyConsumptionUrl = (siteId: string | number, month: string) => {
  const baseUrl = (
    API_CONFIG.BASE_URL + 
    API_CONFIG.ENDPOINTS.METER_DAILY_CONSUMPTION.replace("{siteId}", siteId.toString())
  );
  return `${baseUrl}?month=${month}`;
};

export const getMeterMonthlyConsumptionUrl = (siteId: string | number, month: string) => {
  const baseUrl = (
    API_CONFIG.BASE_URL + 
    API_CONFIG.ENDPOINTS.METER_MONTHLY_CONSUMPTION.replace("{siteId}", siteId.toString())
  );
  return `${baseUrl}?month=${month}`;
};

export const getYearlyConsumptionUrl = (siteId: string | number) => {
  return (
    API_CONFIG.BASE_URL +
    API_CONFIG.ENDPOINTS.METER_YEARLY_CONSUMPTION.replace(
      "{siteId}",
      siteId.toString()
    )
  );
};

export const getChangePasswordUrl = () => {
  return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.CHANGE_PASSWORD;
};

export const getMeterMonthlyReportUrl = (siteId: string | number, month?: string) => {
  const baseUrl = (
    API_CONFIG.BASE_URL + 
    API_CONFIG.ENDPOINTS.METER_MONTHLY_REPORT.replace("{siteId}", siteId.toString())
  );
  
  if (month) {
    return `${baseUrl}?month=${month}`;
  }
  return baseUrl;
};

export const getRazorpayOrderUrl = () => {
  return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.RAZORPAY_ORDER;
};

export const getRazorpayVerifyUrl = () => {
  return API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.RAZORPAY_VERIFY;
};

// Fee Config & Quote URL Helpers
export const getRechargeFeeConfigUrl = (siteId?: string | number) => {
  const baseUrl = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.RECHARGE_FEE_CONFIG;
  return siteId ? `${baseUrl}?site_id=${siteId}` : baseUrl;
};

export const getRechargeFeeQuoteUrl = (amount: number | string, siteId?: string | number) => {
  const baseUrl = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.RECHARGE_FEE_QUOTE;
  const params: string[] = [`amount=${encodeURIComponent(amount)}`];
  if (siteId) params.push(`site_id=${siteId}`);
  return `${baseUrl}?${params.join("&")}`;
};
