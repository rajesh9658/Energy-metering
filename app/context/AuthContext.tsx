
import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { getApiUrl } from "../config"; 

const AuthContext = createContext({
  user: null,
  loading: true,
  error: "",
  login: async (userid, password) => ({ success: false, message: "" }), 
  logout: async () => {},
  setError: (msg) => {},
});

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

  const login = async (userid, password) => { 
    if (!userid.trim() || !password.trim()) {
      const msg = "Please fill all fields";
      setError(msg);
      return { success: false, message: msg };
    }

    try {
      setError("");
      
      const apiUrl = getApiUrl("/api/mobile-login");
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          
          userid: userid.trim(), 
          password: password.trim()
        }),
      });
      
      
      const data = await response.json();

      if (data.status === true) {
        const userToStore = {
          name: userid, 
          site_id: data.site_id,
          site_name: data.site_name,
          slug: data.slug,
          device_id: data.device_id,
          clusterID: data.clusterID
        };

        await AsyncStorage.setItem("authToken", data.device_id);
        await AsyncStorage.setItem("userData", JSON.stringify(userToStore));

        setUser(userToStore);
        return { success: true, message: data.message };
        
      } else {
        
        const errorMsg = data.message || `Login failed. Status: ${response.status}`;
        setError(errorMsg);
        return { success: false, message: errorMsg };
      }
      
    } catch (e) {
      
      const errorMsg = `A network error occurred. Please ensure your API is running and accessible at ${apiUrl}. Error: ${e.message}`;
      setError(errorMsg);
      return { success: false, message: "A network error occurred." };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("userData");
      setUser(null);
      setError("");
      Alert.alert("Logout", "You have been successfully logged out.");
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

export default function AuthContextWrapper() {
  return null;
}