// app/config.ts

const API_CONFIG = {
  BASE_URL: "https://em.sochiot.com",

  ENDPOINTS: {
    LOGIN: "/api/mobile-login",
    SITE_DATA: "/api/mobile/site/",
    METER_CURRENT: "/api/meter/{siteId}/current",
    METER_DAILY_CONSUMPTION: "/api/meter/{siteId}/daily-consumption",
    METER_MONTHLY_CONSUMPTION: "/api/meter/{siteId}/consumption/yearly",
  },
};

export const getApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const getSiteDataUrl = (siteName: string) => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SITE_DATA}${siteName}`;
};

export const getMeterCurrentUrl = (siteId: string | number) => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.METER_CURRENT.replace(
    "{siteId}",
    siteId.toString()
  )}`;
};

export const getMeterDailyConsumptionUrl = (
  siteId: string | number,
  month: string
) => {
  const baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.METER_DAILY_CONSUMPTION.replace(
    "{siteId}",
    siteId.toString()
  )}`;
  return `${baseUrl}?month=${month}`;
};

export const getMeterMonthlyConsumptionUrl = (
  siteId: string | number,
  year: string
) => {
  const baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.METER_MONTHLY_CONSUMPTION.replace(
    "{siteId}",
    siteId.toString()
  )}`;
  return `${baseUrl}?year=${year}`;
};

export default function ConfigInfo() {
  return null;
}
