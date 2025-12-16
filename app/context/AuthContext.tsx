import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "../config";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error("Error checking login status:", error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (name, password) => {
    // Validation
    if (!name.trim() || !password.trim()) {
      setError("Please fill all fields");
      return { success: false, message: "Please fill all fields" };
    }

    console.log("🔄 Login attempt...");

    try {
      setError("");
      
      // Use the correct URL for Android
      const apiUrl = getApiUrl("/api/mobile-login");
      
      console.log("🌐 Calling:", apiUrl);
      console.log("📤 Data:", { name: name.trim(), password: "***" });
      
      // FOR DEVELOPMENT: Temporary mock response
      // Comment this block when real API is working
      console.log("🎭 USING MOCK RESPONSE FOR NOW");
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockResponse = {
        status: true,
        message: "Login successful (Mock Mode)",
        site_id: 1,
        site_name: "Test Site",
        slug: "test-site",
        device_id: `mock-${Date.now()}`,
        clusterID: "mock-cluster"
      };
      
      // Save mock data
      await AsyncStorage.setItem("authToken", mockResponse.device_id);
      await AsyncStorage.setItem("userData", JSON.stringify({
        name: name,
        site_id: mockResponse.site_id,
        site_name: mockResponse.site_name,
        slug: mockResponse.slug,
        device_id: mockResponse.device_id,
        clusterID: mockResponse.clusterID
      }));

      setUser({
        name: name,
        site_id: mockResponse.site_id,
        site_name: mockResponse.site_name,
        slug: mockResponse.slug,
        device_id: mockResponse.device_id,
        clusterID: mockResponse.clusterID
      });

      return { success: true, message: mockResponse.message };
      
      /* UNCOMMENT WHEN REAL API IS WORKING:
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          password: password.trim()
        }),
      });

      console.log("📥 Response status:", response.status);
      
      const data = await response.json();
      console.log("✅ Response data:", data);

      if (data.status === true) {
        await AsyncStorage.setItem("authToken", data.device_id);
        await AsyncStorage.setItem("userData", JSON.stringify({
          name: name,
          site_id: data.site_id,
          site_name: data.site_name,
          slug: data.slug,
          device_id: data.device_id,
          clusterID: data.clusterID
        }));

        setUser({
          name: name,
          site_id: data.site_id,
          site_name: data.site_name,
          slug: data.slug,
          device_id: data.device_id,
          clusterID: data.clusterID
        });

        return { success: true, message: data.message };
      } else {
        setError(data.message || "Invalid credentials");
        return { success: false, message: data.message };
      }
      */
      
    } catch (error) {
      console.error("❌ Login error:", error);
      
      const errorMsg = `Network Error!\n\nFor Android Emulator:\nUse: http://10.0.2.2:8000\n\nCurrent: http://127.0.0.1:8000\n\nFix:\n1. Change URL to 10.0.2.2\n2. Or test on iOS\n3. Or use mock mode (currently active)`;
      
      setError(errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("userData");
      setUser(null);
      setError("");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        loading, 
        error, 
        login, 
        logout,
        setError 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Default export to fix warning
export default function AuthContextWrapper() {
  return null;
}