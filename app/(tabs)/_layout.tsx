import React, { useEffect, useState } from "react";
import { Tabs, Redirect } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

export default function TabLayout() {
  const { user, loading, logout } = useAuth();
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

  const handleLogout = async () => {
    showToast("Logged out successfully!");
    setTimeout(async () => {
      await logout();
    }, 800);
  };

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
          }}
        >
          <Ionicons name="checkmark-circle" size={20} color={theme.success} />
          <Text style={{ color: theme.text, fontWeight: "700", marginLeft: 8 }}>
            {toastMsg}
          </Text>
        </Animated.View>
      )}

      {/* ================= HEADER ================= */}
      <View style={{ backgroundColor: theme.header }}>
       <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 18,
          paddingHorizontal: 20,
          backgroundColor: theme.header,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="person" size={22} color={theme.headerText} />
            </View>

            <View>
              <Text style={{ color: theme.headerText, fontSize: 18, fontWeight: "800" }}>
                {user.site_name?.split("@")[0].toUpperCase() || "USER"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="location-sharp" size={13} color={isDarkMode ? "#93C5FD" : "#bbdefb"} />
                <Text style={{ color: isDarkMode ? "#93C5FD" : "#bbdefb", fontSize: 12, marginLeft: 4 }}>
                  Site: {user.site?.location || "No Site"}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.7}
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.3)",
            }}
          >
            <Ionicons name="power" size={22} color={theme.headerText} />
            <Text style={{ color: theme.headerText, fontSize: 8, fontWeight: "700" }}>
              LOGOUT
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
            borderTopWidth: 0,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: isDarkMode ? 0.35 : 0.1,
            shadowRadius: 15,
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
