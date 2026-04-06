
import { Stack, Redirect } from "expo-router";
import { isRunningInExpoGo } from "expo";

import { AuthProvider, useAuth } from "./context/AuthContext"; 
import { ActivityIndicator, View, StyleSheet, StatusBar } from "react-native";
import { useEffect } from "react";
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { EnergyUnitProvider, useEnergyUnit } from "./context/EnergyUnitContext";

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
          }),
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
      
        <Stack.Screen name="(tabs)" redirect={!user} />
      
      
        <Stack.Screen name="(auth)" redirect={!!user} />

  
        <Stack.Screen name="index" redirect />
        <Stack.Screen name="login" redirect />
        <Stack.Screen name="signup" redirect />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <EnergyUnitProvider>
        <AuthProvider>
          <LayoutContent />
        </AuthProvider>
      </EnergyUnitProvider>
    </ThemeProvider>
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
