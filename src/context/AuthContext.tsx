import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, DeviceEventEmitter } from "react-native";
import { getApiUrl } from "../config";
import { setSecureToken, removeSecureToken } from "../utils/tokenStorage";

export interface UserData {
  name?: string;
  site_id?: number | string;
  site_name?: string;
  slug?: string;
  device_id?: string;
  clusterID?: string;
  auth_token?: string;
  unit_rate?: number | string;
  [key: string]: any;
}

export interface LoginResult {
  success: boolean;
  message: string;
  forcePasswordChange?: boolean;
  email?: string;
}

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: string;
  login: (userid: string, password: string) => Promise<LoginResult>;
  logout: (showAlert?: boolean) => Promise<void>;
  setError: (msg: string) => void;
  getSiteId: () => string | number | null;
  getSlug: () => string | null;
  getSiteName: () => string | null;
  updateUserData: (newData: Partial<UserData>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: "",
  login: async () => ({ success: false, message: "" }),
  logout: async (showAlert?: boolean) => {},
  setError: () => {},
  getSiteId: () => null,
  getSlug: () => null,
  getSiteName: () => null,
  updateUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const resolveAuthToken = (data: any): string => {
    return (
      data?.token ||
      data?.access_token ||
      data?.auth_token ||
      data?.bearer_token ||
      data?.plainTextToken ||
      data?.plain_text_token ||
      data?.api_token ||
      data?.site?.token ||
      data?.site?.access_token ||
      data?.site?.auth_token ||
      data?.site?.bearer_token ||
      data?.site?.api_token ||
      data?.device_id ||
      ""
    );
  };

  useEffect(() => {
    checkLoginStatus();

    const sub = DeviceEventEmitter.addListener("SESSION_EXPIRED", () => {
      logout(false);
      Alert.alert("Session Expired", "Your session has expired. Please log in again.");
    });

    return () => {
      sub.remove();
    };
  }, []);

  const checkLoginStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        const parsedData = JSON.parse(userData);
        setUser(parsedData);
      }
    } catch (err) {
      console.error("Error checking login status:", err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userid: string, password: string): Promise<LoginResult> => {
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
          Accept: "application/json",
        },
        body: JSON.stringify({
          userid: userid.trim(),
          password: password.trim(),
        }),
      });

      const rawText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        const errorMsg = `Server error (${response.status}). Please try again later.`;
        setError(errorMsg);
        return { success: false, message: errorMsg };
      }

      // Check for first-time login requiring password change
      if (data.status === false && data.force_password_change === true) {
        return {
          success: false,
          message: data.message || "Password change required",
          forcePasswordChange: true,
          email: data.User_id || userid.trim(),
        };
      }

      if (data.status === true) {
        const resolvedAuthToken = resolveAuthToken(data);
        const userToStore: UserData = {
          name: userid.trim(),
          site_id: data.site?.site_id,
          site_name: data.site?.site_name,
          slug: data.site?.slug,
          device_id: data.site?.device_id,
          clusterID: data.site?.clusterID,
          auth_token: resolvedAuthToken,
          ...data,
        };

        await AsyncStorage.setItem("userData", JSON.stringify(userToStore));
        await setSecureToken(resolvedAuthToken);

        setUser(userToStore);
        return { success: true, message: data.message };
      } else {
        const errorMsg = data.message || `Login failed. Status: ${response.status}`;
        setError(errorMsg);
        return { success: false, message: errorMsg };
      }
    } catch (e: any) {
      const errorMsg = e.message || "A network error occurred.";
      setError(`Network error: ${errorMsg}`);
      return { success: false, message: `Network error: ${errorMsg}` };
    }
  };

  const logout = async (showAlert: boolean = true) => {
    try {
      await removeSecureToken();
      await AsyncStorage.removeItem("userData");
      setUser(null);
      setError("");
      if (showAlert) {
        Alert.alert("Logout", "You have been successfully logged out.");
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const getSiteId = () => user?.site_id || null;
  const getSlug = () => user?.slug || null;
  const getSiteName = () => user?.site_name || null;

  const updateUserData = async (newData: Partial<UserData>) => {
    try {
      const updatedUser = { ...user, ...newData };
      await AsyncStorage.setItem("userData", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (err) {
      console.error("Error updating user data:", err);
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
        updateUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
