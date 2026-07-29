// app/config.ts

const API_CONFIG = {

  BASE_URL: "http://192.168.68.131:8000",
  // BASE_URL: "https://em.sochiot.com",

  ENDPOINTS: {
    LOGIN: "/api/mobile-login",
    SITE_DATA: "/api/mobile/site/", // New endpoint for site data
    METER_CURRENT: "/api/meter/{siteId}/current2",
    METER_DAILY_CONSUMPTION: "/api/meter/{siteId}/daily-consumptionV2",
    METER_MONTHLY_CONSUMPTION: "/api/meter/{siteId}/monthly-consumptionV2",
    METER_YEARLY_CONSUMPTION: "/api/meter/{siteId}/consumption/yearlyv2",
    CHANGE_PASSWORD: "/api/changeFirstTimePassword", // Add this
    METER_MONTHLY_REPORT: "/api/meter/{siteId}/consumption/monthly_report",
    RAZORPAY_ORDER: "/api/razorpay/order",
    RAZORPAY_VERIFY: "/api/razorpay/verify",
    WALLET_TRANSACTIONS: "/api/v1/wallet/transactions",
  },
};

export const getApiUrl = (endpoint: string) => {
  const url = API_CONFIG.BASE_URL + endpoint;
  return url;
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
  const url = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SITE_DATA + siteName;
  return url;
  
};

export const getMeterCurrentUrl = (siteId: string | number) => {
  const url = API_CONFIG.BASE_URL + 
    API_CONFIG.ENDPOINTS.METER_CURRENT.replace("{siteId}", siteId.toString());
  return url;
};

export const getMeterDailyConsumptionUrl = (siteId: string | number, month: string) => {
  const baseUrl = API_CONFIG.BASE_URL + 
    API_CONFIG.ENDPOINTS.METER_DAILY_CONSUMPTION.replace("{siteId}", siteId.toString());
  return `${baseUrl}?month=${month}`;
};

export const getMeterMonthlyConsumptionUrl = (siteId: string | number, month: string) => {
  const baseUrl = API_CONFIG.BASE_URL + 
    API_CONFIG.ENDPOINTS.METER_MONTHLY_CONSUMPTION.replace("{siteId}", siteId.toString());
  return `${baseUrl}?month=${month}`;
};
export const getYearlyConsumptionUrl = (siteId) => {
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
  const baseUrl = API_CONFIG.BASE_URL + 
    API_CONFIG.ENDPOINTS.METER_MONTHLY_REPORT.replace("{siteId}", siteId.toString());
  
  // Optional: Add month parameter if provided
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

export default function ConfigInfo() {
  return null;
}

