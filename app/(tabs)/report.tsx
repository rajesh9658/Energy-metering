import React, { useState, useEffect } from 'react';
import {
  Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';

const { width } = Dimensions.get('window');

export default function EnergyReport() {
  const [timeView, setTimeView] = useState('daily');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('December');
  
  const [data, setData] = useState({
    unitValues: [],
    amtValues: [],
    stats: { avgU: '0.00', maxU: '0.00', avgA: '0.00', maxA: '0.00' }
  });

  const months = ["September", "October", "November", "December"];
  const years = ["2025", "2024", "2023"];

  useEffect(() => {
    generateData();
  }, [selectedMonth, selectedYear, timeView]);

  const generateData = () => {
    const count = timeView === 'daily' ? 31 : 12;
    const units = Array.from({ length: count }, () => Math.floor(Math.random() * 10) + 5);
    const amts = units.map(u => (u * 6.8).toFixed(2));

    setData({
      unitValues: units,
      amtValues: amts,
      stats: {
        avgU: (units.reduce((a, b) => a + b, 0) / count).toFixed(2),
        maxU: Math.max(...units).toFixed(2),
        avgA: (amts.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / count).toFixed(2),
        maxA: Math.max(...amts).toFixed(2),
      }
    });
  };

  // --- WORKING EXCEL/CSV EXPORT ---
  const exportExcel = async () => {
    try {
      // Create CSV content
      const csvContent = createCSVContent();
      
      // Generate filename
      const timestamp = new Date().getTime();
      const fileName = `Energy_Report_${selectedMonth}_${selectedYear}_${timestamp}.csv`;
      
      if (Platform.OS === 'web') {
        // For web platform - download directly
        downloadCSVWeb(csvContent, fileName);
        Alert.alert('Success', 'Report downloaded successfully!');
        return;
      }
      
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // For mobile platforms - save and share
        await downloadCSVMobile(csvContent, fileName);
        return;
      }
      
      Alert.alert('Error', 'Platform not supported');
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export report. Please try again.');
    }
  };

  const createCSVContent = () => {
    let csv = "Energy Consumption Report\n";
    csv += `Period,${timeView === 'daily' ? `${selectedMonth} ${selectedYear}` : selectedYear}\n\n`;
    csv += "Type,Average,Maximum\n";
    csv += `Units (kWh),${data.stats.avgU},${data.stats.maxU}\n`;
    csv += `Amount (Rs),${data.stats.avgA},${data.stats.maxA}\n\n`;
    csv += "Date,Units (kWh),Amount (Rs)\n";
    
    if (timeView === 'daily') {
      for (let i = 0; i < 31; i++) {
        const day = (i + 1).toString().padStart(2, '0');
        csv += `${day}/${selectedMonth.slice(0,3)}/${selectedYear},${data.unitValues[i] || '0'},${data.amtValues[i] || '0.00'}\n`;
      }
    } else {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      monthNames.forEach((month, index) => {
        csv += `${month} ${selectedYear},${data.unitValues[index] || '0'},${data.amtValues[index] || '0.00'}\n`;
      });
    }
    
    return csv;
  };

  const downloadCSVWeb = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadCSVMobile = async (content, filename) => {
    try {
      // Use cache directory for temporary storage
      const directory = FileSystem.cacheDirectory;
      const fileUri = directory + filename;
      
      // Write the file
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      // Check if sharing is available
      const isSharingAvailable = await Sharing.isAvailableAsync();
      
      if (isSharingAvailable) {
        // Share the file
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Save Energy Report',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        // If sharing not available, show success message
        Alert.alert(
          'Success', 
          `Report saved as: ${filename}\n\nLocation: ${fileUri}`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Mobile download error:', error);
      throw error;
    }
  };

  // --- PDF EXPORT ---
  const exportPDF = async () => {
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial; padding: 20px; }
              .header { text-align: center; color: #02569B; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background: #02569B; color: white; padding: 10px; }
              td { padding: 10px; border: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <h1 class="header">Energy Consumption Report</h1>
            <p><strong>Period:</strong> ${selectedMonth} ${selectedYear}</p>
            <p><strong>View:</strong> ${timeView}</p>
            <table>
              <tr><th>Metric</th><th>Average</th><th>Maximum</th></tr>
              <tr><td>Units (kWh)</td><td>${data.stats.avgU}</td><td>${data.stats.maxU}</td></tr>
              <tr><td>Amount (Rs)</td><td>${data.stats.avgA}</td><td>${data.stats.maxA}</td></tr>
            </table>
          </body>
        </html>`;
      
      const { uri } = await Print.printToFileAsync({ html });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save PDF Report'
        });
      } else {
        Alert.alert('Success', 'PDF generated successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  // Rest of your component (GraphCard, return JSX) remains the same...
  const GraphCard = ({ title, unit, values, avg, max, isAmount }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          {isAmount ? <Text style={styles.currIcon}>₹</Text> : <Ionicons name="speedometer-outline" size={18} color="#02569B" />}
        </View>
        <Text style={styles.cardTitle}>{title}</Text>
        <TouchableOpacity style={styles.filterBadge} onPress={() => setShowFilter(true)}>
          <Ionicons name="options-outline" size={12} color="white" />
          <Text style={styles.badgeText}>{timeView === 'daily' ? `${selectedMonth.slice(0,3)} ${selectedYear}` : selectedYear}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.graphBody}>
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>{Math.round(parseFloat(max))}</Text>
          <Text style={styles.axisLabel}>0</Text>
        </View>
        
        <View style={styles.chartSpace}>
          {timeView === 'daily' ? (
            <View style={styles.lineGraphContainer}>
              <View style={[styles.areaShade, { 
                height: '50%', 
                backgroundColor: isAmount ? 'rgba(30,136,229,0.1)' : 'rgba(2, 86, 155, 0.1)' 
              }]} />
              
              <View style={styles.horizontalLine} />
              
              <View style={styles.pointsRow}>
                {values.slice(0, 12).map((v, i) => {
                  const bottomPos = (parseFloat(v) / parseFloat(max)) * 100;
                  return (
                    <View key={i} style={styles.dotContainer}>
                      <View style={[styles.connectingLine, { height: `${bottomPos}%` }]} />
                      <View style={[styles.dot, { 
                        bottom: `${bottomPos}%`,
                        backgroundColor: isAmount ? '#1E88E5' : '#02569B'
                      }]} />
                    </View>
                  );
                })}
              </View>
              <View style={styles.xAxis}>
                {['01','06','11','16','21','26','31'].slice(0, 5).map(d => 
                  <Text key={d} style={styles.axisLabel}>{d}</Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.barGraphContainer}>
              {values.slice(0, 12).map((v, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={[
                    styles.bar, 
                    { 
                      height: `${(parseFloat(v) / parseFloat(max)) * 100}%`,
                      backgroundColor: isAmount ? '#1E88E5' : '#02569B'
                    }
                  ]} />
                  {i % 2 === 0 && (
                    <Text style={styles.axisLabel}>
                      {['Jan','Mar','May','Jul','Sep','Nov'][i/2]}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statTitle}>Average</Text>
          <Text style={styles.statValBlue}>{avg}</Text>
          <Text style={styles.statUnit}>{unit}</Text>
        </View>
        <View style={styles.vDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statTitle}>Maximum</Text>
          <Text style={styles.statValRed}>{max}</Text>
          <Text style={styles.statUnit}>{unit}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.downloadBtn} onPress={exportPDF}>
            <Ionicons name="document-text" size={16} color="#02569B" />
            <Text style={styles.downloadText}>PDF Report</Text>
          </TouchableOpacity>
          {/* <TouchableOpacity style={[styles.downloadBtn, styles.excelBtn]} onPress={exportExcel}> */}
            {/* <Ionicons name="grid" size={16} color="#4CAF50" /> */}
            {/* <Text style={[styles.downloadText, styles.excelText]}>Excel/CSV</Text> */}
          {/* </TouchableOpacity> */}
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity 
            onPress={() => setTimeView('daily')} 
            style={[styles.tab, timeView === 'daily' && styles.activeTab]}
          >
            <Text style={[styles.tabText, timeView === 'daily' && styles.activeTabText]}>
              Daily View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setTimeView('monthly')} 
            style={[styles.tab, timeView === 'monthly' && styles.activeTab]}
          >
            <Text style={[styles.tabText, timeView === 'monthly' && styles.activeTabText]}>
              Monthly View
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <GraphCard 
          title="Units (kWh)" 
          unit="kWh" 
          values={data.unitValues} 
          avg={data.stats.avgU} 
          max={data.stats.maxU} 
        />
        <GraphCard 
          title="Bill Amount" 
          unit="Rs." 
          values={data.amtValues} 
          avg={data.stats.avgA} 
          max={data.stats.maxA} 
          isAmount={true} 
        />
        <View style={styles.spacer} />
      </ScrollView>

      <Modal visible={showFilter} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Filter</Text>
            <View style={styles.filterBody}>
              {timeView === 'daily' && (
                <View style={styles.col}>
                  <Text style={styles.colLabel}>Month</Text>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {months.map(m => (
                      <TouchableOpacity 
                        key={m} 
                        style={[styles.item, selectedMonth === m && styles.itemActive]} 
                        onPress={() => setSelectedMonth(m)}
                      >
                        <Text style={[styles.itemTxt, selectedMonth === m && styles.itemTxtActive]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              <View style={styles.col}>
                <Text style={styles.colLabel}>Year</Text>
                {years.map(y => (
                  <TouchableOpacity 
                    key={y} 
                    style={[styles.item, selectedYear === y && styles.itemActive]} 
                    onPress={() => setSelectedYear(y)}
                  >
                    <Text style={[styles.itemTxt, selectedYear === y && styles.itemTxtActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.done} onPress={() => setShowFilter(false)}>
              <Text style={styles.doneTxt}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// STYLES
const colors = {
  primary: '#02569B',
  primaryLight: '#E8F4FD',
  secondary: '#4CAF50',
  danger: '#D32F2F',
  warning: '#FF9800',
  background: '#F8F9FA',
  white: '#FFFFFF',
  gray100: '#F5F7FA',
  gray200: '#E9ECEF',
  gray300: '#DDDDDD',
  gray400: '#AAAAAA',
  gray500: '#666666',
  gray600: '#444444',
  black: '#333333',
};

const typography = {
  h1: { fontSize: 24, fontWeight: '700' },
  h2: { fontSize: 18, fontWeight: '600' },
  h3: { fontSize: 16, fontWeight: '600' },
  body: { fontSize: 14, fontWeight: '400' },
  small: { fontSize: 12, fontWeight: '400' },
  tiny: { fontSize: 10, fontWeight: '400' },
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  round: 20,
};

const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    ...shadows.sm,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  spacer: {
    height: spacing.xxxl,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.sm,
  },
  excelBtn: {
    borderColor: '#C8E6C9',
    backgroundColor: '#F1F8E9',
  },
  downloadText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.primary,
  },
  excelText: {
    color: colors.secondary,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  activeTab: {
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  tabText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.gray500,
  },
  activeTabText: {
    color: colors.primary,
  },

  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  currIcon: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  cardTitle: {
    flex: 1,
    ...typography.h3,
    color: colors.black,
  },
  filterBadge: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  badgeText: {
    color: colors.white,
    ...typography.tiny,
    fontWeight: '600',
  },

  // Graph Components
  graphBody: {
    height: 180,
    flexDirection: 'row',
    marginBottom: spacing.xl,
  },
  yAxis: {
    justifyContent: 'space-between',
    paddingRight: spacing.sm,
    alignItems: 'flex-end',
  },
  chartSpace: {
    flex: 1,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.gray300,
    position: 'relative',
  },
  axisLabel: {
    ...typography.tiny,
    color: colors.gray400,
    fontWeight: '500',
  },

  // Line Graph
  lineGraphContainer: {
    flex: 1,
    position: 'relative',
  },
  areaShade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  horizontalLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.gray200,
  },
  pointsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
  },
  dotContainer: {
    width: 18,
    height: '100%',
    alignItems: 'center',
    position: 'relative',
  },
  connectingLine: {
    width: 1.5,
    backgroundColor: 'rgba(2, 86, 155, 0.2)',
    position: 'absolute',
    bottom: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    zIndex: 10,
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: -20,
    left: spacing.sm,
    right: spacing.sm,
  },

  // Bar Graph
  barGraphContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: 14,
    borderTopLeftRadius: borderRadius.xs,
    borderTopRightRadius: borderRadius.xs,
    marginBottom: spacing.xs,
  },

  // Statistics
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  statTitle: {
    ...typography.tiny,
    color: colors.gray500,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  statValBlue: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statValRed: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  statUnit: {
    ...typography.tiny,
    color: colors.gray400,
    fontWeight: '500',
  },
  vDivider: {
    width: 1,
    backgroundColor: colors.gray300,
    marginHorizontal: spacing.md,
  },

  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.round,
    padding: spacing.xl,
    maxHeight: '60%',
    ...shadows.lg,
  },
  modalTitle: {
    ...typography.h2,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'center',
    color: colors.primary,
  },
  filterBody: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  col: {
    flex: 1,
  },
  colLabel: {
    fontWeight: '600',
    color: colors.gray500,
    ...typography.small,
    marginBottom: spacing.md,
  },
  item: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray100,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  itemActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  itemTxt: {
    ...typography.small,
    color: colors.gray600,
    fontWeight: '500',
    textAlign: 'center',
  },
  itemTxtActive: {
    color: colors.white,
    fontWeight: '600',
  },
  done: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  doneTxt: {
    color: colors.white,
    fontWeight: '700',
    ...typography.body,
  },
});