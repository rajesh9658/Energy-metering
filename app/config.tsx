// app/config.ts

const API_CONFIG = {
  BASE_URL: "http://192.168.68.117:8000",

  ENDPOINTS: {
    LOGIN: "/api/mobile-login",
    SITE_DATA: "/api/mobile/site/", // New endpoint for site data
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

export default function ConfigInfo() {
  return null;
}