import React, { useEffect, useState } from "react";
import { Tabs, Redirect } from "expo-router";
import {
  View,
  Text,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import Header from "../components/Header";

const NOTIFICATION_PREFS_KEY = "notificationPreferences";
const defaultNotificationPrefs = {
  enabled: true,
  lowBalance: true,
  supply: true,
  overload: true,
};

export default function TabLayout() {
  const { user, loading } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const fadeAnim = useState(new Animated.Value(0))[0];

  const showToast = (message: string) => {
    setToastMsg(message);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  useEffect(() => {
    if (user) {
      showToast(`Welcome back, ${user.site_name?.split("@")[0]}!`);
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* ================= TOAST ================= */}
      {toastVisible && (
        <Animated.View
          style={{
            position: "absolute",
            top: insets.top + 16,
            left: 20,
            right: 20,
            backgroundColor: theme.card,
            padding: 14,
            borderRadius: 12,
            zIndex: 9999,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            opacity: fadeAnim,
            elevation: 10,
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDarkMode ? 0.2 : 0.08,
            shadowRadius: 18,
          }}
        >
          <Ionicons name="checkmark-circle" size={20} color={theme.success} />
          <Text style={{ color: theme.text, fontWeight: "700", marginLeft: 8 }}>
            {toastMsg}
          </Text>
        </Animated.View>
      )}

      {/* ================= HEADER ================= */}
      <Header />

      {/* ================= TABS ================= */}
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: theme.background,
          },
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.gray,
          tabBarStyle: {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: theme.tabBar,
            elevation: 12,
            borderTopWidth: 1,
            borderTopColor: isDarkMode ? "transparent" : theme.border,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: isDarkMode ? 0.35 : 0.06,
            shadowRadius: 18,
          },
          tabBarLabelStyle: {
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="overview"
          options={{
            title: "Overview",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="speedometer" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="recharge"
          options={{
            title: "Recharge",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="flash" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="report"
          options={{
            title: "Reports",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "Menu",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
