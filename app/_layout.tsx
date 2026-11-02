import { Stack } from "expo-router";
import { isRunningInExpoGo } from "expo";
import React, { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet, StatusBar, Platform } from "react-native";
import * as SplashScreen from 'expo-splash-screen';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  try {
    const styleId = 'global-inter-font-override';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        html, body, button, input, textarea, select, * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `;
      document.head.appendChild(style);
    }
  } catch {
    // Ignore in non-browser execution
  }
}

import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { ThemeProvider, useTheme } from "../src/context/ThemeContext";
import { EnergyUnitProvider, useEnergyUnit } from "../src/context/EnergyUnitContext";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { AppUpdateModal } from "../src/components/AppUpdateModal";

SplashScreen.preventAutoHideAsync();

function LayoutContent() {
  const { user, loading } = useAuth();
  const { theme, isDarkMode, themeLoading } = useTheme();
  const { energyUnitLoading } = useEnergyUnit();

  useEffect(() => {
    if (!loading && !themeLoading && !energyUnitLoading) {
      SplashScreen.hideAsync();
    }
  }, [loading, themeLoading, energyUnitLoading]);

  useEffect(() => {
    if (isRunningInExpoGo()) return;

    let mounted = true;

    (async () => {
      try {
        const Notifications = await import("expo-notifications");
        if (!mounted) return;

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          } as any),
        });

        await Notifications.setNotificationChannelAsync("downloads", {
          name: "Downloads",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      } catch {
        // Ignore notification setup issues outside native/dev builds.
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading || themeLoading || energyUnitLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.background}
        />
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" redirect={!!user} />
        <Stack.Screen name="(tabs)" redirect={!user} />
        <Stack.Screen name="history" redirect={!user} />
        <Stack.Screen name="deduction-history" redirect={!user} />
        <Stack.Screen name="transaction-history" redirect={!user} />
        <Stack.Screen name="change-password" />
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <EnergyUnitProvider>
          <AuthProvider>
            <LayoutContent />
            <AppUpdateModal />
          </AuthProvider>
        </EnergyUnitProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
  }
});
