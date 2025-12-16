// app/config.ts
const API_CONFIG = {
  // FOR ANDROID EMULATOR - Use 10.0.2.2
  BASE_URL: "http://127.0.0.1:8000",
  
  // FOR iOS SIMULATOR - Use localhost
  // BASE_URL: "http://localhost:8000",
  
  ENDPOINTS: {
    LOGIN: "/api/mobile-login",
  },
};

export const getApiUrl = (endpoint: string) => {
  const url = API_CONFIG.BASE_URL + endpoint;
  console.log("🔧 API URL:", url);
  return url;
};

// Default export for route
export default function ConfigInfo() {
  return null; // This is just to satisfy route requirement
}