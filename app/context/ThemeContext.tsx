import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkTheme, lightTheme, ThemeColors } from "../theme";

const THEME_STORAGE_KEY = "app_theme_mode";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  isDarkMode: boolean;
  theme: ThemeColors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  themeLoading: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");
  const [themeLoading, setThemeLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedMode === "dark" || storedMode === "light") {
          setThemeModeState(storedMode);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      } finally {
        setThemeLoading(false);
      }
    };

    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  const toggleTheme = async () => {
    await setThemeMode(themeMode === "dark" ? "light" : "dark");
  };

  const value = useMemo(
    () => ({
      isDarkMode: themeMode === "dark",
      theme: themeMode === "dark" ? darkTheme : lightTheme,
      themeMode,
      setThemeMode,
      toggleTheme,
      themeLoading,
    }),
    [themeMode, themeLoading]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
}
