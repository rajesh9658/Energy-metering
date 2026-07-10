import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
  PermissionsAndroid,
  LayoutAnimation,
  UIManager,
  Animated,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import * as FileSystem from "expo-file-system";
import RNFS from "react-native-fs";
import FileViewer from "react-native-file-viewer";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useTheme } from "../context/ThemeContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  } as any),
});
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "./Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { getWalletTransactionsUrl } from "../config";

export type HistoryRecord = {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  date: string;
  status: string;
  month: string;
  meta: string;
  balanceBefore?: string;
  balanceAfter?: string;
};

export type HistoryMode = {
  key: string;
  label: string;
  title: string;
  subtitle: string;
  accentColor: string;
  badgeLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  sectionTitle: string;
  records: HistoryRecord[];
  filterOptions: string[];
};

type HistoryListScreenProps = {
  modes: HistoryMode[];
  initialModeKey?: string;
};

const buildMonthOptions = (records: HistoryRecord[]) => {
  const detectedYear =
    records
      .map((record) => {
        const match = record.month.match(/\b(20\d{2})\b/);
        return match ? match[1] : null;
      })
      .find(Boolean) || "2026";

  const allMonths = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ].map((month) => `${month} ${detectedYear}`);

  return ["All", ...allMonths];
};

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return "";
  const isoStr = dateStr.replace(" ", "T");
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const formattedHours = String(hours).padStart(2, "0");
  return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`;
};

const getRecordMonth = (dateStr: string) => {
  if (!dateStr) return "";
  const isoStr = dateStr.replace(" ", "T");
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) {
    return "";
  }
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const mapApiRecordToHistoryRecord = (item: any, modeKey: string): HistoryRecord => {
  const isDeduction = modeKey === "deduction";
  const metadata = item.metadata || {};
  
  // Title is the capitalized transaction type from database
  const rawType = item.type || "";
  const title = rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : (isDeduction ? "Deduction" : "Recharge");
  
  let subtitle = "";
  if (isDeduction) {
    if (item.units_consumed > 0) {
      subtitle = `Consumed ${Number(item.units_consumed).toFixed(2)} ${item.unit_type || 'kVAh'}`;
    } else if (metadata.mains_fixed_deduction > 0) {
      subtitle = "Mains Fixed component deduction";
    } else if (metadata.dg_fixed_deduction > 0) {
      subtitle = "DG Fixed component deduction";
    } else {
      subtitle = item.description || "Administrative deduction processed by system";
    }
  } else {
    subtitle = item.description || "Amount credited to prepaid meter";
  }

  // Status pill is also the capitalized transaction type
  const status = title;

  let meta = "";
  if (isDeduction) {
    if (item.units_consumed > 0) {
      meta = `Rate: ₹${item.rate_per_unit || 10}/unit`;
    } else if (metadata.mains_fixed_deduction > 0) {
      meta = `Mains Fixed: ₹${Number(metadata.mains_fixed_deduction).toFixed(2)}`;
    } else if (metadata.dg_fixed_deduction > 0) {
      meta = `DG Fixed: ₹${Number(metadata.dg_fixed_deduction).toFixed(2)}`;
    } else {
      meta = `Balance: ₹${Number(item.balance_after).toFixed(2)}`;
    }
  } else {
    meta = `Balance After: ₹${Number(item.balance_after).toFixed(2)}`;
  }

  return {
    id: item.id.toString(),
    title: title,
    subtitle: subtitle,
    amount: item.formatted_amount || `₹${item.amount}`,
    date: formatDateTime(item.transaction_date || item.created_at),
    status: status,
    month: getRecordMonth(item.transaction_date || item.created_at),
    meta: meta,
    balanceBefore: item.balance_before !== undefined && item.balance_before !== null ? `₹${Number(item.balance_before).toFixed(2)}` : "-",
    balanceAfter: item.balance_after !== undefined && item.balance_after !== null ? `₹${Number(item.balance_after).toFixed(2)}` : "-",
  };
};

export default function HistoryListScreen({
  modes,
  initialModeKey,
}: HistoryListScreenProps) {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { getSiteId, logout } = useAuth();
  const siteId = getSiteId();

  const [transactionRecords, setTransactionRecords] = useState<HistoryRecord[]>([]);
  const [deductionRecords, setDeductionRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination states
  const [txnPage, setTxnPage] = useState(1);
  const [txnLastPage, setTxnLastPage] = useState(1);
  const [dedPage, setDedPage] = useState(1);
  const [dedLastPage, setDedLastPage] = useState(1);

  const resolvedInitialMode =
    modes.find((mode) => mode.key === initialModeKey)?.key || modes[0]?.key;

  const [activeModeKey, setActiveModeKey] = useState(resolvedInitialMode);
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeMonth, setActiveMonth] = useState("All");
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isFilterVisible ? 58 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isFilterVisible]);
  
  // Custom Success Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalMessage, setSuccessModalMessage] = useState("");
  const [successModalFilePath, setSuccessModalFilePath] = useState("");

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const filePath = response.notification.request.content.data?.filePath;
      if (filePath) {
        try {
          await FileViewer.open(filePath as string);
        } catch (err) {
          console.warn("Could not open file from notification", err);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  const fetchModeData = async (modeKey: string, pageNumber: number, isRefresh = false) => {
    if (!siteId) return;
    if (pageNumber === 1 && !isRefresh) {
      setLoading(true);
    }
    
    try {
      const authToken = await AsyncStorage.getItem("authToken");
      const userData = await AsyncStorage.getItem("userData");
      let parsedUserData = null;
      try {
        parsedUserData = userData ? JSON.parse(userData) : null;
      } catch {}

      const resolvedToken =
        (authToken && authToken.length > 10) ? authToken : (
        parsedUserData?.auth_token ||
        parsedUserData?.token ||
        parsedUserData?.access_token ||
        parsedUserData?.bearer_token ||
        parsedUserData?.api_token ||
        parsedUserData?.site?.token ||
        parsedUserData?.site?.access_token ||
        parsedUserData?.site?.bearer_token ||
        parsedUserData?.site?.api_token ||
        ""
      );

      const headers = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(resolvedToken ? { Authorization: resolvedToken.startsWith("Bearer ") ? resolvedToken : `Bearer ${resolvedToken}` } : {}),
      };

      const baseUrl = getWalletTransactionsUrl(siteId, undefined, "2026-04-01");
      const url = `${baseUrl}&per_page=10&page=${pageNumber}`;

      const response = await axios.get(url, { headers });
      if (response.data && response.data.status === "success") {
        const txns = response.data.data.transactions || [];
        const pagination = response.data.data.pagination || {};
        const lastPageVal = pagination.last_page || 1;
        
        const mappedRecords = txns.map((item: any) => mapApiRecordToHistoryRecord(item, modeKey));
        
        // Filter records based on tab/mode key
        const filteredRecords = mappedRecords.filter((record: HistoryRecord) => {
          if (modeKey === "transaction") {
            return record.status === "Recharge" || record.status === "Refund" || record.status === "Adjustment";
          } else {
            return record.status === "Deduction";
          }
        });

        if (modeKey === "transaction") {
          setTxnPage(pageNumber);
          setTxnLastPage(lastPageVal);
          setTransactionRecords(filteredRecords);
        } else {
          setDedPage(pageNumber);
          setDedLastPage(lastPageVal);
          setDeductionRecords(filteredRecords);
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        console.warn("Session expired (401) - logging out");
        await logout();
      } else if (err.response?.status === 404) {
        if (modeKey === "transaction") {
          setTxnPage(1);
          setTxnLastPage(1);
          if (pageNumber === 1) setTransactionRecords([]);
        } else {
          setDedPage(1);
          setDedLastPage(1);
          if (pageNumber === 1) setDeductionRecords([]);
        }
      } else {
        console.error(`Error fetching ${modeKey} data:`, err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchModeData(activeModeKey, 1, false);
  }, [siteId, activeModeKey]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchModeData(activeModeKey, 1, true);
  };

  const processedModes = useMemo(() => {
    return modes.map((mode) => {
      if (mode.key === "transaction") {
        return { 
          ...mode, 
          records: transactionRecords,
          filterOptions: ["All", "Recharge", "Refund", "Adjustment"]
        };
      } else if (mode.key === "deduction") {
        return { 
          ...mode, 
          records: deductionRecords,
          filterOptions: ["All", "Deduction"]
        };
      }
      return mode;
    });
  }, [modes, transactionRecords, deductionRecords]);

  const activeMode = processedModes.find((mode) => mode.key === activeModeKey) || processedModes[0];
  const monthOptions = useMemo(() => buildMonthOptions(activeMode.records), [activeMode]);

  const visibleRecords = useMemo(() => {
    return activeMode.records.filter((record) => {
      const matchesFilter = activeFilter === "All" || record.status === activeFilter;
      const matchesMonth = activeMonth === "All" || record.month === activeMonth;
      return matchesFilter && matchesMonth;
    });
  }, [activeFilter, activeMonth, activeMode]);

  const totalAmount = useMemo(() => {
    return visibleRecords.reduce((sum, record) => {
      const numericAmount = Number(record.amount.replace(/[^0-9.]/g, ""));
      return sum + (Number.isNaN(numericAmount) ? 0 : numericAmount);
    }, 0);
  }, [visibleRecords]);

  const handleModeChange = (modeKey: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveModeKey(modeKey);
    setActiveFilter("All");
    setActiveMonth("All");
  };

  const filterSummary = [
    activeFilter !== "All" ? activeFilter : null,
    activeMonth !== "All" ? activeMonth : null,
  ]
    .filter(Boolean)
    .join(" • ");

  const downloadHistoryPdf = async () => {
    try {
      setIsDownloadingPdf(true);

      const rowsHtml = visibleRecords
        .map(
          (record) => `
            <tr>
              <td>${record.title}</td>
              <td>${record.status}</td>
              <td>${record.month}</td>
              <td>${record.date}</td>
              <td>${record.balanceBefore || "-"}</td>
              <td>${record.balanceAfter || "-"}</td>
              <td>${record.amount}</td>
            </tr>
          `
        )
        .join("");

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #142033; }
              .title { font-size: 24px; font-weight: 700; color: ${activeMode.accentColor}; margin-bottom: 4px; }
              .subtitle { font-size: 12px; color: #617287; margin-bottom: 16px; }
              .summary { display: flex; gap: 12px; margin-bottom: 18px; }
              .summary-card { border: 1px solid #D4DEE9; border-radius: 12px; padding: 10px 12px; min-width: 120px; }
              .label { font-size: 11px; color: #617287; margin-bottom: 4px; }
              .value { font-size: 15px; font-weight: 700; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #D4DEE9; padding: 10px; text-align: left; font-size: 12px; vertical-align: top; }
              th { background: #EFF6FF; }
              .footer { margin-top: 18px; font-size: 11px; color: #617287; }
            </style>
          </head>
          <body>
            <div class="title">${activeMode.title}</div>
            <div class="subtitle">${activeMode.subtitle}</div>
            <div class="summary">
              <div class="summary-card"><div class="label">Records</div><div class="value">${visibleRecords.length}</div></div>
              <div class="summary-card"><div class="label">Total</div><div class="value">Rs ${totalAmount.toFixed(0)}</div></div>
              <div class="summary-card"><div class="label">Filters</div><div class="value">${filterSummary || "All"}</div></div>
            </div>
            <table>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Month</th>
                <th>Date</th>
                <th>Bal. Before</th>
                <th>Bal. After</th>
                <th>Amount</th>
              </tr>
              ${rowsHtml || '<tr><td colspan="7">No records available</td></tr>'}
            </table>
            <div class="footer">Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      if (Platform.OS === "android") {
        try {
          const filename = `${activeModeKey}_history_${Date.now()}.pdf`;
          const downloadDest = `${RNFS.DownloadDirectoryPath}/${filename}`;
          const cleanSourceUri = uri.startsWith("file://") ? uri.substring(7) : uri;
          
          let writeGranted = true;
          if (Number(Platform.Version) < 33) {
            const permissionRes = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
            );
            writeGranted = permissionRes === PermissionsAndroid.RESULTS.GRANTED;
          }

          if (writeGranted) {
            await RNFS.copyFile(cleanSourceUri, downloadDest);
            
            try {
              await (RNFS as any).scanFile(downloadDest);
            } catch (scanErr) {
              console.warn("Media scanner failed", scanErr);
            }

            try {
              await Notifications.requestPermissionsAsync();
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "Download complete",
                  body: `${filename} saved to Downloads folder.`,
                  data: { filePath: downloadDest },
                },
                trigger: null,
              });
            } catch (notifErr) {
              console.warn("Notification scheduling failed", notifErr);
            }

            setSuccessModalMessage(filename);
            setSuccessModalFilePath(downloadDest);
            setShowSuccessModal(true);
            return;
          }
        } catch (fsErr) {
          console.warn("Direct RNFS save failed, falling back to SAF / Sharing", fsErr);
        }

        try {
          let savedDirectoryUri = await AsyncStorage.getItem("downloadsDirectoryUri");
          let permissionsGranted = false;

          if (savedDirectoryUri) {
            permissionsGranted = true;
          }

          if (!savedDirectoryUri) {
            const permissions = await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              savedDirectoryUri = permissions.directoryUri;
              await AsyncStorage.setItem("downloadsDirectoryUri", permissions.directoryUri);
              permissionsGranted = true;
            }
          }

          if (permissionsGranted && savedDirectoryUri) {
            const filename = `${activeModeKey}_history_${Date.now()}.pdf`;
            const fileUri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
              savedDirectoryUri,
              filename,
              "application/pdf"
            );

            const base64Data = await FileSystem.readAsStringAsync(uri, {
              encoding: "base64",
            });

            await FileSystem.writeAsStringAsync(fileUri, base64Data, {
              encoding: "base64",
            });

            try {
              await Notifications.requestPermissionsAsync();
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: "Download complete",
                  body: "PDF saved to your selected downloads folder.",
                  data: { filePath: fileUri },
                },
                trigger: null,
              });
            } catch (notifErr) {
              console.warn("Notification scheduling failed", notifErr);
            }

            setSuccessModalMessage(filename);
            setSuccessModalFilePath(fileUri);
            setShowSuccessModal(true);
            return;
          }
        } catch (androidErr) {
          console.warn("Direct folder save failed, fallback to sharing sheet", androidErr);
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${activeMode.title} PDF`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Ready", "PDF generated, but sharing is not available in this build.");
      }
    } catch (error) {
      Alert.alert("Download Failed", "PDF generate karne me problem aayi. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: theme.background, flex: 1 }]}>
      <Header showBackButton={true} />

      {/* Flipkart-Style Sticky Filter Container */}
      <View style={[styles.stickyFilterContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {/* Mode Selector Tab Bar */}
        <View style={[styles.modeTabContainer, { borderBottomColor: theme.border }]}>
          {modes.map((mode) => {
            const selected = mode.key === activeModeKey;
            return (
              <TouchableOpacity
                key={mode.key}
                activeOpacity={0.85}
                onPress={() => handleModeChange(mode.key)}
                style={[
                  styles.modeTabButton,
                  {
                    borderBottomColor: selected ? mode.accentColor : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeTabText,
                    {
                      color: selected ? mode.accentColor : theme.mutedText,
                      fontWeight: selected ? "800" : "600",
                    },
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Animated Filters Container */}
        <Animated.View style={{ height: animatedHeight, overflow: "hidden" }}>
          {/* Status Filter Chips Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScrollView}
            contentContainerStyle={styles.chipsContentContainer}
          >
            <Ionicons name="funnel-outline" size={11} color={theme.mutedText} style={{ alignSelf: "center", marginRight: 3 }} />
            {activeMode.filterOptions.map((filter) => {
              const selected = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  activeOpacity={0.85}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setActiveFilter(filter);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selected
                        ? activeMode.accentColor
                        : isDarkMode
                          ? theme.card
                          : "#F1F5F9",
                      borderColor: selected ? activeMode.accentColor : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selected ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {filter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Month Filter Chips Row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.chipsScrollView, { marginTop: 3 }]}
            contentContainerStyle={styles.chipsContentContainer}
          >
            <Ionicons name="calendar-outline" size={11} color={theme.mutedText} style={{ alignSelf: "center", marginRight: 3 }} />
            {monthOptions.map((month) => {
              const selected = activeMonth === month;
              return (
                <TouchableOpacity
                  key={month}
                  activeOpacity={0.85}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setActiveMonth(month);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: selected
                        ? activeMode.accentColor
                        : isDarkMode
                          ? theme.card
                          : "#F1F5F9",
                      borderColor: selected ? activeMode.accentColor : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selected ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {month}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Compact Summary and Download PDF Bar */}
        <View style={[styles.compactSummaryRow, { borderTopColor: theme.border }]}>
          <View style={styles.metricsContainer}>
            <View style={[styles.metricChip, { backgroundColor: isDarkMode ? theme.card : "#F8FAFC", borderColor: theme.border }]}>
              <Text style={[styles.metricChipLabel, { color: theme.mutedText }]}>Records: </Text>
              <Text style={[styles.metricChipValue, { color: theme.text }]}>{visibleRecords.length}</Text>
            </View>
            <View style={[styles.metricChip, { marginLeft: 8, backgroundColor: isDarkMode ? theme.card : "#F8FAFC", borderColor: theme.border }]}>
              <Text style={[styles.metricChipLabel, { color: theme.mutedText }]}>Total: </Text>
              <Text style={[styles.metricChipValue, { color: theme.text }]}>₹{totalAmount.toFixed(0)}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsFilterVisible(!isFilterVisible);
              }}
              style={[
                styles.metricChip,
                {
                  marginLeft: 8,
                  backgroundColor: isFilterVisible
                    ? activeMode.accentColor
                    : isDarkMode
                      ? theme.card
                      : "#F8FAFC",
                  borderColor: isFilterVisible ? activeMode.accentColor : theme.border,
                },
              ]}
            >
              <Ionicons
                name={isFilterVisible ? "funnel" : "funnel-outline"}
                size={11}
                color={isFilterVisible ? "#FFFFFF" : theme.text}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.metricChipValue,
                  {
                    color: isFilterVisible ? "#FFFFFF" : theme.text,
                    fontSize: 10,
                    fontWeight: "800",
                  },
                ]}
              >
                Filters
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={downloadHistoryPdf}
            disabled={isDownloadingPdf}
            style={[
              styles.compactDownloadButton,
              {
                backgroundColor: activeMode.accentColor,
              },
            ]}
          >
            {isDownloadingPdf ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="download-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.compactDownloadButtonText}>PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[activeMode.accentColor]}
            tintColor={activeMode.accentColor}
          />
        }
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{activeMode.sectionTitle}</Text>
          <Text style={[styles.sectionCount, { color: theme.mutedText }]}>
            {visibleRecords.length} shown
          </Text>
        </View>

        {loading && visibleRecords.length === 0 ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 50 }}>
            <ActivityIndicator size="large" color={activeMode.accentColor} />
            <Text style={{ marginTop: 10, color: theme.mutedText, fontSize: 13, fontWeight: "600" }}>Loading records...</Text>
          </View>
        ) : (
          <>
            {visibleRecords.map((record) => {
              const getIconDetails = (status: string) => {
                switch (status?.toLowerCase()) {
                  case "recharge":
                    return {
                      name: "arrow-up-sharp" as const,
                      color: "#10B981",
                      bgColor: isDarkMode ? "rgba(16, 185, 129, 0.08)" : "#ECFDF5",
                      borderColor: isDarkMode ? "rgba(16, 185, 129, 0.25)" : "rgba(16, 185, 129, 0.18)",
                    };
                  case "refund":
                    return {
                      name: "arrow-undo-sharp" as const,
                      color: "#0D9488",
                      bgColor: isDarkMode ? "rgba(13, 148, 136, 0.08)" : "#F0FDFA",
                      borderColor: isDarkMode ? "rgba(13, 148, 136, 0.25)" : "rgba(13, 148, 136, 0.18)",
                    };
                  case "adjustment":
                    return {
                      name: "swap-horizontal-sharp" as const,
                      color: "#3B82F6",
                      bgColor: isDarkMode ? "rgba(59, 130, 246, 0.08)" : "#EFF6FF",
                      borderColor: isDarkMode ? "rgba(59, 130, 246, 0.25)" : "rgba(59, 130, 246, 0.18)",
                    };
                  case "deduction":
                  default:
                    return {
                      name: "arrow-down-sharp" as const,
                      color: "#EF4444",
                      bgColor: isDarkMode ? "rgba(239, 68, 68, 0.08)" : "#FEF2F2",
                      borderColor: isDarkMode ? "rgba(239, 68, 68, 0.25)" : "rgba(239, 68, 68, 0.18)",
                    };
                }
              };
              
              const iconInfo = getIconDetails(record.status);

              return (
                <View
                  key={record.id}
                  style={[
                    styles.recordCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      shadowColor: theme.shadow,
                    },
                  ]}
                >
                  <View style={[styles.circularBadge, { backgroundColor: iconInfo.bgColor, borderColor: iconInfo.borderColor }]}>
                    <Ionicons name={iconInfo.name} size={18} color={iconInfo.color} />
                  </View>

                  <View style={styles.recordBody}>
                    <View style={styles.recordMainRow}>
                      <View style={styles.recordTextContainer}>
                        <Text style={[styles.recordTitle, { color: theme.text }]}>{record.title}</Text>
                        <Text style={[styles.recordSubtitle, { color: theme.mutedText }]}>
                          {record.subtitle}
                        </Text>
                      </View>

                      <View style={styles.recordAmountContainer}>
                        <Text
                          style={[
                            styles.recordAmount,
                            {
                              color: record.amount.startsWith("-")
                                ? "#EF4444"
                                : record.amount.startsWith("+")
                                  ? "#10B981"
                                  : theme.text,
                            },
                          ]}
                        >
                          {record.amount}
                        </Text>
                        {record.meta && activeModeKey !== "deduction" ? (
                          <Text style={[styles.recordMeta, { color: theme.mutedText }]}>
                            {record.meta}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.recordFooterRow}>
                      <Ionicons name="time-outline" size={10} color={theme.mutedText} style={{ marginRight: 3 }} />
                      <Text style={[styles.recordDate, { color: theme.mutedText }]}>{record.date}</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {visibleRecords.length === 0 && (
              <View
                style={[
                  styles.emptyState,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Ionicons name="file-tray-outline" size={28} color={theme.mutedText} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No matching records</Text>
                <Text style={[styles.emptyText, { color: theme.mutedText }]}>
                  Try changing the status or month filter to see more history.
                </Text>
              </View>
            )}

            {activeModeKey === "transaction" ? (
              txnLastPage > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    disabled={txnPage === 1 || loading}
                    onPress={() => fetchModeData("transaction", txnPage - 1)}
                    style={[
                      styles.pageButton,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        opacity: txnPage === 1 ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="chevron-back" size={16} color={activeMode.accentColor} />
                    <Text style={[styles.pageButtonText, { color: activeMode.accentColor }]}>Prev</Text>
                  </TouchableOpacity>

                  <Text style={[styles.pageIndicatorText, { color: theme.text }]}>
                    Page {txnPage} of {txnLastPage}
                  </Text>

                  <TouchableOpacity
                    disabled={txnPage === txnLastPage || loading}
                    onPress={() => fetchModeData("transaction", txnPage + 1)}
                    style={[
                      styles.pageButton,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        opacity: txnPage === txnLastPage ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.pageButtonText, { color: activeMode.accentColor }]}>Next</Text>
                    <Ionicons name="chevron-forward" size={16} color={activeMode.accentColor} />
                  </TouchableOpacity>
                </View>
              )
            ) : (
              dedLastPage > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    disabled={dedPage === 1 || loading}
                    onPress={() => fetchModeData("deduction", dedPage - 1)}
                    style={[
                      styles.pageButton,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        opacity: dedPage === 1 ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="chevron-back" size={16} color={activeMode.accentColor} />
                    <Text style={[styles.pageButtonText, { color: activeMode.accentColor }]}>Prev</Text>
                  </TouchableOpacity>

                  <Text style={[styles.pageIndicatorText, { color: theme.text }]}>
                    Page {dedPage} of {dedLastPage}
                  </Text>

                  <TouchableOpacity
                    disabled={dedPage === dedLastPage || loading}
                    onPress={() => fetchModeData("deduction", dedPage + 1)}
                    style={[
                      styles.pageButton,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        opacity: dedPage === dedLastPage ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.pageButtonText, { color: activeMode.accentColor }]}>Next</Text>
                    <Ionicons name="chevron-forward" size={16} color={activeMode.accentColor} />
                  </TouchableOpacity>
                </View>
              )
            )}
          </>
        )}
      </ScrollView>

      {/* Custom Download Success Modal Dialog */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.successModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.successIconBadge}>
              <Ionicons name="checkmark-circle" size={38} color="#10B981" />
            </View>

            <Text style={[styles.successModalTitle, { color: theme.text }]}>Download Completed</Text>
            <Text style={[styles.successModalSubtitle, { color: theme.mutedText }]}>
              Your PDF has been saved successfully.
            </Text>

            <View style={[styles.successFileContainer, { backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.04)" : "#F8FAFC", borderColor: theme.border }]}>
              <Ionicons name="document-text" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text numberOfLines={2} ellipsizeMode="middle" style={[styles.successFileNameText, { color: theme.text }]}>
                {successModalMessage}
              </Text>
            </View>

            <View style={styles.successActionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowSuccessModal(false)}
                style={[styles.successDismissButton, { borderColor: theme.border }]}
              >
                <Text style={[styles.successDismissText, { color: theme.text }]}>OK</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={async () => {
                  setShowSuccessModal(false);
                  try {
                    await FileViewer.open(successModalFilePath);
                  } catch (err) {
                    Alert.alert("Error", "Could not open the PDF viewer.");
                  }
                }}
                style={[styles.successActionButton, { backgroundColor: activeMode.accentColor }]}
              >
                <Text style={styles.successActionText}>Open File</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 24,
    paddingTop: 28,
  },
  heroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    marginTop: 10,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  toggleRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  heroHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroSummaryRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 10,
  },
  embeddedFilterPanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
  },
  actionRow: {
    gap: 10,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 14,
  },
  filterLauncher: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  downloadCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  filterLauncherCopy: {
    flex: 1,
    paddingRight: 12,
  },
  downloadCopy: {
    flex: 1,
    paddingRight: 12,
  },
  filterIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  downloadSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  heroSummaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  heroSummaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  heroSummaryValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  heroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  filterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  filterMeta: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  chipRowCompact: {
    marginBottom: 0,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 3,
    borderWidth: 0.8,
  },
  filterChipText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-end",
    padding: 14,
  },
  filterModalCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
  },
  filterModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  filterModalSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  filterCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  filterActionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterActionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: "600",
  },
  recordCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
    padding: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  circularBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
  },
  recordBody: {
    flex: 1,
  },
  recordMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  recordTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  recordTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 2,
  },
  recordSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  recordAmountContainer: {
    alignItems: "flex-end",
  },
  recordAmount: {
    fontSize: 14,
    fontWeight: "800",
  },
  recordMeta: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "right",
  },
  recordFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  recordDate: {
    fontSize: 9.5,
    fontWeight: "500",
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 26,
    paddingHorizontal: 4,
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
  },
  pageButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pageIndicatorText: {
    fontSize: 13,
    fontWeight: "700",
  },
  stickyFilterContainer: {
    paddingBottom: 6,
    borderBottomWidth: 1,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    zIndex: 10,
  },
  modeTabContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  modeTabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 3,
  },
  modeTabText: {
    fontSize: 13,
  },
  chipsScrollView: {
    paddingHorizontal: 10,
  },
  chipsContentContainer: {
    paddingRight: 16,
    gap: 3,
  },
  compactSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
  },
  metricsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metricChipLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  metricChipValue: {
    fontSize: 11,
    fontWeight: "800",
  },
  compactDownloadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactDownloadButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successModalCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  successIconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  successModalSubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 20,
  },
  successFileContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  successFileNameText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  successActionsRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  successDismissButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  successDismissText: {
    fontSize: 13,
    fontWeight: "800",
  },
  successActionButton: {
    flex: 1.2,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  successActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
