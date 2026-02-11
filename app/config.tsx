// app/config.ts

const API_CONFIG = {

  // BASE_URL: "http://192.168.68.129:8004",
  BASE_URL: "https://em.sochiot.com",



  ENDPOINTS: {
    LOGIN: "/api/mobile-login",
    SITE_DATA: "/api/mobile/site/", // New endpoint for site data
    METER_CURRENT: "/api/meter/{siteId}/current",
    METER_DAILY_CONSUMPTION: "/api/meter/{siteId}/daily-consumption",
    METER_MONTHLY_CONSUMPTION: "/api/meter/{siteId}/monthly-consumption",
    METER_YEARLY_CONSUMPTION: "/api/meter/{siteId}/consumption/yearly",
    CHANGE_PASSWORD: "/api/changeFirstTimePassword", // Add this
    METER_MONTHLY_REPORT: "/api/meter/{siteId}/consumption/monthly_report",
  },
};

export const getApiUrl = (endpoint: string) => {
  const url = API_CONFIG.BASE_URL + endpoint;
  return url;
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

export default function ConfigInfo() {
  return null;
}