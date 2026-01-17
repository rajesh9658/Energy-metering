// app/config.ts

const API_CONFIG = {
  // BASE_URL: "http://192.168.68.112:8000",
  BASE_URL: "https://em.sochiot.com",


  ENDPOINTS: {
    LOGIN: "/api/mobile-login",
    SITE_DATA: "/api/mobile/site/", // New endpoint for site data
    METER_CURRENT: "/api/meter/{siteId}/current",
    METER_DAILY_CONSUMPTION: "/api/meter/{siteId}/daily-consumption",
    METER_MONTHLY_CONSUMPTION: "/api/meter/{siteId}/monthly-consumption",
    METER_YEARLY_CONSUMPTION: "/api/meter/{siteId}/consumption/yearly",
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



export default function ConfigInfo() {
  return null;
}