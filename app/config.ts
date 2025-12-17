// app/config.ts

const API_CONFIG = {
  BASE_URL: "http://192.168.68.123:8000",

  ENDPOINTS: {
    LOGIN: "/api/mobile-login",
  },
};

export const getApiUrl = (endpoint: string) => {
  const url = API_CONFIG.BASE_URL + endpoint;
  return url;
};

export default function ConfigInfo() {
  return null;
}
