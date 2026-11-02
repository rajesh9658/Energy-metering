import { useState, useEffect, useCallback } from "react";
import { DeviceEventEmitter } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const NOTIFICATION_PREFS_KEY = "notificationPreferences";

export interface NotificationPreferences {
  enabled: boolean;
  lowBalance: boolean;
  lowBalanceThreshold: number;
  supply: boolean;
  overload: boolean;
}

export const defaultNotificationPrefs: NotificationPreferences = {
  enabled: true,
  lowBalance: true,
  lowBalanceThreshold: 500,
  supply: true,
  overload: true,
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPrefs);
  const [loading, setLoading] = useState(true);

  const loadPreferences = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const threshold =
          typeof parsed.lowBalanceThreshold === "number" && !isNaN(parsed.lowBalanceThreshold)
            ? parsed.lowBalanceThreshold
            : !isNaN(Number(parsed.lowBalanceThreshold))
            ? Number(parsed.lowBalanceThreshold)
            : 500;

        setPreferences({
          ...defaultNotificationPrefs,
          ...parsed,
          lowBalanceThreshold: threshold,
        });
      }
    } catch (err) {
      console.warn("Failed to load notification preferences:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const savePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
    try {
      const updated = { ...preferences, ...newPrefs };
      setPreferences(updated);
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated));
      DeviceEventEmitter.emit("NOTIFICATION_PREFS_UPDATED");
    } catch (err) {
      console.warn("Failed to save notification preferences:", err);
    }
  }, [preferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    savePreferences,
    reloadPreferences: loadPreferences,
  };
}
