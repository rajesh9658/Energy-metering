// src/utils/tokenStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "authToken";

/**
 * Token storage utility.
 * Uses AsyncStorage by default so that bundling never fails without extra native dependencies.
 * When expo-secure-store is installed, it can be seamlessly switched here.
 */
export const setSecureToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.warn("Failed to save auth token:", err);
  }
};

export const getSecureToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (err) {
    console.warn("Failed to read auth token:", err);
    return null;
  }
};

export const removeSecureToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.warn("Failed to remove auth token:", err);
  }
};
