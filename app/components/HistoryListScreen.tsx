import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useTheme } from "../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "./Header";

export type HistoryRecord = {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  date: string;
  status: string;
  month: string;
  meta: string;
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

export default function HistoryListScreen({
  modes,
  initialModeKey,
}: HistoryListScreenProps) {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const resolvedInitialMode =
    modes.find((mode) => mode.key === initialModeKey)?.key || modes[0]?.key;

  const [activeModeKey, setActiveModeKey] = useState(resolvedInitialMode);
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeMonth, setActiveMonth] = useState("All");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const activeMode = modes.find((mode) => mode.key === activeModeKey) || modes[0];
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
              <td>${record.meta}</td>
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
                <th>Details</th>
                <th>Amount</th>
              </tr>
              ${rowsHtml || '<tr><td colspan="6">No records available</td></tr>'}
            </table>
            <div class="footer">Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

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
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View style={[styles.heroTopRow, { justifyContent: "flex-end", marginBottom: 6 }]}>
            <View style={[styles.heroBadge, { backgroundColor: activeMode.accentColor }]}>
              <Text style={styles.heroBadgeText}>{activeMode.badgeLabel}</Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            {modes.map((mode) => {
              const selected = mode.key === activeModeKey;
              return (
                <TouchableOpacity
                  key={mode.key}
                  activeOpacity={0.9}
                  onPress={() => handleModeChange(mode.key)}
                  style={[
                    styles.toggleButton,
                    {
                      backgroundColor: selected
                        ? mode.accentColor
                        : isDarkMode
                          ? theme.card
                          : "#F7FAFE",
                      borderColor: selected ? mode.accentColor : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      { color: selected ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.heroHeadingRow}>
            <View
              style={[
                styles.heroIconWrap,
                { backgroundColor: isDarkMode ? theme.card : "#F4F9FF" },
              ]}
            >
              <Ionicons name={activeMode.icon} size={24} color={activeMode.accentColor} />
            </View>

            <View style={styles.heroCopy}>
              <Text style={[styles.heroTitle, { color: theme.text }]}>{activeMode.title}</Text>
              <Text style={[styles.heroSubtitle, { color: theme.mutedText }]}>
                {activeMode.subtitle}
              </Text>
            </View>
          </View>

          <View style={styles.heroSummaryRow}>
            <View
              style={[
                styles.heroSummaryCard,
                {
                  backgroundColor: isDarkMode ? theme.card : "#F5F9FF",
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.heroSummaryLabel, { color: theme.mutedText }]}>Records</Text>
              <Text style={[styles.heroSummaryValue, { color: theme.text }]}>
                {visibleRecords.length}
              </Text>
            </View>
            <View
              style={[
                styles.heroSummaryCard,
                {
                  backgroundColor: isDarkMode ? theme.card : "#F5F9FF",
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[styles.heroSummaryLabel, { color: theme.mutedText }]}>Total</Text>
              <Text style={[styles.heroSummaryValue, { color: theme.text }]}>
                Rs {totalAmount.toFixed(0)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.embeddedFilterPanel,
              {
                backgroundColor: isDarkMode ? theme.card : "#F8FBFF",
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowFilterModal(true)}
                style={[
                  styles.filterLauncher,
                  styles.actionCard,
                  {
                    backgroundColor: isDarkMode ? theme.surface : "#FFFFFF",
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.filterLauncherCopy}>
                  <Text style={[styles.filterTitle, { color: theme.text }]}>Filters</Text>
                  <Text style={[styles.filterMeta, { color: theme.mutedText }]}>
                    {filterSummary || "Tap the icon to choose filters"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.filterIconButton,
                    { backgroundColor: activeMode.accentColor },
                  ]}
                >
                  <Ionicons name="options-outline" size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={downloadHistoryPdf}
                disabled={isDownloadingPdf}
                style={[
                  styles.downloadCard,
                  styles.actionCard,
                  {
                    backgroundColor: isDarkMode ? theme.surface : "#FFFFFF",
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.downloadCopy}>
                  <Text style={[styles.downloadTitle, { color: theme.text }]}>Download PDF</Text>
                  <Text style={[styles.downloadSubtitle, { color: theme.mutedText }]}>
                    Filtered history export
                  </Text>
                </View>
                <View
                  style={[
                    styles.filterIconButton,
                    { backgroundColor: isDownloadingPdf ? "#94A3B8" : activeMode.accentColor },
                  ]}
                >
                  {isDownloadingPdf ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{activeMode.sectionTitle}</Text>
          <Text style={[styles.sectionCount, { color: theme.mutedText }]}>
            {visibleRecords.length} shown
          </Text>
        </View>

        {visibleRecords.map((record) => (
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
            <View style={[styles.recordAccent, { backgroundColor: activeMode.accentColor }]} />

            <View style={styles.recordBody}>
              <View style={styles.recordTopRow}>
                <View style={styles.recordCopy}>
                  <Text style={[styles.recordTitle, { color: theme.text }]}>{record.title}</Text>
                  <Text style={[styles.recordSubtitle, { color: theme.mutedText }]}>
                    {record.subtitle}
                  </Text>
                </View>

                <Text style={[styles.recordAmount, { color: theme.text }]}>{record.amount}</Text>
              </View>

              <View style={styles.recordMetaRow}>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: isDarkMode ? theme.card : "#EEF7FF",
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: activeMode.accentColor },
                    ]}
                  >
                    {record.status}
                  </Text>
                </View>

                <Text style={[styles.recordMeta, { color: theme.mutedText }]}>{record.meta}</Text>
              </View>

              <Text style={[styles.recordDate, { color: theme.mutedText }]}>{record.date}</Text>
            </View>
          </View>
        ))}

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
      </ScrollView>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View
            style={[
              styles.filterModalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.filterModalHeader}>
              <View>
                <Text style={[styles.filterModalTitle, { color: theme.text }]}>Filter History</Text>
                <Text style={[styles.filterModalSubtitle, { color: theme.mutedText }]}>
                  Choose what you want to see
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={[
                  styles.filterCloseButton,
                  { backgroundColor: isDarkMode ? theme.card : "#F4F7FB", borderColor: theme.border },
                ]}
              >
                <Ionicons name="close" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterLabel, { color: theme.mutedText }]}>Status</Text>
            <View style={styles.chipRow}>
              {activeMode.filterOptions.map((filter) => {
                const selected = activeFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    activeOpacity={0.85}
                    onPress={() => setActiveFilter(filter)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected
                          ? activeMode.accentColor
                          : isDarkMode
                            ? theme.card
                            : "#F8FBFF",
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
            </View>

            <Text style={[styles.filterLabel, { color: theme.mutedText }]}>Month</Text>
            <View style={[styles.chipRow, styles.chipRowCompact]}>
              {monthOptions.map((month) => {
                const selected = activeMonth === month;
                return (
                  <TouchableOpacity
                    key={month}
                    activeOpacity={0.85}
                    onPress={() => setActiveMonth(month)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selected
                          ? activeMode.accentColor
                          : isDarkMode
                            ? theme.card
                            : "#F8FBFF",
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
            </View>

            <View style={styles.filterActionRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setActiveFilter("All");
                  setActiveMonth("All");
                }}
                style={[
                  styles.filterActionButton,
                  { backgroundColor: isDarkMode ? theme.card : "#F4F7FB", borderColor: theme.border },
                ]}
              >
                <Text style={[styles.filterActionText, { color: theme.text }]}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowFilterModal(false)}
                style={[
                  styles.filterActionButton,
                  { backgroundColor: activeMode.accentColor, borderColor: activeMode.accentColor },
                ]}
              >
                <Text style={[styles.filterActionText, { color: "#FFFFFF" }]}>Apply</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "700",
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
    borderWidth: 1,
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
  },
  recordAccent: {
    width: 4,
  },
  recordBody: {
    flex: 1,
    padding: 12,
  },
  recordTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  recordCopy: {
    flex: 1,
    paddingRight: 10,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  recordSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  recordAmount: {
    fontSize: 14,
    fontWeight: "800",
  },
  recordMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  recordMeta: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 10,
    flex: 1,
    textAlign: "right",
  },
  recordDate: {
    fontSize: 10,
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
});
