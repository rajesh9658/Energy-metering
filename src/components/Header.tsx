import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
  DeviceEventEmitter,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";
import { useRouter, usePathname } from "expo-router";
import { NOTIFICATION_PREFS_KEY, defaultNotificationPrefs } from "../hooks/useNotificationPreferences";
import { getSiteDataUrl } from "../config";

type HeaderProps = {
  showBackButton?: boolean;
  onBackPress?: () => void;
};

export default function Header({ showBackButton = false, onBackPress }: HeaderProps) {
  const { user, loading, logout } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState(defaultNotificationPrefs);
  const [notificationItems, setNotificationItems] = useState<{
    id: string;
    title: string;
    detail: string;
    tone: string;
    actionType?: "recharge";
  }[]>([]);
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

  const getAuthHeaders = () => {
    const token =
      user?.token ||
      user?.auth_token ||
      user?.access_token ||
      user?.bearer_token ||
      user?.site?.token;

    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) {
      headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
    }
    return headers;
  };

  const resolveMeterData = async (): Promise<any> => {
    // 1. Direct "meterData" from AsyncStorage
    try {
      const stored = await AsyncStorage.getItem("meterData");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed) return parsed;
      }
    } catch (_) {}

    // 2. Slug-based cache from safeApiCall
    const slug =
      user?.slug ||
      user?.site_name ||
      user?.site?.slug ||
      user?.site?.site_name;

    if (slug) {
      try {
        const cached = await AsyncStorage.getItem(`CACHE_site_data_${slug}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed) {
            await AsyncStorage.setItem("meterData", cached);
            return parsed;
          }
        }
      } catch (_) {}
    }

    // 3. Fallback to direct site data cache if available
    try {
      const cached = await AsyncStorage.getItem("meterCurrentData");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed) return parsed;
      }
    } catch (_) {}

    // 4. Live fetch if slug is available
    if (slug) {
      try {
        const headers = getAuthHeaders();
        const res = await fetch(getSiteDataUrl(slug), { headers });
        const json = await res.json();
        if (json && (json.success || json.status || json.asset_information)) {
          await AsyncStorage.setItem("meterData", JSON.stringify(json));
          return json;
        }
      } catch (err) {
        // silent fail on network error
      }
    }

    return null;
  };

  const loadNotificationState = async () => {
    try {
      const savedPrefs = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      const parsedPrefs = savedPrefs ? { ...defaultNotificationPrefs, ...JSON.parse(savedPrefs) } : defaultNotificationPrefs;
      setNotificationPrefs(parsedPrefs);

      if (!parsedPrefs.enabled) {
        setNotificationItems([]);
        return;
      }

      const meterData = await resolveMeterData();
      if (!meterData) {
        setNotificationItems([]);
        return;
      }

      const assetInformation =
        meterData?.asset_information ||
        meterData?.data?.asset_information ||
        meterData?.data ||
        meterData ||
        {};
      const siteValues = assetInformation?.site_values || meterData?.site_values || {};
      const electricParameters =
        assetInformation?.electric_parameters || meterData?.electric_parameters || {};

      const rawBalance =
        electricParameters?.balance ??
        assetInformation?.balance ??
        meterData?.balance ??
        null;

      const alerts: { id: string; title: string; detail: string; tone: string }[] = [];

      const threshold =
        typeof parsedPrefs.lowBalanceThreshold === "number" && !isNaN(parsedPrefs.lowBalanceThreshold)
          ? parsedPrefs.lowBalanceThreshold
          : !isNaN(Number(parsedPrefs.lowBalanceThreshold))
          ? Number(parsedPrefs.lowBalanceThreshold)
          : 500;

      if (parsedPrefs.lowBalance && rawBalance != null) {
        const balance =
          typeof rawBalance === "number"
            ? rawBalance
            : parseFloat(String(rawBalance).replace(/,/g, "").trim());

        if (!isNaN(balance)) {
          const isNegative = balance < 0;
          const isBelowOrAtThreshold = balance <= threshold;
          const isCut = siteValues.low_balance_cut === true;

          if (isNegative) {
            alerts.push({
              id: "low-balance",
              title: "Low Balance",
              detail: `Your balance is negative (₹ ${balance.toFixed(2)}). Please recharge immediately to avoid power disconnection.`,
              tone: "danger",
              actionType: "recharge",
            });
          } else if (isBelowOrAtThreshold || isCut) {
            alerts.push({
              id: "low-balance",
              title: "Low Balance",
              detail: isBelowOrAtThreshold
                ? `Current balance is ₹ ${balance.toFixed(2)} (at or below limit ₹ ${threshold}). Please recharge your meter.`
                : `Low balance cut detected (₹ ${balance.toFixed(2)}). Please recharge immediately to restore power.`,
              tone: isCut ? "danger" : "warning",
              actionType: "recharge",
            });
          }
        }
      }

      if (parsedPrefs.supply && siteValues.relay_status === false) {
        alerts.push({
          id: "supply",
          title: "Supply Off",
          detail: "Relay status shows disconnected. Please check the site supply.",
          tone: "danger",
        });
      }

      if (parsedPrefs.overload && siteValues.dg_overload_trip) {
        alerts.push({
          id: "dg-overload",
          title: "DG Overload",
          detail: "A DG overload trip was detected. Please inspect the load or DG side.",
          tone: "danger",
        });
      }

      if (parsedPrefs.overload && siteValues.overload_limit_reached) {
        alerts.push({
          id: "overload-limit",
          title: "Overload Limit",
          detail: "The overload limit has been reached. Please check high-load devices.",
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
  }, [pathname, user]);

  useEffect(() => {
    const sub1 = DeviceEventEmitter.addListener("NOTIFICATION_PREFS_UPDATED", () => {
      loadNotificationState();
    });
    const sub2 = DeviceEventEmitter.addListener("METER_DATA_UPDATED", () => {
      loadNotificationState();
    });

    const intervalId = setInterval(() => {
      loadNotificationState();
    }, 60000);

    return () => {
      sub1.remove();
      sub2.remove();
      clearInterval(intervalId);
    };
  }, [user]);

  const handleLogout = async () => {
    showToast("Logged out successfully!");
    setTimeout(async () => {
      await logout();
      router.replace("/(auth)/login");
    }, 800);
  };

  if (loading || !user) {
    return null;
  }

  const displayName = user.site_name?.split("@")[0]?.toUpperCase() || "USER";
  const siteLocation = user.site?.location || "No Site";

  const headerButtonStyle = {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.24)",
    backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)",
  };

  return (
    <View style={{ backgroundColor: theme.header }}>
      {/* ================= TOAST ================= */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              top: insets.top + 16,
              backgroundColor: theme.card,
              borderColor: theme.border,
              shadowOpacity: isDarkMode ? 0.2 : 0.08,
              opacity: fadeAnim,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color={theme.success} />
          <Text style={[styles.toastText, { color: theme.text }]}>
            {toastMsg}
          </Text>
        </Animated.View>
      )}

      {/* ================= HEADER CONTENT ================= */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 10,
          paddingHorizontal: 14,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={styles.leftSection}>
          {showBackButton && (
            <TouchableOpacity
              onPress={onBackPress || (() => router.back())}
              activeOpacity={0.7}
              style={[
                styles.backButton,
                {
                  backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.18)",
                },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={theme.headerText} />
            </TouchableOpacity>
          )}

          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.18)",
              },
            ]}
          >
            <Ionicons name="person" size={18} color={theme.headerText} />
          </View>

          <View style={styles.userInfo}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={[styles.displayName, { color: theme.headerText }]}
            >
              {displayName}
            </Text>
            <View style={styles.siteInfo}>
              <Ionicons
                name="location-sharp"
                size={13}
                color={isDarkMode ? "#93C5FD" : "rgba(255,255,255,0.82)"}
              />
              <Text
                numberOfLines={1}
                style={[
                  styles.siteText,
                  { color: isDarkMode ? "#93C5FD" : "rgba(255,255,255,0.82)" },
                ]}
              >
                Site: {siteLocation}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity
            onPress={() => {
              loadNotificationState();
              setShowNotificationsModal(true);
            }}
            activeOpacity={0.7}
            style={[headerButtonStyle, { position: "relative" }]}
          >
            <Ionicons
              name={notificationPrefs.enabled && notificationItems.length > 0 ? "notifications" : "notifications-outline"}
              size={17}
              color={
                notificationPrefs.enabled && notificationItems.length > 0
                  ? (notificationItems.some((i) => i.tone === "danger") ? "#EF4444" : "#F59E0B")
                  : theme.headerText
              }
            />
            {notificationPrefs.enabled && notificationItems.length > 0 && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: notificationItems.some((i) => i.tone === "danger") ? "#EF4444" : "#F59E0B",
                  },
                ]}
              >
                <Text style={styles.badgeText}>{notificationItems.length}</Text>
              </View>
            )}
            <Text style={[styles.buttonLabel, { color: theme.headerText }]}>
              ALERTS
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.7}
            style={headerButtonStyle}
          >
            <Ionicons
              name={isDarkMode ? "sunny" : "moon"}
              size={16}
              color={theme.headerText}
            />
            <Text style={[styles.buttonLabel, { color: theme.headerText }]}>
              {isDarkMode ? "LIGHT" : "DARK"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.7}
            style={[
              headerButtonStyle,
              {
                backgroundColor: isDarkMode ? "transparent" : "rgba(255,255,255,0.08)",
              },
            ]}
          >
            <Ionicons name="power" size={16} color={theme.headerText} />
            <Text style={[styles.buttonLabel, { color: theme.headerText }]}>
              LOGOUT
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= ALERTS MODAL ================= */}
      <Modal visible={showNotificationsModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { paddingTop: insets.top + 78 }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                shadowOpacity: isDarkMode ? 0.28 : 0.12,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <Ionicons name="close" size={22} color={theme.mutedText || theme.gray} />
              </TouchableOpacity>
            </View>

            {!notificationPrefs.enabled ? (
              <Text style={[styles.emptyModalText, { color: theme.mutedText || theme.gray }]}>
                Notifications are currently disabled. Open Menu {">"} Notifications to enable them.
              </Text>
            ) : notificationItems.length === 0 ? (
              <Text style={[styles.emptyModalText, { color: theme.mutedText || theme.gray }]}>
                There are no active alerts right now. New alerts will appear here based on your enabled categories.
              </Text>
            ) : (
              notificationItems.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.notificationItem,
                    { borderTopColor: theme.border },
                  ]}
                >
                  <View
                    style={[
                      styles.notificationIconWrap,
                      {
                        backgroundColor: item.tone === "danger"
                          ? (isDarkMode ? "rgba(239,68,68,0.16)" : "#FEE2E2")
                          : (isDarkMode ? "rgba(245,158,11,0.16)" : "#FEF3C7"),
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.tone === "danger" ? "alert-circle-outline" : "warning-outline"}
                      size={18}
                      color={item.tone === "danger" ? "#EF4444" : "#D97706"}
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeaderRow}>
                      <Text style={[styles.notificationTitle, { color: theme.text }]}>
                        {item.title}
                      </Text>
                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor: item.tone === "danger"
                              ? (isDarkMode ? "rgba(239,68,68,0.18)" : "#FEF2F2")
                              : (isDarkMode ? "rgba(245,158,11,0.18)" : "#FFFBEB"),
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: item.tone === "danger" ? "#EF4444" : "#D97706",
                            fontSize: 10,
                            fontWeight: "800",
                            letterSpacing: 0.4,
                          }}
                        >
                          {item.tone === "danger" ? "HIGH" : "MEDIUM"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.notificationDetail, { color: theme.mutedText || theme.gray }]}>
                      {item.detail}
                    </Text>
                    {item.actionType === "recharge" && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          setShowNotificationsModal(false);
                          router.push("/recharge");
                        }}
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: item.tone === "danger" ? "#EF4444" : theme.primary,
                          },
                        ]}
                      >
                        <Ionicons name="flash" size={13} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Please Recharge Now</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 12,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
  },
  toastText: {
    fontWeight: "700",
    marginLeft: 8,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    fontSize: 15,
    fontWeight: "800",
    paddingRight: 2,
  },
  siteInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  siteText: {
    fontSize: 11,
    marginLeft: 4,
    flexShrink: 1,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    zIndex: 2,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
  },
  buttonLabel: {
    fontSize: 6,
    fontWeight: "700",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  emptyModalText: {
    fontSize: 13,
    lineHeight: 20,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  notificationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  notificationDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginTop: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});
