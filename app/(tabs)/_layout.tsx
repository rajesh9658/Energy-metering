import React, { useEffect, useState } from "react";
import { Tabs, Redirect, usePathname } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

const NOTIFICATION_PREFS_KEY = "notificationPreferences";
const defaultNotificationPrefs = {
  enabled: true,
  lowBalance: true,
  supply: true,
  overload: true,
};

export default function TabLayout() {
  const { user, loading, logout } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState(defaultNotificationPrefs);
  const [notificationItems, setNotificationItems] = useState<{ id: string; title: string; detail: string; tone: string }[]>([]);
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

  const loadNotificationState = async () => {
    try {
      const savedPrefs = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      const parsedPrefs = savedPrefs ? { ...defaultNotificationPrefs, ...JSON.parse(savedPrefs) } : defaultNotificationPrefs;
      setNotificationPrefs(parsedPrefs);

      if (!parsedPrefs.enabled) {
        setNotificationItems([]);
        return;
      }

      const storedMeterData = await AsyncStorage.getItem("meterData");
      if (!storedMeterData) {
        setNotificationItems([]);
        return;
      }

      const meterData = JSON.parse(storedMeterData);
      const assetInformation = meterData?.asset_information || {};
      const siteValues = assetInformation.site_values || {};
      const electricParameters = assetInformation.electric_parameters || {};
      const balance = Number(electricParameters.balance || 0);
      const alerts: { id: string; title: string; detail: string; tone: string }[] = [];

      if (parsedPrefs.lowBalance && (balance < 500 || siteValues.low_balance_cut)) {
        alerts.push({
          id: "low-balance",
          title: "Low Balance Alert",
          detail: `Current balance approx Rs ${balance.toFixed(2)} hai. Recharge karna recommended hai.`,
          tone: "warning",
        });
      }

      if (parsedPrefs.supply && siteValues.relay_status === false) {
        alerts.push({
          id: "supply",
          title: "Supply Disconnected",
          detail: "Relay status disconnected dikh raha hai. Site supply check kijiye.",
          tone: "danger",
        });
      }

      if (parsedPrefs.overload && siteValues.dg_overload_trip) {
        alerts.push({
          id: "dg-overload",
          title: "DG Overload Trip",
          detail: "DG overload trip detect hua hai. Load ya DG side inspect karna chahiye.",
          tone: "danger",
        });
      }

      if (parsedPrefs.overload && siteValues.overload_limit_reached) {
        alerts.push({
          id: "overload-limit",
          title: "Overload Limit Reached",
          detail: "Overload limit cross hui hai. High load devices check karna better rahega.",
          tone: "warning",
        });
      }

      setNotificationItems(alerts);
    } catch (error) {
      setNotificationItems([]);
    }
  };

  useEffect(() => {
    loadNotificationState();
  }, [pathname]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      loadNotificationState();
    }, 3000);

    return () => clearInterval(intervalId);
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

  const displayName = user.site_name?.split("@")[0]?.toUpperCase() || "USER";
  const siteLocation = user.site?.location || "No Site";

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
      <View style={{ backgroundColor: theme.header }}>
        <View
          style={{
            paddingTop: insets.top + 10,
            paddingBottom: 16,
            paddingHorizontal: 20,
            backgroundColor: theme.header,
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              marginRight: 12,
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.18)",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="person" size={22} color={theme.headerText} />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={{
                  color: theme.headerText,
                  fontSize: 16,
                  fontWeight: "800",
                }}
              >
                {displayName}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 2,
                }}
              >
                <Ionicons
                  name="location-sharp"
                  size={13}
                  color={isDarkMode ? "#93C5FD" : "rgba(255,255,255,0.82)"}
                />
                <Text
                  numberOfLines={1}
                  style={{
                    color: isDarkMode ? "#93C5FD" : "rgba(255,255,255,0.82)",
                    fontSize: 12,
                    marginLeft: 4,
                    flexShrink: 1,
                  }}
                >
                  Site: {siteLocation}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity
              onPress={() => setShowNotificationsModal(true)}
              activeOpacity={0.7}
              style={{
                width: 46,
                height: 46,
                borderRadius: 10,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.28)",
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)",
                position: "relative",
              }}
            >
              <Ionicons name="notifications-outline" size={18} color={theme.headerText} />
              {notificationPrefs.enabled && notificationItems.length > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 7,
                    right: 7,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: "#EF4444",
                    justifyContent: "center",
                    alignItems: "center",
                    paddingHorizontal: 3,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 9, fontWeight: "800" }}>
                    {notificationItems.length}
                  </Text>
                </View>
              )}
              <Text style={{ color: theme.headerText, fontSize: 7, fontWeight: "700", marginTop: 3 }}>
                ALERTS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={toggleTheme}
              activeOpacity={0.7}
              style={{
                width: 46,
                height: 46,
                borderRadius: 10,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.28)",
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)",
              }}
            >
              <Ionicons
                name={isDarkMode ? "sunny" : "moon"}
                size={18}
                color={theme.headerText}
              />
              <Text style={{ color: theme.headerText, fontSize: 7, fontWeight: "700", marginTop: 3 }}>
                {isDarkMode ? "LIGHT" : "DARK"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.7}
              style={{
                width: 46,
                height: 46,
                borderRadius: 10,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 1,
                borderColor: isDarkMode ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.28)",
                backgroundColor: isDarkMode ? "transparent" : "rgba(255,255,255,0.08)",
              }}
            >
              <Ionicons name="power" size={19} color={theme.headerText} />
              <Text style={{ color: theme.headerText, fontSize: 7, fontWeight: "700", marginTop: 2 }}>
                LOGOUT
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={showNotificationsModal} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "flex-start",
            paddingTop: insets.top + 78,
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: theme.border,
              padding: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: isDarkMode ? 0.28 : 0.12,
              shadowRadius: 18,
              elevation: 10,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <Ionicons name="close" size={22} color={theme.mutedText || theme.gray} />
              </TouchableOpacity>
            </View>

            {!notificationPrefs.enabled ? (
              <Text style={{ color: theme.mutedText || theme.gray, fontSize: 13, lineHeight: 20 }}>
                Notifications are currently disabled. Open Menu {">"} Notifications to enable them.
              </Text>
            ) : notificationItems.length === 0 ? (
              <Text style={{ color: theme.mutedText || theme.gray, fontSize: 13, lineHeight: 20 }}>
                There are no active alerts right now. New alerts will appear here based on your enabled categories.
              </Text>
            ) : (
              notificationItems.map((item) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    paddingVertical: 12,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                  }}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: item.tone === "danger" ? "#EF4444" : "#F59E0B",
                      marginTop: 6,
                      marginRight: 10,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: "700", marginBottom: 3 }}>{item.title}</Text>
                    <Text style={{ color: theme.mutedText || theme.gray, fontSize: 12, lineHeight: 18 }}>{item.detail}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </Modal>

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
