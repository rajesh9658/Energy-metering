// app/context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeType: ThemeType;
  toggleTheme: () => void;
  setThemeType: (type: ThemeType) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>('system');
  const [theme, setTheme] = useState<'light' | 'dark'>(systemColorScheme || 'light');

  // Load saved theme from storage
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('appTheme');
      if (savedTheme) {
        setThemeType(savedTheme as ThemeType);
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    }
  };

  // Save theme to storage when it changes
  useEffect(() => {
    saveTheme();
  }, [themeType]);

  const saveTheme = async () => {
    try {
      await AsyncStorage.setItem('appTheme', themeType);
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  // Update theme based on themeType
  useEffect(() => {
    if (themeType === 'system') {
      setTheme(systemColorScheme || 'light');
    } else {
      setTheme(themeType);
    }
  }, [themeType, systemColorScheme]);

  const toggleTheme = () => {
    setThemeType(current => current === 'dark' ? 'light' : 'dark');
  };

  const value = {
    theme,
    themeType,
    toggleTheme,
    setThemeType,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};