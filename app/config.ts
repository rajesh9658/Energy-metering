// app/config.ts

const API_CONFIG = {
  // Android Emulator के लिए फिक्स्ड IP एड्रेस
  BASE_URL: "http://192.168.68.131:8000", 
  
  ENDPOINTS: {
    LOGIN: "/api/mobile-login",
  },
};

export const getApiUrl = (endpoint: string) => {
  const url = API_CONFIG.BASE_URL + endpoint;
  // console.log("🔧 API URL:", url); // आप इसे कंसोल में देखने के लिए अनकमेंट कर सकते हैं
  return url;
};

// Default export
export default function ConfigInfo() {
  return null; 
}