// AuthContext.js
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
  // Helper functions
  getSiteId: () => null,
  getSlug: () => null,
  getSiteName: () => null,
  updateUserData: async (newData) => {},
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
        const parsedData = JSON.parse(userData);
        setUser(parsedData);
      }
    } catch (error) {
      console.error("Error checking login status:", error);
    } finally {
      setLoading(false);
    }
  };

  // const login = async (userid, password) => { 
  //   if (!userid.trim() || !password.trim()) {
  //     const msg = "Please fill all fields";
  //     setError(msg);
  //     return { success: false, message: msg };
  //   }

  //   try {
  //     setError("");
      
  //     const apiUrl = getApiUrl("/api/mobile-login");
      
  //     const response = await fetch(apiUrl, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         "Accept": "application/json",
  //       },
  //       body: JSON.stringify({
  //         userid: userid.trim(), 
  //         password: password.trim()
  //       }),
  //     });
      
  //     const data = await response.json();
  //     // console.log("Login response data:", data.site.site_name);
  //     if (data.status === true) {
  //       const userToStore = {
  //         name: userid, 
  //         site_id: data.site.site_id,
  //         site_name: data.site.site_name,
  //         slug: data.site.slug,
  //         device_id: data.site.device_id,
  //         clusterID: data.site.clusterID,
  //         // Save all data that might come from API
  //         ...data
  //       };

  //       // Save all data to AsyncStorage
  //       await AsyncStorage.setItem("userData", JSON.stringify(userToStore));
  //       await AsyncStorage.setItem("authToken", data.device_id || "");

  //       setUser(userToStore);
  //       return { success: true, message: data.message };
        
  //     } else {
  //       const errorMsg = data.message || `Login failed. Status: ${response.status}`;
  //       setError(errorMsg);
  //       return { success: false, message: errorMsg };
  //     }
      
  //   } catch (e) {
  //     const errorMsg = `A network error occurred. Please ensure your API is running and accessible. Error: ${e.message}`;
  //     setError(errorMsg);
  //     return { success: false, message: "A network error occurred." };
  //   }
  // };

  // In AuthContext.tsx, update the login function:

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
    
    // Check for first-time login requiring password change
    if (data.status === false && data.force_password_change === true) {
      return { 
        success: false, 
        message: data.message || "Password change required",
        forcePasswordChange: true,
        email: data.User_id || userid.trim()  // Make sure email is returned
      };
    }
    
    if (data.status === true) {
      const userToStore = {
        name: userid.trim(),  // Make sure it's trimmed
        site_id: data.site?.site_id,
        site_name: data.site?.site_name,
        slug: data.site?.slug,
        device_id: data.site?.device_id,
        clusterID: data.site?.clusterID,
        ...data
      };

      await AsyncStorage.setItem("userData", JSON.stringify(userToStore));
      await AsyncStorage.setItem("authToken", data.device_id || "");

      setUser(userToStore);
      return { success: true, message: data.message };
      
    } else {
      const errorMsg = data.message || `Login failed. Status: ${response.status}`;
      setError(errorMsg);
      return { success: false, message: errorMsg };
    }
    
  } catch (e) {
    const errorMsg = `A network error occurred. Please ensure your API is running and accessible. Error: ${e.message}`;
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

  // Helper functions
  const getSiteId = () => {
    return user?.site_id || null;
  };

  const getSlug = () => {
    return user?.slug || null;
  };

  const getSiteName = () => {
    return user?.site_name || null;
  };

  // Update user data if needed
  const updateUserData = async (newData) => {
    try {
      const updatedUser = { ...user, ...newData };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error("Error updating user data:", error);
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
        setError,
        getSiteId,
        getSlug,
        getSiteName,
        updateUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default function AuthContextWrapper() {
  return null;
}


////this is test