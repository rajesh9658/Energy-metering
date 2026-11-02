import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal,
  ActivityIndicator, Alert, Platform, NativeModules, PermissionsAndroid
} from 'react-native';

import { isRunningInExpoGo } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useEnergyUnit } from '../../src/context/EnergyUnitContext';
import axios from 'axios';
import { API_CONFIG, getMeterDailyConsumptionUrl, getMeterMonthlyConsumptionUrl, getYearlyConsumptionUrl, getMeterMonthlyReportUrl, getWalletTransactionsUrl } from '../../src/config';
import { generateDailyPdfHtml, generateMonthlyPdfHtml, generateMonthlyBillPdfHtml } from '../../src/utils/reportPdfTemplates';

const { width } = Dimensions.get('window');

export default function EnergyReport() {
  const { user, getSiteId } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const { energyUnitMode, showsKwh, showsKvah } = useEnergyUnit();
  const [unitRate, setUnitRate] = useState<number>(Number(user?.unit_rate) || 6.8);
  
  const [timeView, setTimeView] = useState('daily');
  const [showFilter, setShowFilter] = useState(false);
  const [showReportTypeModal, setShowReportTypeModal] = useState(false);
  const [downloadReportType, setDownloadReportType] = useState<'daily' | 'monthly'>('daily');
  const [downloadUnit, setDownloadUnit] = useState<'kwh' | 'kvah'>('kwh');
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.toLocaleString('default', { month: 'long' }));
  const [downloadMonth, setDownloadMonth] = useState<number>(currentDate.getMonth() + 1);
  const [downloadYear, setDownloadYear] = useState<string>(currentDate.getFullYear().toString());
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [showAllValues, setShowAllValues] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const graphScrollRef = useRef(null);
  
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
  
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [stats, setStats] = useState({
    avgU: '0.00',
    maxU: '0.00',
    avgKvah: '0.00',
    maxKvah: '0.00',
    avgA: '0.00',
    maxA: '0.00',
    totalUnits: '0.00',
    totalKvah: '0.00',
    totalAmount: '0.00'
  });

  // Months and Years
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const shortMonths = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  const currentRealDate = new Date();
  const currentRealYear = currentRealDate.getFullYear();
  const currentRealMonth = currentRealDate.getMonth() + 1; // 1 to 12
  const currentYear = currentRealYear;
  const years = Array.from({ length: 5 }, (_, i) => (currentRealYear - i).toString());
  const dynamicYears = years;

  const handleSelectDownloadYear = (yr: string) => {
    setDownloadYear(yr);
    if (Number(yr) === currentRealYear && downloadMonth >= currentRealMonth) {
      setDownloadMonth(Math.max(1, currentRealMonth - 1));
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    if (!loading) {
      fetchData();
    }
  }, [selectedMonth, selectedYear, timeView]);

  useEffect(() => {
    if (energyUnitMode !== 'both') return;

    const currentLength = timeView === 'daily' ? dailyData.length : monthlyData.length;
    if (!currentLength) return;

    const defaultIndex = 0;
    setHoveredIndex(defaultIndex);

    const timer = setTimeout(() => {
      graphScrollRef.current?.scrollTo?.({ x: 0, animated: false });
    }, 50);

    return () => clearTimeout(timer);
  }, [energyUnitMode, timeView, dailyData.length, monthlyData.length]);

  const fetchData = async () => {
    const siteId = getSiteId();
    if (!siteId) return;

    setLoading(true);
    try {
      if (timeView === 'daily') {
        await fetchDailyData(siteId);
      } else {
        await fetchYearlyMonthlyData(siteId, selectedYear);
      }
    } finally {
      setLoading(false);
    }
  };

 
  const fetchDailyData = async (siteId) => {
    const monthIndex = months.indexOf(selectedMonth) + 1;
    const monthParam = `${selectedYear}-${monthIndex.toString().padStart(2, '0')}`;

    const token = user?.token || user?.auth_token || user?.access_token || user?.bearer_token;
    const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      requestHeaders.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    try {
      const [consumptionResponse, reportResponse] = await Promise.allSettled([
        axios.get(getMeterDailyConsumptionUrl(siteId, monthParam), { headers: requestHeaders }),
        axios.get(getMeterMonthlyReportUrl(siteId, monthParam), {
          headers: requestHeaders
        }),
      ]);

      const foundRate =
        (consumptionResponse.status === 'fulfilled' ? consumptionResponse.value.data?.unit_rate || consumptionResponse.value.data?.rate_per_kwh : null) ||
        (reportResponse.status === 'fulfilled' ? reportResponse.value.data?.unit_rate || reportResponse.value.data?.rate_per_kwh : null) ||
        user?.unit_rate;
      if (foundRate && !isNaN(Number(foundRate)) && Number(foundRate) > 0) {
        setUnitRate(Number(foundRate));
      }

      const normalizedConsumptionData =
        consumptionResponse.status === 'fulfilled'
          ? normalizeDailyConsumptionRows(consumptionResponse.value.data?.data || [])
          : [];

      const normalizedReportData =
        reportResponse.status === 'fulfilled'
          ? normalizeDailyReportRows(reportResponse.value.data?.reports || [])
          : [];

      const reportDataByDay = new Map(
        normalizedReportData.map((item) => [String(item.day), item])
      );

      const mergedDailyData =
        normalizedConsumptionData.length > 0
          ? normalizedConsumptionData.map((item) => ({
              ...item,
              ...(reportDataByDay.get(String(item.day)) || {}),
              day: item.day,
              daily_units: getDailyUnits(item),
              daily_kvah: getDailyKvah(item),
              daily_kvah_delta: getDailyKvahDelta(item),
              daily_amount:
                reportDataByDay.get(String(item.day))?.daily_amount ?? item.daily_amount,
            }))
          : normalizedReportData;

      // Ensure data starts from Day 1 of the selected month
      const dayRecordMap = new Map();
      mergedDailyData.forEach((item) => {
        const d = String(parseInt(String(item.day), 10));
        if (d && d !== 'NaN') {
          dayRecordMap.set(d, item);
        }
      });

      const yearNum = Number(selectedYear) || currentRealYear;
      const daysInMonth = new Date(yearNum, monthIndex, 0).getDate();
      const isCurrentMonth = yearNum === currentRealYear && monthIndex === currentRealMonth;

      let maxDayInResponse = 0;
      dayRecordMap.forEach((_, key) => {
        const n = parseInt(key, 10);
        if (n > maxDayInResponse) maxDayInResponse = n;
      });

      const targetEndDay = isCurrentMonth
        ? Math.max(maxDayInResponse, currentRealDate.getDate())
        : (maxDayInResponse > 0 ? Math.max(maxDayInResponse, daysInMonth) : daysInMonth);

      const completeDailyData = [];
      for (let day = 1; day <= targetEndDay; day++) {
        const key = String(day);
        if (dayRecordMap.has(key)) {
          completeDailyData.push({
            ...dayRecordMap.get(key),
            day: String(day),
          });
        } else {
          completeDailyData.push({
            day: String(day),
            date: `${selectedYear}-${String(monthIndex).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            daily_units: 0,
            daily_kvah: 0,
            daily_kvah_delta: 0,
            daily_amount: 0,
            energy_used: 0,
            energy_amount: 0,
          });
        }
      }

      setDailyData(completeDailyData);
      calculateStats(completeDailyData, 'daily');
      setHoveredIndex(null);
    } catch (error) {
      console.error('Error fetching daily data:', error);
      setDailyData([]);
      calculateStats([], 'daily');
      setHoveredIndex(null);
    }
  };

  const fetchYearlyMonthlyData = async (siteId: any, year: any) => {
    const token = user?.token || user?.auth_token || user?.access_token || user?.bearer_token;
    const requestHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      requestHeaders.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    try {
      const response = await axios.get(
        getYearlyConsumptionUrl(siteId),
        {
          params: { year },
          headers: requestHeaders,
        }
      );

      if (response.data) {
        const processedData = processYearlyResponse(response.data);
        setMonthlyData(processedData);
        calculateStats(processedData, 'monthly');
        setHoveredIndex(null);
      }
    } catch (error) {
      console.error('Error fetching yearly data:', error);
    }
  };

  const processYearlyResponse = (apiData) => {
    try {
      if (apiData && Array.isArray(apiData.monthly_consumption)) {
        return apiData.monthly_consumption.map((item) => {
          const kwh = Number(item.total_kwh) || 0;
          const kvah = getMonthlyKvah(item);
          return {
            month: item.month,
            monthNumber: Number(item.month_key?.split('-')[1]) || 0,
            total_kwh: kwh,
            total_kvah: kvah,
            total_amount: calculateAmount(kwh),
          };
        });
      }
    } catch (error) {
      console.error('Error processing yearly response:', error);
    }
  };

  const calculateAmount = (kwh) => {
    const ratePerKwh = unitRate || Number(user?.unit_rate) || 6.8;
    return (kwh * ratePerKwh).toFixed(2);
  };

  const getNumericValue = (value, fallback = 0) => {
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? fallback : numericValue;
  };

  const findMetricValue = (source, keys) => {
    if (!source) return null;

    const normalizeKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedKeys = keys.map((key) => normalizeKey(key));
    const visited = new Set();

    const searchNested = (value) => {
      if (value == null || typeof value !== 'object') return null;
      if (visited.has(value)) return null;
      visited.add(value);

      if (Array.isArray(value)) {
        for (const item of value) {
          const nestedMatch = searchNested(item);
          if (nestedMatch != null) {
            return nestedMatch;
          }
        }
        return null;
      }

      for (const [entryKey, entryValue] of Object.entries(value)) {
        const normalizedEntryKey = normalizeKey(entryKey);
        const matchesRequestedKey = normalizedKeys.some(
          (key) =>
            normalizedEntryKey === key ||
            normalizedEntryKey.includes(key) ||
            key.includes(normalizedEntryKey)
        );

        if (matchesRequestedKey && entryValue != null && entryValue !== '') {
          const numericValue = Number(entryValue);
          if (!Number.isNaN(numericValue)) {
            return numericValue;
          }
        }
      }

      for (const entryValue of Object.values(value)) {
        const nestedMatch = searchNested(entryValue);
        if (nestedMatch != null) {
          return nestedMatch;
        }
      }

      return null;
    };

    return searchNested(source);
  };

  const getDailyUnits = (item) => {
    const value = item?.daily_units ?? item?.energy_used ?? item?.kwh_delta ?? item?.total_kwh ?? 0;
    return Number(value) || 0;
  };

  const getDailyKvah = (item) => {
    return findMetricValue(item, [
      'kvah_delta',
      'apparent_energy_delta',
      'daily_kvah',
      'energy_kvah',
      'total_kvah',
      'today_kvah',
      'closing_kVAh',
      'opening_kVAh',
    ]);
  };

  const getDailyKvahDelta = (item) => {
    const directValue =
      item?.daily_kvah_delta ??
      item?.kvah_delta ??
      item?.apparent_energy_delta ??
      item?.daily_kvah ??
      item?.energy_kvah;

    if (directValue != null && directValue !== '') {
      return getNumericValue(directValue, 0);
    }

    return findMetricValue(item, [
      'daily_kvah_delta',
      'kvah_delta',
      'apparent_energy_delta',
      'daily_kvah',
      'energy_kvah',
    ]);
  };

  const getMonthlyKvah = (item) => {
    return findMetricValue(item, [
      'total_kvah',
      'monthly_kvah',
      'kvah',
      'apparent_energy',
      'apparent_energy_total',
      'current_kvah',
    ]);
  };

  const getDisplayEnergyValue = (kwhValue, kvahValue) => {
    if (energyUnitMode === 'kvah') {
      return kvahValue != null ? kvahValue : 0;
    }

    return kwhValue;
  };

  const energyGraphTitle =
    energyUnitMode === 'kvah'
      ? 'Units (kVAh)'
      : energyUnitMode === 'both'
        ? 'Units (kWh / kVAh)'
        : 'Units (kWh)';

  const energyGraphUnit = energyUnitMode === 'kvah' ? 'kVAh' : 'kWh';

  const getDailyAmount = (item) => {
    if (item?.daily_amount != null) {
      return parseFloat(item.daily_amount) || 0;
    }
    if (item?.energy_amount != null) {
      return parseFloat(item.energy_amount) || 0;
    }
    return parseFloat(calculateAmount(getDailyUnits(item)));
  };

  const normalizeDayLabel = (value, fallbackIndex) => {
    if (value == null || value === '') {
      return `${fallbackIndex + 1}`;
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    const trimmedValue = String(value).trim();
    const dateMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
      return String(Number(dateMatch[3]));
    }

    const dayMatch = trimmedValue.match(/^(\d{1,2})/);
    if (dayMatch) {
      return String(Number(dayMatch[1]));
    }

    return `${fallbackIndex + 1}`;
  };

  const normalizeDailyReportRows = (rows) => {
    return [...rows]
      .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
      .map((item, index) => ({
        ...item,
        day: normalizeDayLabel(item.date, index),
        daily_units: Number(item.energy_used) || 0,
        daily_kvah: getDailyKvah(item),
        daily_kvah_delta: getDailyKvahDelta(item),
        daily_amount: Number(item.energy_amount) || 0,
      }));
  };

  const normalizeDailyConsumptionRows = (rows) => {
    return rows.map((item, index) => ({
      ...item,
      day: normalizeDayLabel(item.day || item.date, index),
      daily_units: getDailyUnits(item),
      daily_kvah: getDailyKvah(item),
      daily_kvah_delta: getDailyKvahDelta(item),
      daily_amount: getDailyAmount(item),
    }));
  };

  const calculateStats = (data, type) => {
    if (!data || data.length === 0) {
      resetStats();
      return;
    }

    let units = [];
    let kvahUnits = [];
    let amounts = [];
    
    if (type === 'daily') {
      units = data.map(item => getDailyUnits(item));
      kvahUnits = data
        .map(item => item?.daily_kvah_delta ?? getDailyKvahDelta(item))
        .filter(item => item != null)
        .map(item => getNumericValue(item, 0));
      amounts = data.map(item => getDailyAmount(item));
    } else {
      units = data.map(item => Number(item.total_kwh) || 0);
      kvahUnits = data.map(item => getMonthlyKvah(item)).filter(item => item != null);
      amounts = data.map(item => parseFloat(item.total_amount || calculateAmount(Number(item.total_kwh) || 0)));
    }
    
    const totalUnits = units.reduce((sum, val) => sum + val, 0);
    const totalKvah = kvahUnits.reduce((sum, val) => sum + val, 0);
    const totalAmount = amounts.reduce((sum, val) => sum + val, 0);
    const maxUnit = units.length > 0 ? Math.max(...units) : 1;
    const maxKvah = kvahUnits.length > 0 ? Math.max(...kvahUnits) : 0;
    const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 1;
    
    setStats({
      avgU: units.length > 0 ? (totalUnits / units.length).toFixed(2) : '0.00',
      maxU: maxUnit.toFixed(2),
      avgKvah: kvahUnits.length > 0 ? (totalKvah / kvahUnits.length).toFixed(2) : '0.00',
      maxKvah: maxKvah.toFixed(2),
      avgA: amounts.length > 0 ? (totalAmount / amounts.length).toFixed(2) : '0.00',
      maxA: maxAmount.toFixed(2),
      totalUnits: totalUnits.toFixed(2),
      totalKvah: totalKvah.toFixed(2),
      totalAmount: totalAmount.toFixed(2)
    });
  };

  const resetStats = () => {
    setStats({
      avgU: '0.00',
      maxU: '0.00',
      avgKvah: '0.00',
      maxKvah: '0.00',
      avgA: '0.00',
      maxA: '0.00',
      totalUnits: '0.00',
      totalKvah: '0.00',
      totalAmount: '0.00'
    });
  };

  const getCurrentData = () => {
    if (timeView === 'daily') {
      return {
        unitValues: dailyData.map(item =>
          energyUnitMode === 'kvah'
            ? getNumericValue(item?.daily_kvah_delta ?? getDailyKvahDelta(item), 0)
            : getDisplayEnergyValue(getDailyUnits(item), getDailyKvah(item))
        ),
        amtValues: dailyData.map(item => getDailyAmount(item)),
        labels: dailyData.map(item => item.day || ''),
        data: dailyData
      };
    } else {
      return {
        unitValues: monthlyData.map(item => getDisplayEnergyValue(Number(item.total_kwh) || 0, getMonthlyKvah(item))),
        amtValues: monthlyData.map(item => parseFloat(item.total_amount || calculateAmount(item.total_kwh || 0))),
        labels: monthlyData.map(item => item.month || ''),
        data: monthlyData
      };
    }
  };

  const handleViewChange = (viewType) => {
    setTimeView(viewType);
    setHoveredIndex(null);
    setShowAllValues(true);
  };

  const savePdfToDevice = async (uri, fileName) => {
    try {
      if (Platform.OS === "android") {
        try {
          const downloadDest = `${RNFS.DownloadDirectoryPath}/${fileName}`;
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
                  body: `${fileName} saved to Downloads folder.`,
                  data: { filePath: downloadDest },
                },
                trigger: null,
              });
            } catch (notifErr) {
              console.warn("Notification scheduling failed", notifErr);
            }

            setSuccessModalMessage(fileName);
            setSuccessModalFilePath(downloadDest);
            setShowSuccessModal(true);
            return true;
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
            const fileUri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
              savedDirectoryUri,
              fileName,
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

            setSuccessModalMessage(fileName);
            setSuccessModalFilePath(fileUri);
            setShowSuccessModal(true);
            return true;
          }
        } catch (androidErr) {
          console.warn("Direct folder save failed, fallback to sharing sheet", androidErr);
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save Energy Report",
          UTI: "com.adobe.pdf",
        });
        return true;
      } else {
        Alert.alert("PDF Ready", "PDF generated, but sharing is not available in this build.");
        return false;
      }
    } catch (error) {
      console.error("Save PDF error:", error);
      Alert.alert("Error", "Failed to save PDF to device.");
      return false;
    }
  };

  // Unified PDF Export (Daily or Monthly, kWh or kVAh) using existing blue template
  const exportReportPDF = async (
    reportType: 'daily' | 'monthly' = downloadReportType,
    unit: 'kwh' | 'kvah' = downloadUnit,
    targetMonthNum: number = downloadMonth,
    targetYear: string = downloadYear
  ) => {
    try {
      const siteId = getSiteId();
      if (!siteId) {
        Alert.alert('Error', 'Site ID not found');
        return;
      }

      setIsGeneratingReport(true);

      const isDaily = reportType === 'daily';
      const monthIndex = isDaily ? months.indexOf(selectedMonth) + 1 : targetMonthNum;
      const effectiveYear = isDaily ? selectedYear : targetYear;
      const monthParam = `${effectiveYear}-${monthIndex.toString().padStart(2, '0')}`;

      const token = user?.token || user?.auth_token || user?.access_token || user?.bearer_token;
      const pdfHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        pdfHeaders.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }

      // 1. If Monthly report selected, first attempt to download the exact PDF generated on the Web server
      if (reportType === 'monthly') {
        try {
          const serverBillUrl = `${API_CONFIG.BASE_URL}/bill/download?month=${monthIndex}&year=${effectiveYear}&format=pdf&siteId=${siteId}`;
          const tempDownloadPath = `${FileSystem.cacheDirectory}monthly_bill_${siteId}_${effectiveYear}_${monthIndex}_${Date.now()}.pdf`;

          const downloadHeaders: Record<string, string> = {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/pdf, application/json, */*',
          };
          if (token) {
            downloadHeaders.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          }

          const dlRes = await FileSystem.downloadAsync(serverBillUrl, tempDownloadPath, {
            headers: downloadHeaders,
          });

          if (dlRes.status === 200) {
            const fileInfo = await FileSystem.getInfoAsync(tempDownloadPath);
            if (fileInfo.exists && (fileInfo as any).size > 1000) {
              const fileName = `monthly-bill-${effectiveYear}-${monthIndex.toString().padStart(2, '0')}-${siteId}.pdf`;
              await savePdfToDevice(tempDownloadPath, fileName);
              setShowReportTypeModal(false);
              return;
            }
          }
        } catch (serverDlErr) {
          console.warn('Web server /bill/download attempt failed, trying fallback:', serverDlErr);
        }

        // Secondary server endpoint: /meter-report/monthly-pdf/{siteId}?month=YYYY-MM
        try {
          const serverReportUrl = `${API_CONFIG.BASE_URL}/meter-report/monthly-pdf/${siteId}?month=${monthParam}`;
          const tempReportPath = `${FileSystem.cacheDirectory}monthly_report_${siteId}_${monthParam}_${Date.now()}.pdf`;
          const downloadHeaders: Record<string, string> = {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/pdf, application/json, */*',
          };
          if (token) {
            downloadHeaders.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
          }

          const reportDlRes = await FileSystem.downloadAsync(serverReportUrl, tempReportPath, {
            headers: downloadHeaders,
          });

          if (reportDlRes.status === 200) {
            const fileInfo = await FileSystem.getInfoAsync(tempReportPath);
            if (fileInfo.exists && (fileInfo as any).size > 1000) {
              const fileName = `monthly-meter-report-${monthParam}-${siteId}.pdf`;
              await savePdfToDevice(tempReportPath, fileName);
              setShowReportTypeModal(false);
              return;
            }
          }
        } catch (serverReportErr) {
          console.warn('Web server /meter-report/monthly-pdf attempt failed:', serverReportErr);
        }
      }

      // Fetch both monthly report data and daily consumption to ensure all metrics exist
      const [consumptionResponse, reportResponse] = await Promise.allSettled([
        axios.get(getMeterDailyConsumptionUrl(siteId, monthParam), { headers: pdfHeaders }),
        axios.get(getMeterMonthlyReportUrl(siteId, monthParam), { headers: pdfHeaders }),
      ]);

      const monthlyReportData = reportResponse.status === 'fulfilled' ? reportResponse.value.data : null;
      const rawReports = monthlyReportData?.reports || [];
      const meta = monthlyReportData?.meta || {
        meter_number: user?.meter_number,
        meter_name: user?.meter_name || user?.site_name,
        latest_reading: new Date().toLocaleDateString('en-GB')
      };

      const normalizedConsumptionData =
        consumptionResponse.status === 'fulfilled'
          ? normalizeDailyConsumptionRows(consumptionResponse.value.data?.data || [])
          : [];

      const consumptionByDay = new Map(
        normalizedConsumptionData.map((item) => [String(item.day), item])
      );

      // Build unified daily list ensuring kWh and kVAh values are both present
      let finalReports = rawReports.map((item: any) => {
        const dayNumber = item.date ? new Date(item.date).getDate() : item.day;
        const matchedConsumption = consumptionByDay.get(String(dayNumber)) || {};

        const openingKwh = Number(item.opening_kwh ?? matchedConsumption.opening_kwh ?? 0);
        const energyKwh = Number(item.energy_used ?? item.energy_consumed ?? matchedConsumption.daily_units ?? matchedConsumption.energy_used ?? 0);
        const closingKwh = Number(item.closing_kwh ?? matchedConsumption.closing_kwh ?? (openingKwh + energyKwh));

        const openingKvah = Number(item.opening_kvah ?? item.opening_kVAh ?? matchedConsumption.opening_kvah ?? matchedConsumption.opening_kVAh ?? 0);
        const energyKvah = Number(
          item.energy_used_kvah ??
          item.kvah_used ??
          item.kvah_delta ??
          matchedConsumption.daily_kvah_delta ??
          matchedConsumption.daily_kvah ??
          0
        );
        const closingKvah = Number(
          item.closing_kvah ??
          item.closing_kVAh ??
          matchedConsumption.closing_kvah ??
          (openingKvah > 0 && energyKvah > 0 ? openingKvah + energyKvah : 0)
        );

        const energyAmt = Number(item.energy_amount ?? matchedConsumption.daily_amount ?? 0);
        const fixedCharges = Number((item.fixed_mains || 0) + (item.fixed_dg || 0));
        const otherCharges = Number(item.other_charges ?? 0);
        const totalRowAmount = Number(item.total_row_amount ?? item.total_amount ?? 0);
        const tariff = Number(item.eb_tariff ?? item.tariff_rate ?? 0);

        return {
          ...item,
          ...matchedConsumption,
          date: item.date || `${effectiveYear}-${monthIndex.toString().padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`,
          meter_id: meta.meter_number || item.meter_id || '',
          opening_kwh: openingKwh,
          closing_kwh: closingKwh,
          energy_used: energyKwh,
          opening_kvah: openingKvah,
          closing_kvah: closingKvah,
          energy_used_kvah: energyKvah,
          eb_tariff: tariff,
          energy_amount: energyAmt,
          fixed_mains: Number(item.fixed_mains || 0),
          fixed_dg: Number(item.fixed_dg || 0),
          other_charges: otherCharges,
          total_row_amount: totalRowAmount,
          opening_balance: Number(item.opening_balance || 0),
          closing_balance: Number(item.closing_balance || 0),
        };
      });

      // If monthly reports endpoint had no records but consumption endpoint had data, map from consumption
      if (finalReports.length === 0 && normalizedConsumptionData.length > 0) {
        finalReports = normalizedConsumptionData.map((item: any) => {
          const dayNum = String(item.day || '1').padStart(2, '0');
          const dayDate = `${effectiveYear}-${monthIndex.toString().padStart(2, '0')}-${dayNum}`;
          const kwhVal = getDailyUnits(item);
          const kvahVal = getNumericValue(item?.daily_kvah_delta ?? getDailyKvahDelta(item), 0);
          const energyAmt = Number(item.energy_amount ?? item.daily_amount ?? 0);
          const tariff = Number(item.eb_tariff ?? item.tariff_rate ?? 0);
          const otherCharges = Number(item.other_charges ?? 0);
          const totalRowAmount = Number(item.total_row_amount ?? item.total_amount ?? 0);

          return {
            date: dayDate,
            meter_id: meta.meter_number || '',
            opening_kwh: Number(item.opening_kwh || 0),
            closing_kwh: Number(item.closing_kwh || 0),
            energy_used: kwhVal,
            opening_kvah: Number(item.opening_kvah || 0),
            closing_kvah: Number(item.closing_kvah || 0),
            energy_used_kvah: kvahVal,
            eb_tariff: tariff,
            energy_amount: energyAmt,
            fixed_mains: Number(item.fixed_mains || 0),
            fixed_dg: Number(item.fixed_dg || 0),
            other_charges: otherCharges,
            total_row_amount: totalRowAmount,
            opening_balance: Number(item.opening_balance || 0),
            closing_balance: Number(item.closing_balance || 0),
          };
        });
      }

      if (finalReports.length === 0) {
        Alert.alert('Notice', 'No report data available for the selected period');
        return;
      }

      const isKvah = unit === 'kvah';
      let totalEnergy = 0;
      let totalEnergyAmount = 0;
      let totalFixed = 0;
      let totalOther = 0;
      let totalAmount = 0;

      finalReports.forEach((report: any) => {
        const energyUsed = isKvah ? (report.energy_used_kvah || 0) : (report.energy_used || 0);
        const energyAmount = report.energy_amount || 0;
        const fixedCharges = (report.fixed_mains || 0) + (report.fixed_dg || 0);
        const otherCharges = report.other_charges || 0;
        const totalRowAmount = energyAmount + fixedCharges + otherCharges;

        totalEnergy += energyUsed;
        totalEnergyAmount += energyAmount;
        totalFixed += fixedCharges;
        totalOther += otherCharges;
        totalAmount += totalRowAmount;
      });

      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return String(dateStr);
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).replace(/\//g, '-');
      };

      const resolvedSiteName =
        meta.site_name ||
        meta.meter_name ||
        user?.site_name ||
        'Energy Meter Report';

      if (reportType === 'monthly') {
        let rechargesList: Array<{ date: string; type: string; amount: number }> = [];
        let totalRecharge = 0;

        try {
          const fromDate = `${effectiveYear}-${monthIndex.toString().padStart(2, '0')}-01`;
          const txnUrl = `${getWalletTransactionsUrl(siteId, 'recharge', fromDate)}&per_page=50`;
          const txnRes = await axios.get(txnUrl, { headers: pdfHeaders });
          if (txnRes.data?.data?.transactions && Array.isArray(txnRes.data.data.transactions)) {
            const monthPrefix = `${effectiveYear}-${monthIndex.toString().padStart(2, '0')}`;
            const filteredTxns = txnRes.data.data.transactions.filter((t: any) => {
              const tDate = t.transaction_date || t.created_at || '';
              return tDate.startsWith(monthPrefix) || String(t.type || '').toLowerCase() === 'recharge';
            });
            rechargesList = filteredTxns.map((t: any) => {
              const amt = Number(t.amount || 0);
              totalRecharge += amt;
              return {
                date: formatDate(t.transaction_date || t.created_at),
                type: 'Recharge',
                amount: amt,
              };
            });
          }
        } catch (txnErr) {
          console.log('Optional transactions fetch skipped:', txnErr);
        }

        const firstRow = finalReports[0] || {};
        const lastRow = finalReports[finalReports.length - 1] || {};

        const isKvah = unit === 'kvah';
        const prevReading = isKvah ? Number(firstRow.opening_kvah || 0) : Number(firstRow.opening_kwh || 0);
        const currReading = isKvah
          ? Number(lastRow.closing_kvah || (prevReading + totalEnergy))
          : Number(lastRow.closing_kwh || (prevReading + totalEnergy));
        const totalUnits = totalEnergy;
        const rate = unitRate || Number(firstRow.eb_tariff || 0) || 6.8;
        const mainsCharge = totalUnits * rate;
        const openingBal = Number(firstRow.opening_balance || 0);
        const remainingBal = Number(lastRow.closing_balance || (openingBal + totalRecharge - mainsCharge));

        const lastDayOfMonth = new Date(Number(effectiveYear), monthIndex, 0).getDate();
        const billPeriodStr = `01/${monthIndex.toString().padStart(2, '0')}/${effectiveYear} - ${lastDayOfMonth.toString().padStart(2, '0')}/${monthIndex.toString().padStart(2, '0')}/${effectiveYear}`;
        const billNoStr = `BILL-${effectiveYear}${monthIndex.toString().padStart(2, '0')}-${meta.meter_number || siteId}`;
        const nextMonthNum = monthIndex === 12 ? 1 : monthIndex + 1;
        const nextMonthYear = monthIndex === 12 ? Number(effectiveYear) + 1 : Number(effectiveYear);
        const billDateStr = `${nextMonthYear}-${nextMonthNum.toString().padStart(2, '0')}-01 00:00:00`;

        const html = generateMonthlyBillPdfHtml({
          siteName: resolvedSiteName,
          meta,
          user,
          billingMonth: `${effectiveYear}-${monthIndex.toString().padStart(2, '0')}`,
          billPeriod: billPeriodStr,
          billDate: billDateStr,
          billNumber: billNoStr,
          unit,
          previousReading: prevReading,
          currentReading: currReading,
          unitsConsumed: totalUnits,
          ratePerUnit: rate,
          mainsEnergyCharge: mainsCharge,
          dgPreviousReading: 0,
          dgCurrentReading: 0,
          dgUnitsConsumed: 0,
          dgRatePerUnit: 1,
          dgEnergyCharge: 0,
          serverRent: 0,
          fixedChargesMains: Number(totalFixed || 0),
          fixedChargesDg: 0,
          totalCurrentMonthCharges: mainsCharge + Number(totalFixed || 0),
          previousOpeningBalance: openingBal,
          recharges: rechargesList,
          totalRechargePaid: totalRecharge,
          remainingWalletBalance: remainingBal,
        });

        const { uri } = await Print.printToFileAsync({ html });
        const fileName = `monthly-bill-invoice-${unit}-${effectiveYear}-${monthParam}-${Date.now()}.pdf`;
        await savePdfToDevice(uri, fileName);
        setShowReportTypeModal(false);
        return;
      }

      const html = generateMonthlyPdfHtml({
        siteName: resolvedSiteName,
        meta,
        reports: finalReports,
        totalEnergy,
        totalEnergyAmount,
        totalFixed,
        totalOther,
        totalAmount,
        formatDate,
        unit,
        reportType,
        showTotalRow: true,
      });

      const { uri } = await Print.printToFileAsync({ html });
      const fileName = `${reportType}-meter-report-${unit}-${effectiveYear}-${monthParam}-${Date.now()}.pdf`;
      await savePdfToDevice(uri, fileName);
      setShowReportTypeModal(false);
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const exportDailyPDF = async () => {
    return exportReportPDF('daily', downloadUnit);
  };

  const exportDetailedPDF = async () => {
    return exportReportPDF('monthly', downloadUnit);
  };

  const GraphCard = ({ title, unit, isAmount }: { title: string; unit: string; isAmount?: boolean }) => {
    const currentData = getCurrentData();
    const values = isAmount ? currentData.amtValues : currentData.unitValues;
    const isDualEnergyMode = !isAmount && energyUnitMode === 'both';
    const secondaryValues = !isAmount && energyUnitMode === 'both'
      ? (
          timeView === 'daily'
            ? dailyData.map((item) => getNumericValue(item?.daily_kvah_delta ?? getDailyKvahDelta(item), 0))
            : monthlyData.map((item) => getNumericValue(getMonthlyKvah(item), 0))
        )
      : [];
    const showKvahStats = !isAmount && Number(stats.totalKvah) > 0;
    const primaryAverage = isAmount
      ? stats.avgA
      : energyUnitMode === 'kvah'
        ? stats.avgKvah
        : stats.avgU;
    const primaryMaximum = isAmount
      ? stats.maxA
      : energyUnitMode === 'kvah'
        ? stats.maxKvah
        : stats.maxU;
    const primaryTotal = isAmount
      ? stats.totalAmount
      : energyUnitMode === 'kvah'
        ? stats.totalKvah
        : stats.totalUnits;
    const maxValue = Math.max(
      ...[...values, ...secondaryValues].filter(v => !isNaN(v)),
      1
    );
    const dataLength = timeView === 'daily' ? dailyData.length : 12;
    const selectedDetailIndex =
      isDualEnergyMode && values.length > 0
        ? (hoveredIndex !== null && hoveredIndex >= 0 && hoveredIndex < values.length
            ? hoveredIndex
            : values.length - 1)
        : null;

    const selKwh = selectedDetailIndex !== null ? Number(values[selectedDetailIndex] || 0) : 0;
    const selKvah = selectedDetailIndex !== null ? Number(secondaryValues[selectedDetailIndex] || 0) : 0;
    const selPF = selKvah > 0 ? Math.min(1.0, selKwh / selKvah) : 1.0;
    const selLabel = selectedDetailIndex !== null
      ? (timeView === 'daily'
          ? `${selectedMonth.slice(0, 3)} ${currentData.labels[selectedDetailIndex] || (selectedDetailIndex + 1)}`
          : `${currentData.labels[selectedDetailIndex] || months[selectedDetailIndex] || ''} ${selectedYear}`)
      : '';

    const totalKwhNum = Number(stats.totalUnits) || 0;
    const totalKvahNum = Number(stats.totalKvah) || 0;
    const overallPF = totalKvahNum > 0 ? Math.min(1.0, totalKwhNum / totalKvahNum) : 1.0;
    const pfStatus = overallPF >= 0.90
      ? { label: 'Optimal PF', color: '#16A34A', bg: isDarkMode ? 'rgba(22, 163, 74, 0.2)' : '#DCFCE7' }
      : overallPF >= 0.80
        ? { label: 'Good PF', color: isDarkMode ? '#60A5FA' : '#02569B', bg: isDarkMode ? 'rgba(2, 86, 155, 0.22)' : '#E0F2FE' }
        : { label: 'Low PF', color: isDarkMode ? '#FBBF24' : '#D97706', bg: isDarkMode ? 'rgba(217, 119, 6, 0.22)' : '#FEF3C7' };
    
    const barWidth = timeView === 'daily' 
      ? Math.max(8, Math.min(16, (width - 100) / Math.min(dataLength, 31)))
      : Math.max(12, Math.min(22, (width - 100) / 12));
    
    const handleToggleValues = () => {
      setShowAllValues(!showAllValues);
    };

    const handleBarPress = (index) => {
      if (hoveredIndex === index) {
        setHoveredIndex(null);
      } else {
        setHoveredIndex(index);
      }
    };

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDarkMode ? theme.surface : "#FFFFFF",
            borderColor: isDarkMode ? theme.border : "#E2E8F0",
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF' }]}>
            {isAmount ? <Text style={[styles.currIcon, { color: '#2563EB' }]}>₹</Text> : <Ionicons name="speedometer-outline" size={18} color="#2563EB" />}
          </View>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{title}</Text>
            <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 1 }}>
              {timeView === 'daily' ? 'Daily consumption breakdown' : 'Monthly consumption trend'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.filterBadgeModern,
              { backgroundColor: isDarkMode ? theme.primary : "#2563EB" },
            ]}
            onPress={() => setShowFilter(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={12} color="#FFFFFF" />
            <Text style={styles.filterBadgeText}>
              {timeView === 'daily' ? `${selectedMonth.slice(0,3)} ${selectedYear}` : selectedYear}
            </Text>
            <Ionicons name="chevron-down" size={11} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>

        {isDualEnergyMode ? (
          <View style={styles.dualControlsWrap}>
            <View style={[styles.seriesLegendModern, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: isDarkMode ? '#334155' : '#E2E8F0' }]}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                <Text style={[styles.legendText, { color: isDarkMode ? '#93C5FD' : '#1E40AF' }]} numberOfLines={1}>Active (kWh)</Text>
              </View>
              <View style={[styles.legendSeparatorDot, { backgroundColor: isDarkMode ? '#475569' : '#CBD5E1' }]} />
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.legendText, { color: isDarkMode ? '#6EE7B7' : '#065F46' }]} numberOfLines={1}>Apparent (kVAh)</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={[
                styles.toggleValuesButtonModern,
                {
                  backgroundColor: showAllValues 
                    ? (isDarkMode ? 'rgba(37, 99, 235, 0.25)' : '#EFF6FF')
                    : (isDarkMode ? theme.card : "#FFFFFF"),
                  borderColor: showAllValues 
                    ? (isDarkMode ? '#3B82F6' : '#2563EB')
                    : (isDarkMode ? theme.border : "#E2E8F0"),
                },
              ]}
              onPress={handleToggleValues}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={showAllValues ? "eye" : "eye-outline"} 
                size={11} 
                color={showAllValues ? (isDarkMode ? '#60A5FA' : '#2563EB') : theme.mutedText} 
              />
              <Text 
                style={[
                  styles.toggleValuesTextModern, 
                  { 
                    color: showAllValues ? (isDarkMode ? '#60A5FA' : '#2563EB') : theme.mutedText,
                    fontWeight: showAllValues ? '700' : '500'
                  }
                ]}
              >
                {showAllValues ? 'Values ON' : 'Values OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[
              styles.toggleValuesButtonModern,
              {
                backgroundColor: showAllValues 
                  ? (isDarkMode ? 'rgba(37, 99, 235, 0.25)' : '#EFF6FF')
                  : (isDarkMode ? theme.card : "#FFFFFF"),
                borderColor: showAllValues 
                  ? (isDarkMode ? '#3B82F6' : '#2563EB')
                  : (isDarkMode ? theme.border : "#E2E8F0"),
                alignSelf: 'flex-end',
                marginBottom: spacing.md,
              },
            ]}
            onPress={handleToggleValues}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showAllValues ? "eye" : "eye-outline"} 
              size={12} 
              color={showAllValues ? (isDarkMode ? '#60A5FA' : '#2563EB') : theme.mutedText} 
            />
            <Text 
              style={[
                styles.toggleValuesTextModern, 
                { 
                  color: showAllValues ? (isDarkMode ? '#60A5FA' : '#2563EB') : theme.mutedText,
                  fontWeight: showAllValues ? '700' : '500'
                }
              ]}
            >
              {showAllValues ? 'Values ON' : 'Values OFF'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Hero Interactive Inspector Card for Dual Mode */}
        {isDualEnergyMode && selectedDetailIndex !== null && (
          <View style={[
            styles.heroInspectorCardModern,
            {
              backgroundColor: isDarkMode ? '#131F33' : '#F8FAFC',
              borderColor: isDarkMode ? '#1E293B' : '#E2E8F0',
            }
          ]}>
            <View style={styles.heroInspectorHeader}>
              <View style={styles.heroInspectorDayBadge}>
                <View style={[styles.heroDateIconWrap, { backgroundColor: isDarkMode ? '#1E293B' : '#EFF6FF' }]}>
                  <Ionicons name="calendar-outline" size={13} color="#2563EB" />
                </View>
                <Text style={[styles.heroInspectorDayText, { color: theme.text }]}>
                  {selLabel}
                </Text>
              </View>
              <View style={[
                styles.heroInspectorPill, 
                { 
                  backgroundColor: hoveredIndex !== null 
                    ? (isDarkMode ? 'rgba(37, 99, 235, 0.25)' : '#EFF6FF')
                    : (isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#ECFDF5'),
                  borderColor: hoveredIndex !== null
                    ? (isDarkMode ? '#3B82F6' : '#93C5FD')
                    : (isDarkMode ? '#10B981' : '#A7F3D0'),
                  borderWidth: 1,
                }
              ]}>
                <View style={[
                  styles.statusDotPulse, 
                  { backgroundColor: hoveredIndex !== null ? '#2563EB' : '#10B981' }
                ]} />
                <Text style={[
                  styles.heroInspectorHint, 
                  { color: hoveredIndex !== null ? (isDarkMode ? '#93C5FD' : '#1D4ED8') : (isDarkMode ? '#6EE7B7' : '#047857') }
                ]}>
                  {hoveredIndex !== null ? 'Selected Reading' : 'Latest Reading'}
                </Text>
              </View>
            </View>

            <View style={styles.heroInspectorPodRow}>
              {/* Active */}
              <View style={[styles.metricPod, { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF', borderColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}>
                <View style={styles.metricPodHeader}>
                  <View style={[styles.legendDotSmall, { backgroundColor: '#2563EB' }]} />
                  <Text style={[styles.metricPodLabel, { color: theme.mutedText }]}>Active (kWh)</Text>
                </View>
                <Text style={[styles.metricPodValue, { color: isDarkMode ? '#60A5FA' : '#1D4ED8' }]}>
                  {selKwh.toFixed(1)}
                </Text>
              </View>

              {/* Apparent */}
              <View style={[styles.metricPod, { backgroundColor: isDarkMode ? '#0F172A' : '#FFFFFF', borderColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}>
                <View style={styles.metricPodHeader}>
                  <View style={[styles.legendDotSmall, { backgroundColor: '#10B981' }]} />
                  <Text style={[styles.metricPodLabel, { color: theme.mutedText }]}>Apparent (kVAh)</Text>
                </View>
                <Text style={[styles.metricPodValue, { color: isDarkMode ? '#34D399' : '#059669' }]}>
                  {selKvah.toFixed(1)}
                </Text>
              </View>
            </View>

            <View style={styles.heroInspectorFooter}>
              <Ionicons name="finger-print-outline" size={11} color={theme.mutedText} />
              <Text style={[styles.heroInspectorFooterText, { color: theme.mutedText }]}>
                Tap any bar below to view its exact readings
              </Text>
            </View>
          </View>
        )}

        <View style={styles.graphBody}>
          <View style={[styles.yAxis, { paddingBottom: 26 }]}>
            <Text style={[styles.axisLabel, { color: theme.mutedText }]}>{(maxValue * 1.2).toFixed(0)}</Text>
            <Text style={[styles.axisLabel, { color: theme.mutedText }]}>{((maxValue * 1.2) * 0.5).toFixed(0)}</Text>
            <Text style={[styles.axisLabel, { color: theme.mutedText }]}>0</Text>
          </View>
          
          <View style={styles.chartSpace}>
            {/* Subtle horizontal reference gridlines */}
            <View style={[styles.chartGridLine, { top: '0%', borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />
            <View style={[styles.chartGridLine, { top: '50%', borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]} />

            {timeView === 'daily' ? (
              <ScrollView 
                ref={graphScrollRef}
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.scrollableGraph}
              >
                {isDualEnergyMode ? (
                  <View style={styles.barGraphContainer}>
                    {values.map((v, i) => {
                      const value = Number(v) || 0;
                      const secondaryValue = Number(secondaryValues[i]) || 0;
                      const barHeight = value > 0 ? (value / (maxValue * 1.2)) * 68 : 0;
                      const secondaryBarHeight = secondaryValue > 0 ? (secondaryValue / (maxValue * 1.2)) * 68 : 0;
                      const isSelected = selectedDetailIndex === i;
                      const dailyBarWidth = Math.max(7, Math.min(9, (width - 120) / Math.min(dataLength, 31)));
                      const colWidth = dailyBarWidth * 2 + 22;
                      const maxBarH = Math.max(barHeight, secondaryBarHeight);
                      const pillBottomPct = Math.min(Math.max(maxBarH + 9, 18), 84);
                      
                      return (
                        <TouchableOpacity 
                          key={i}
                          style={[
                            styles.barCol,
                            { width: colWidth, marginHorizontal: 2 },
                          ]}
                          onPress={() => handleBarPress(i)}
                          activeOpacity={0.7}
                        >
                          {showAllValues && (value > 0 || secondaryValue > 0) && (
                            <View
                              style={[
                                styles.cleanMicroBadge,
                                {
                                  bottom: `${pillBottomPct}%`,
                                  backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                                  borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                                },
                              ]}
                            >
                              <Text style={[styles.cleanMicroText, { color: isDarkMode ? '#60A5FA' : '#2563EB' }]}>
                                {value.toFixed(0)}
                              </Text>
                              <Text style={[styles.cleanMicroSep, { color: isDarkMode ? '#64748B' : '#CBD5E1' }]}>|</Text>
                              <Text style={[styles.cleanMicroText, { color: isDarkMode ? '#34D399' : '#059669' }]}>
                                {secondaryValue.toFixed(0)}
                              </Text>
                            </View>
                          )}

                          <View style={styles.dualBarWrapper}>
                            <View
                              style={[
                                styles.bar,
                                {
                                  height: `${Math.max(barHeight, value > 0 ? 3 : 0)}%`,
                                  width: dailyBarWidth,
                                  backgroundColor: '#2563EB',
                                  borderTopLeftRadius: 5,
                                  borderTopRightRadius: 5,
                                },
                              ]}
                            />
                            <View
                              style={[
                                styles.bar,
                                styles.secondaryBar,
                                {
                                  height: `${Math.max(secondaryBarHeight, secondaryValue > 0 ? 3 : 0)}%`,
                                  width: dailyBarWidth,
                                  backgroundColor: '#10B981',
                                  borderTopLeftRadius: 5,
                                  borderTopRightRadius: 5,
                                },
                              ]}
                            />
                          </View>

                          <View style={[
                            styles.dayLabelBadge,
                            {
                              position: 'absolute',
                              bottom: -22,
                            },
                          ]}>
                            <Text style={[
                              styles.dayLabelText,
                              {
                                color: isSelected
                                  ? (isDarkMode ? '#60A5FA' : '#2563EB')
                                  : (isDarkMode ? '#94A3B8' : colors.gray500),
                                fontWeight: isSelected ? '700' : '500',
                                fontSize: dataLength > 20 ? 9 : 10,
                              }
                            ]}>
                              {currentData.labels[i] || i + 1}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.barGraphContainer}>
                    {values.map((v, i) => {
                      const value = Number(v) || 0;
                      const barHeight = value > 0 ? (value / (maxValue * 1.2)) * 68 : 0;
                      const isSelected = hoveredIndex === i;
                      const formattedDailyValue = value.toFixed(isAmount ? 0 : (value % 1 === 0 ? 0 : 1));
                      const dailyLabelWidth = Math.max(22, Math.min(30, formattedDailyValue.length * 6 + 5));
                      const singleBarWidth = 16;
                      const colWidth = 44;
                      const singleColor = isAmount
                        ? '#1E88E5'
                        : energyUnitMode === 'kvah'
                          ? '#10B981'
                          : '#2563EB';

                      return (
                        <TouchableOpacity 
                          key={i}
                          style={[
                            styles.barCol,
                            { width: colWidth, marginHorizontal: 2 },
                          ]}
                          onPress={() => handleBarPress(i)}
                          activeOpacity={0.7}
                        >
                          {(showAllValues || isSelected) && value > 0 && (
                            <View
                              style={[
                                styles.barValueLabel,
                                {
                                  position: 'absolute',
                                  bottom: `${Math.min(barHeight + 5, 86)}%`,
                                  left: '50%',
                                  width: dailyLabelWidth,
                                  transform: [{ translateX: -dailyLabelWidth / 2 }],
                                  backgroundColor: isDarkMode ? '#0F172A' : '#1E293B',
                                  borderColor: isDarkMode ? theme.border : 'transparent',
                                  paddingHorizontal: 2,
                                  paddingVertical: 1.5,
                                  minWidth: dailyLabelWidth,
                                  borderRadius: 5,
                                  zIndex: 10,
                                },
                              ]}
                            >
                              <Text
                                style={{
                                  fontSize: 8,
                                  fontWeight: '700',
                                  color: '#FFFFFF',
                                  textAlign: 'center',
                                }}
                                numberOfLines={1}
                              >
                                {formattedDailyValue}
                              </Text>
                            </View>
                          )}

                          <View
                            style={[
                              styles.bar,
                              {
                                height: `${Math.max(barHeight, value > 0 ? 3 : 0)}%`,
                                width: singleBarWidth,
                                backgroundColor: singleColor,
                                opacity: 0.95,
                                borderTopLeftRadius: 6,
                                borderTopRightRadius: 6,
                                borderBottomLeftRadius: 2,
                                borderBottomRightRadius: 2,
                              },
                            ]}
                          />

                          <View style={[
                            styles.dayLabelBadge,
                            {
                              position: 'absolute',
                              bottom: -22,
                            },
                          ]}>
                            <Text style={[
                              styles.dayLabelText,
                              {
                                color: isSelected
                                  ? singleColor
                                  : (isDarkMode ? '#94A3B8' : colors.gray500),
                                fontWeight: isSelected ? '700' : '500',
                                fontSize: dataLength > 20 ? 9 : 10,
                              }
                            ]}>
                              {currentData.labels[i] || i + 1}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            ) : (
              <ScrollView 
                ref={graphScrollRef}
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.scrollableGraph}
              >
                <View style={styles.barGraphContainer}>
                  {values.map((v, i) => {
                    const value = Number(v) || 0;
                    const secondaryValue = Number(secondaryValues[i]) || 0;
                    const barHeight = value > 0 ? (value / (maxValue * 1.2)) * 68 : 0;
                    const secondaryBarHeight = secondaryValue > 0 ? (secondaryValue / (maxValue * 1.2)) * 68 : 0;
                    const isSelected = selectedDetailIndex === i;
                    const formattedValue = value.toFixed(isAmount ? 0 : 1);
                    const labelWidth = Math.max(40, Math.min(52, formattedValue.length * 6.5 + 8));
                    const singleColor = isAmount
                      ? '#1E88E5'
                      : energyUnitMode === 'kvah'
                        ? '#10B981'
                        : '#2563EB';
                    const monthlyBarWidth = isDualEnergyMode ? 14 : 26;
                    const colWidth = 60;
                    const maxBarH = Math.max(barHeight, secondaryBarHeight);
                    const pillBottomPct = Math.min(Math.max(maxBarH + 9, 18), 84);
                    
                    return (
                      <TouchableOpacity 
                        key={i}
                        style={[
                          styles.barCol,
                          { width: colWidth, marginHorizontal: 5 },
                        ]}
                        onPress={() => handleBarPress(i)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.dualBarWrapper}>
                          <View style={[
                            styles.bar, 
                            { 
                              height: `${Math.max(barHeight, value > 0 ? 3 : 0)}%`,
                              width: monthlyBarWidth,
                              backgroundColor: isDualEnergyMode ? (isAmount ? '#1E88E5' : '#2563EB') : singleColor,
                              borderTopLeftRadius: 6,
                              borderTopRightRadius: 6,
                              borderBottomLeftRadius: 2,
                              borderBottomRightRadius: 2,
                            }
                          ]} />
                          {isDualEnergyMode && secondaryValue > 0 && (
                            <View style={[
                              styles.bar,
                              styles.secondaryBar,
                              {
                                height: `${Math.max(secondaryBarHeight, secondaryValue > 0 ? 3 : 0)}%`,
                                width: monthlyBarWidth,
                                backgroundColor: '#10B981',
                                borderTopLeftRadius: 6,
                                borderTopRightRadius: 6,
                                borderBottomLeftRadius: 2,
                                borderBottomRightRadius: 2,
                              }
                            ]} />
                          )}
                        </View>
                        
                        {!isDualEnergyMode && (showAllValues || isSelected) && value > 0 && (
                          <View style={[styles.barValueLabel, { 
                            bottom: `${Math.min(barHeight + 5, 84)}%`,
                            left: '50%',
                            width: labelWidth,
                            transform: [{ translateX: -labelWidth / 2 }],
                            backgroundColor: isDarkMode ? '#1E293B' : '#0F172A',
                            borderColor: isDarkMode ? theme.border : '#334155',
                            borderWidth: 0.8,
                            paddingHorizontal: 4,
                            paddingVertical: 2.5,
                            minWidth: labelWidth,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }]}>
                            <Text style={[
                              styles.barValueText,
                              {
                                fontSize: 9,
                                color: '#FFFFFF',
                                fontWeight: '800',
                                textAlign: 'center',
                              }
                            ]}
                            numberOfLines={1}>
                              {formattedValue}
                            </Text>
                          </View>
                        )}

                        {isDualEnergyMode && showAllValues && (value > 0 || secondaryValue > 0) && (
                          <View
                            style={[
                              styles.cleanMicroBadge,
                              {
                                bottom: `${pillBottomPct}%`,
                                backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF',
                                borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                              },
                            ]}
                          >
                            <Text style={[styles.cleanMicroText, { color: isDarkMode ? '#60A5FA' : '#2563EB' }]}>
                              {value.toFixed(0)}
                            </Text>
                            <Text style={[styles.cleanMicroSep, { color: isDarkMode ? '#64748B' : '#CBD5E1' }]}>|</Text>
                            <Text style={[styles.cleanMicroText, { color: isDarkMode ? '#34D399' : '#059669' }]}>
                              {secondaryValue.toFixed(0)}
                            </Text>
                          </View>
                        )}

                        <View style={[
                          styles.monthLabelBadge,
                          {
                            position: 'absolute',
                            bottom: -22,
                          },
                        ]}>
                          <Text style={[
                            styles.monthLabelText,
                            { 
                              fontSize: 10,
                              color: isSelected ? (isDarkMode ? '#60A5FA' : '#2563EB') : (isDarkMode ? '#94A3B8' : colors.gray500),
                              fontWeight: isSelected ? '700' : '500' 
                            }
                          ]}>
                            {currentData.labels[i] || months[i]?.slice(0, 3)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        {isDualEnergyMode ? (
          <View style={styles.dualBreakdownSection}>
            <View style={[
              styles.unifiedCompareCard,
              {
                backgroundColor: isDarkMode ? theme.surface : '#FFFFFF',
                borderColor: isDarkMode ? theme.border : '#E2E8F0',
              }
            ]}>
              {/* Header */}
              <View style={styles.compareCardHeader}>
                <View style={styles.compareHeaderLeft}>
                  <View style={[styles.compareIconBadge, { backgroundColor: isDarkMode ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF' }]}>
                    <Ionicons name="analytics" size={16} color={isDarkMode ? '#60A5FA' : '#2563EB'} />
                  </View>
                  <View>
                    <Text style={[styles.compareTitle, { color: theme.text }]}>Period Summary</Text>
                    <Text style={[styles.compareSubtitle, { color: theme.mutedText }]}>Active vs Apparent Load</Text>
                  </View>
                </View>
                <View style={[styles.periodBadge, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
                  <Text style={[styles.periodBadgeText, { color: theme.mutedText }]}>
                    {timeView === 'daily' ? `${selectedMonth.slice(0, 3)} ${selectedYear}` : selectedYear}
                  </Text>
                </View>
              </View>

              {/* 2-Column Side-by-Side Comparison */}
              <View style={styles.compareColumnsRow}>
                {/* Active Column */}
                <View style={[
                  styles.compareColBox,
                  {
                    backgroundColor: isDarkMode ? '#0F1E36' : '#F6FAFF',
                    borderColor: isDarkMode ? '#1E3A8A' : '#D0E3F7',
                  }
                ]}>
                  <View style={styles.colHeaderPill}>
                    <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                    <Text style={[styles.colHeaderTitle, { color: isDarkMode ? '#93C5FD' : '#1D4ED8' }]}>
                      Active Energy
                    </Text>
                  </View>
                  <Text style={[styles.colSubunit, { color: isDarkMode ? '#60A5FA' : '#2563EB' }]}>
                    Unit: kWh (Billed)
                  </Text>

                  <View style={styles.compareMetricItem}>
                    <Text style={[styles.metricLabelSmall, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Average</Text>
                    <Text style={[styles.metricValBold, { color: isDarkMode ? '#60A5FA' : '#1D4ED8' }]}>
                      {stats.avgU} <Text style={styles.metricUnitTiny}>kWh</Text>
                    </Text>
                  </View>

                  <View style={[styles.compareInnerDivider, { backgroundColor: isDarkMode ? '#1E3A8A' : '#E2E8F0' }]} />

                  <View style={styles.compareMetricItem}>
                    <Text style={[styles.metricLabelSmall, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Peak Maximum</Text>
                    <Text style={[styles.metricValBold, { color: isDarkMode ? '#F87171' : '#DC2626' }]}>
                      {stats.maxU} <Text style={styles.metricUnitTiny}>kWh</Text>
                    </Text>
                  </View>

                  <View style={[styles.compareInnerDivider, { backgroundColor: isDarkMode ? '#1E3A8A' : '#E2E8F0' }]} />

                  <View style={styles.compareMetricItem}>
                    <Text style={[styles.metricLabelSmall, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Total Consumed</Text>
                    <Text style={[styles.metricValBold, { color: isDarkMode ? '#38BDF8' : '#0284C7' }]}>
                      {stats.totalUnits} <Text style={styles.metricUnitTiny}>kWh</Text>
                    </Text>
                  </View>
                </View>

                {/* Apparent Column */}
                <View style={[
                  styles.compareColBox,
                  {
                    backgroundColor: isDarkMode ? '#062E20' : '#F4FBF7',
                    borderColor: isDarkMode ? '#065F46' : '#C7EED8',
                  }
                ]}>
                  <View style={styles.colHeaderPill}>
                    <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.colHeaderTitle, { color: isDarkMode ? '#86EFAC' : '#059669' }]}>
                      Apparent Energy
                    </Text>
                  </View>
                  <Text style={[styles.colSubunit, { color: isDarkMode ? '#86EFAC' : '#059669' }]}>
                    Unit: kVAh (Total)
                  </Text>

                  <View style={styles.compareMetricItem}>
                    <Text style={[styles.metricLabelSmall, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Average</Text>
                    <Text style={[styles.metricValBold, { color: isDarkMode ? '#4ADE80' : '#10B981' }]}>
                      {stats.avgKvah} <Text style={styles.metricUnitTiny}>kVAh</Text>
                    </Text>
                  </View>

                  <View style={[styles.compareInnerDivider, { backgroundColor: isDarkMode ? '#065F46' : '#E2E8F0' }]} />

                  <View style={styles.compareMetricItem}>
                    <Text style={[styles.metricLabelSmall, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Peak Maximum</Text>
                    <Text style={[styles.metricValBold, { color: isDarkMode ? '#F87171' : '#DC2626' }]}>
                      {stats.maxKvah} <Text style={styles.metricUnitTiny}>kVAh</Text>
                    </Text>
                  </View>

                  <View style={[styles.compareInnerDivider, { backgroundColor: isDarkMode ? '#065F46' : '#E2E8F0' }]} />

                  <View style={styles.compareMetricItem}>
                    <Text style={[styles.metricLabelSmall, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Total Apparent</Text>
                    <Text style={[styles.metricValBold, { color: isDarkMode ? '#4ADE80' : '#10B981' }]}>
                      {stats.totalKvah} <Text style={styles.metricUnitTiny}>kVAh</Text>
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
        <View style={[styles.statsContainer, { backgroundColor: isDarkMode ? theme.card : colors.gray100, borderColor: theme.border }]}>
          <View style={styles.statBox}>
            <Text style={[styles.statTitle, { color: isDarkMode ? "#CBD5E1" : theme.mutedText }]}>Average</Text>
            <Text style={[styles.statValBlue, { color: isDarkMode ? "#60A5FA" : colors.primary }]}>
              {primaryAverage}
            </Text>
            <Text style={[styles.statUnit, { color: isDarkMode ? "#94A3B8" : theme.mutedText }]}>{unit}</Text>
            {showKvahStats && energyUnitMode === 'both' && (
              <Text style={[styles.secondaryMetric, { color: isDarkMode ? "#94A3B8" : theme.mutedText }]}>
                {stats.avgKvah} kVAh
              </Text>
            )}
          </View>
          
          <View style={[styles.vDivider, { backgroundColor: theme.border }]} />
          
          <View style={styles.statBox}>
            <Text style={[styles.statTitle, { color: isDarkMode ? "#CBD5E1" : theme.mutedText }]}>Maximum</Text>
            <Text style={[styles.statValRed, { color: isDarkMode ? "#F87171" : colors.danger }]}>
              {primaryMaximum}
            </Text>
            <Text style={[styles.statUnit, { color: isDarkMode ? "#94A3B8" : theme.mutedText }]}>{unit}</Text>
            {showKvahStats && energyUnitMode === 'both' && (
              <Text style={[styles.secondaryMetric, { color: isDarkMode ? "#94A3B8" : theme.mutedText }]}>
                {stats.maxKvah} kVAh
              </Text>
            )}
          </View>
          
          <View style={[styles.vDivider, { backgroundColor: theme.border }]} />
          
          <View style={styles.statBox}>
            <Text style={[styles.statTitle, { color: isDarkMode ? "#CBD5E1" : theme.mutedText }]}>Total</Text>
            <Text style={[styles.statValGreen, { color: isDarkMode ? "#4ADE80" : colors.secondary }]}>
              {primaryTotal}
            </Text>
            <Text style={[styles.statUnit, { color: isDarkMode ? "#94A3B8" : theme.mutedText }]}>{unit}</Text>
            {showKvahStats && energyUnitMode === 'both' && (
              <Text style={[styles.secondaryMetric, { color: isDarkMode ? "#94A3B8" : theme.mutedText }]}>
                {stats.totalKvah} kVAh
              </Text>
            )}
          </View>
        </View>
        )}
      </View>
    );
  };

  const handleFilterApply = () => {
    setShowFilter(false);
  };

  if (loading && dailyData.length === 0 && monthlyData.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.mutedText }]}>
          Loading {timeView === 'daily' ? 'daily' : 'monthly'} consumption data...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.topSection,
          {
            backgroundColor: isDarkMode ? theme.surface : "#FFFFFF",
            borderBottomColor: isDarkMode ? theme.border : "#E2E8F0",
          },
        ]}
      >
        {/* Tier 1: Screen Header & Action Buttons */}
        <View style={styles.topHeaderBar}>
          <View style={styles.topHeaderTitleCol}>
            <Text style={[styles.topHeaderMainTitle, { color: isDarkMode ? '#F8FAFC' : '#0F172A' }]}>
              Consumption Reports
            </Text>
            <Text style={[styles.topHeaderSubtitle, { color: theme.mutedText }]}>
              Daily & monthly energy analytics
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionButtonGroup}>
            <TouchableOpacity 
              style={[
                styles.downloadBtnModern,
                {
                  backgroundColor: isDarkMode ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
                  borderColor: isDarkMode ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE',
                },
              ]} 
              onPress={() => {
                const now = new Date();
                const realYear = now.getFullYear();
                const realMonth = now.getMonth() + 1;
                
                let defaultYear = realYear;
                let defaultMonth = realMonth - 1;
                if (defaultMonth < 1) {
                  defaultMonth = 12;
                  defaultYear = realYear - 1;
                }

                setDownloadMonth(defaultMonth);
                setDownloadYear(defaultYear.toString());
                setDownloadReportType(timeView === 'daily' ? 'daily' : 'monthly');
                setDownloadUnit(energyUnitMode === 'kvah' ? 'kvah' : 'kwh');
                setShowReportTypeModal(true);
              }}
              disabled={isGeneratingReport}
              activeOpacity={0.7}
            >
              {isGeneratingReport ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="document-text" size={14} color={isDarkMode ? '#60A5FA' : '#2563EB'} />
              )}
              <Text style={[styles.downloadTextModern, { color: isDarkMode ? '#60A5FA' : '#2563EB' }]}>
                {isGeneratingReport ? 'Exporting...' : 'Report'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.refreshIconBtnModern,
                {
                  backgroundColor: isDarkMode ? theme.surface : "#FFFFFF",
                  borderColor: isDarkMode ? theme.border : "#D8E1EC",
                },
              ]}
              onPress={fetchData}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tier 2: Full-Width Modern Segmented Switcher */}
        <View
          style={[
            styles.tabBarModernFull,
            {
              backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.75)' : '#F1F5F9',
              borderColor: isDarkMode ? theme.border : '#E2E8F0',
            },
          ]}
        >
          <TouchableOpacity 
            onPress={() => handleViewChange('daily')} 
            style={[
              styles.tabModernFull,
              timeView === 'daily' && [
                styles.activeTabModernFull,
                {
                  backgroundColor: isDarkMode ? theme.primary : '#FFFFFF',
                  shadowColor: '#000',
                  shadowOpacity: isDarkMode ? 0.3 : 0.08,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }
              ],
            ]}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="calendar-outline" 
              size={15} 
              color={timeView === 'daily' ? (isDarkMode ? '#FFFFFF' : theme.primary) : theme.mutedText} 
            />
            <Text
              style={[
                styles.tabTextModernFull,
                { 
                  color: timeView === 'daily' 
                    ? (isDarkMode ? '#FFFFFF' : '#0F172A') 
                    : theme.mutedText,
                  fontWeight: timeView === 'daily' ? '700' : '600',
                },
              ]}
            >
              Daily View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => handleViewChange('monthly')} 
            style={[
              styles.tabModernFull,
              timeView === 'monthly' && [
                styles.activeTabModernFull,
                {
                  backgroundColor: isDarkMode ? theme.primary : '#FFFFFF',
                  shadowColor: '#000',
                  shadowOpacity: isDarkMode ? 0.3 : 0.08,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 2,
                }
              ],
            ]}
            activeOpacity={0.8}
          >
            <Ionicons 
              name="bar-chart-outline" 
              size={15} 
              color={timeView === 'monthly' ? (isDarkMode ? '#FFFFFF' : theme.primary) : theme.mutedText} 
            />
            <Text
              style={[
                styles.tabTextModernFull,
                { 
                  color: timeView === 'monthly' 
                    ? (isDarkMode ? '#FFFFFF' : '#0F172A') 
                    : theme.mutedText,
                  fontWeight: timeView === 'monthly' ? '700' : '600',
                },
              ]}
            >
              Monthly View
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
        <GraphCard title={energyGraphTitle} unit={energyGraphUnit} />
        <View style={styles.spacer} />
      </ScrollView>
      {/* Report Type & Energy Unit Selection Modal */}
      <Modal visible={showReportTypeModal} transparent animationType="fade">
        <View style={styles.reportTypeModal}>
          <View style={[styles.reportTypeContent, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: '90%' }]}>
            
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalHeaderIconBadge, { backgroundColor: theme.primary + '18' }]}>
                <Ionicons name="cloud-download-outline" size={22} color={theme.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.reportTypeTitle, { color: theme.text, textAlign: 'left', marginBottom: 2 }]}>
                  Download Report
                </Text>
                <Text style={{ fontSize: 12, color: theme.mutedText }}>
                  {`Daily Log: ${selectedMonth} ${selectedYear}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowReportTypeModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={theme.mutedText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* DAILY REPORT CONTENT */}
              <View style={{ marginTop: 14 }}>
                {/* Daily Period Banner */}
                <View style={[styles.dailyInfoCard, { backgroundColor: isDarkMode ? theme.card : '#F0F9FF', borderColor: theme.primary + '30' }]}>
                  <Ionicons name="information-circle" size={20} color={theme.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.dailyInfoTitle, { color: theme.text }]}>
                      Current Selected Period
                    </Text>
                    <Text style={[styles.dailyInfoSubtitle, { color: theme.mutedText }]}>
                      {selectedMonth} {selectedYear} (Day-by-day table)
                    </Text>
                  </View>
                </View>

                {/* Energy Metric Selection */}
                <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
                  <Ionicons name="flash" size={16} color={theme.primary} />
                  <Text style={[styles.reportModalSectionLabel, { color: theme.text, marginLeft: 6 }]}>
                    Select Energy Metric
                  </Text>
                </View>

                <View style={styles.unitSelectorRow}>
                  <TouchableOpacity
                    style={[
                      styles.unitPillModern,
                      {
                        borderColor: downloadUnit === 'kwh' ? theme.primary : theme.border,
                        backgroundColor:
                          downloadUnit === 'kwh'
                            ? theme.primary
                            : isDarkMode ? theme.card : '#FFFFFF',
                      },
                    ]}
                    onPress={() => setDownloadUnit('kwh')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="flash"
                      size={18}
                      color={downloadUnit === 'kwh' ? '#FFFFFF' : theme.mutedText}
                    />
                    <View style={{ marginLeft: 8 }}>
                      <Text
                        style={[
                          styles.unitPillTitle,
                          {
                            color: downloadUnit === 'kwh' ? '#FFFFFF' : theme.text,
                            fontWeight: downloadUnit === 'kwh' ? '700' : '500',
                          },
                        ]}
                      >
                        kWh (Active)
                      </Text>
                      <Text
                        style={[
                          styles.unitPillSubtitle,
                          {
                            color: downloadUnit === 'kwh' ? '#E2E8F0' : theme.mutedText,
                          },
                        ]}
                      >
                        Active energy units
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.unitPillModern,
                      {
                        borderColor: downloadUnit === 'kvah' ? theme.primary : theme.border,
                        backgroundColor:
                          downloadUnit === 'kvah'
                            ? theme.primary
                            : isDarkMode ? theme.card : '#FFFFFF',
                      },
                    ]}
                    onPress={() => setDownloadUnit('kvah')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="speedometer"
                      size={18}
                      color={downloadUnit === 'kvah' ? '#FFFFFF' : theme.mutedText}
                    />
                    <View style={{ marginLeft: 8 }}>
                      <Text
                        style={[
                          styles.unitPillTitle,
                          {
                            color: downloadUnit === 'kvah' ? '#FFFFFF' : theme.text,
                            fontWeight: downloadUnit === 'kvah' ? '700' : '500',
                          },
                        ]}
                      >
                        kVAh (Apparent)
                      </Text>
                      <Text
                        style={[
                          styles.unitPillSubtitle,
                          {
                            color: downloadUnit === 'kvah' ? '#E2E8F0' : theme.mutedText,
                          },
                        ]}
                      >
                        Apparent energy units
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                style={[styles.downloadSubmitBtn, { backgroundColor: theme.primary, marginTop: 18 }]}
                onPress={() => exportReportPDF('daily', downloadUnit)}
                disabled={isGeneratingReport}
              >
                {isGeneratingReport ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.downloadSubmitText}>Downloading PDF...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.downloadSubmitText}>
                      {`Download Daily Report (${downloadUnit.toUpperCase()})`}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelReportBtn,
                  {
                    backgroundColor: isDarkMode ? theme.card : '#F1F5F9',
                    borderColor: theme.border,
                    marginTop: 10,
                  },
                ]}
                onPress={() => setShowReportTypeModal(false)}
              >
                <Text style={[styles.cancelReportText, { color: isDarkMode ? '#E2E8F0' : theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Filter</Text>
            
            {timeView === 'daily' && (
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: theme.text }]}>Select Month</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.monthScroll}
                >
                  {months.map(m => (
                    <TouchableOpacity 
                      key={m} 
                      style={[styles.monthBtn, { backgroundColor: isDarkMode ? theme.card : '#fff', borderColor: theme.border }, selectedMonth === m && styles.monthBtnActive]} 
                      onPress={() => setSelectedMonth(m)}
                    >
                      <Text style={[styles.monthText, { color: selectedMonth === m ? '#fff' : theme.text }, selectedMonth === m && styles.monthTextActive]}>
                        {m.slice(0,3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: theme.text }]}>Select Year</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.yearScroll}
              >
                {years.map(y => (
                  <TouchableOpacity 
                    key={y} 
                    style={[styles.yearBtn, { backgroundColor: isDarkMode ? theme.card : '#fff', borderColor: theme.border }, selectedYear === y && styles.yearBtnActive]} 
                    onPress={() => setSelectedYear(y)}
                  >
                    <Text style={[styles.yearText, { color: selectedYear === y ? '#fff' : theme.text }, selectedYear === y && styles.yearTextActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={[styles.cancelBtn, { backgroundColor: isDarkMode ? theme.card : colors.gray100, borderColor: theme.border }]}
                onPress={() => setShowFilter(false)}
              >
                <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.applyBtn, { backgroundColor: theme.primary }]}
                onPress={handleFilterApply}
              >
                <Text style={styles.applyText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Download Success Modal Dialog */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={[styles.successModalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.successIconBadge}>
              <Ionicons name="checkmark-circle" size={38} color="#10B981" />
            </View>

            <Text style={[styles.successModalTitle, { color: theme.text }]}>Download Completed</Text>
            <Text style={[styles.successModalSubtitle, { color: theme.mutedText }]}>
              Your PDF has been saved successfully.
            </Text>


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
                style={[styles.successActionButton, { backgroundColor: theme.primary }]}
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
} as const;

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingText: {
    marginTop: spacing.lg,
    color: colors.gray500,
    fontSize: 16,
    textAlign: 'center',
  },
  topSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 12 : spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    ...shadows.sm,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  topHeaderTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  topHeaderMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  topHeaderSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  tabBarModernFull: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    marginTop: 8,
  },
  tabModernFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  activeTabModernFull: {
    borderRadius: 9,
  },
  tabTextModernFull: {
    fontSize: 13,
  },
  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tabBarModern: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
  },
  tabModern: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 9,
  },
  activeTabModern: {
    borderRadius: 9,
  },
  tabTextModern: {
    fontSize: 12,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadBtnModern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  downloadTextModern: {
    fontSize: 12,
    fontWeight: '700',
  },
  refreshIconBtnModern: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
    paddingTop: spacing.md,
  },
  spacer: {
    height: spacing.xxxl,
  },

  // Legacy Action Buttons (backward compatibility)
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
    minWidth: 120,
  },
  refreshBtn: {
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
  downloadText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.primary,
  },

  // Legacy Tabs
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
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: 'hidden',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  currIcon: {
    fontWeight: '800',
    fontSize: 16,
  },
  cardTitle: {
    ...typography.h3,
    fontSize: 15,
    fontWeight: '700',
  },
  filterBadgeModern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    ...shadows.sm,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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

  // Toggle Values Button
  toggleValuesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: 'flex-end',
  },
  toggleValuesText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  dualControlsWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: 6,
  },
  seriesLegendModern: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 1,
  },
  legendSeparatorDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 5,
  },
  toggleValuesButtonModern: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  toggleValuesTextModern: {
    fontSize: 9.5,
  },
  toggleValuesButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.round,
    borderWidth: 1,
  },
  toggleValuesTextCompact: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Hero Inspector Card Modern
  heroInspectorCardModern: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: spacing.md,
  },
  heroDateIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInspectorPodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  metricPod: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  metricPodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metricPodLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricPodValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  metricPodSub: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusDotPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  legendDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroInspectorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  heroInspectorFooterText: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Legacy Hero Inspector Card (for fallback)
  heroInspectorCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  heroInspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroInspectorDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroInspectorDayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroInspectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  heroInspectorHint: {
    fontSize: 10,
    fontWeight: '700',
  },
  heroInspectorGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  heroGridCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGridColHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  heroGridLabel: {
    ...typography.tiny,
    fontWeight: '600',
  },
  heroGridVal: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  heroGridUnit: {
    fontSize: 9,
    fontWeight: '500',
  },
  heroGridDivider: {
    width: 1,
    height: 20,
  },
  seriesLegendWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  seriesLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 1,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  legendDiamond: {
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  legendText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gray500,
  },
  legendSeparator: {
    ...typography.tiny,
    fontWeight: '600',
  },

  // Tooltip & Micro Badges
  selectedTooltipPill: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1.5,
    zIndex: 50,
    elevation: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  selectedTooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  selectedTooltipKwh: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#60A5FA',
  },
  selectedTooltipKvah: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#34D399',
  },
  selectedTooltipUnit: {
    fontSize: 8,
    fontWeight: '600',
    color: '#94A3B8',
  },
  selectedTooltipSep: {
    fontSize: 8,
    color: '#64748B',
    marginHorizontal: 1.5,
  },
  legendDotMicro: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  cleanMicroBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cleanMicroText: {
    fontSize: 8,
    fontWeight: '700',
  },
  cleanMicroSep: {
    fontSize: 7,
    marginHorizontal: 1.5,
  },

  // Graph Components
  graphBody: {
    height: 220,
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
    borderBottomWidth: 1,
    borderColor: colors.gray300,
    position: 'relative',
    overflow: 'visible',
  },
  chartGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    zIndex: 1,
  },
  axisLabel: {
    ...typography.tiny,
    color: colors.gray400,
    fontWeight: '500',
  },

  // Scrollable graph content
  scrollableGraph: {
    paddingHorizontal: 16,
    paddingRight: 40,
    minWidth: '100%',
  },

  // Day Label
  dayLabel: {
    position: 'absolute',
    ...typography.tiny,
    color: colors.gray400,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Month Label
  monthLabel: {
    ...typography.tiny,
    fontWeight: '500',
  },

  // Line Graph
  pointsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingBottom: 25,
    minWidth: '100%',
  },
  dotContainer: {
    height: '100%',
    alignItems: 'center',
    position: 'relative',
    marginHorizontal: 2,
  },
  connectingLine: {
    width: 2,
    position: 'absolute',
    bottom: 0,
  },
  secondaryConnectingLine: {
    width: 2,
    marginLeft: 10,
    borderStyle: 'dashed',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
    zIndex: 10,
    borderWidth: 2,
    borderColor: colors.white,
  },
  secondaryDot: {
    marginLeft: 10,
    width: 9,
    height: 9,
    borderRadius: 2,
  },

  // Value Labels
  valueLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray200,
    zIndex: 20,
    minWidth: 40,
    alignItems: 'center',
    ...shadows.sm,
  },
  valueLabelText: {
    fontSize: 10,
    fontWeight: '700',
  },
  secondaryValueLabel: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 34,
  },
  secondaryValueLabelText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
  },
  dualBarValuePill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 25,
    elevation: 4,
    gap: 3,
    ...shadows.sm,
  },
  dualValueKwhText: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  dualValueSep: {
    fontSize: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  dualValueKvahText: {
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  dayLabelBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18,
  },
  dayLabelText: {
    textAlign: 'center',
  },
  monthLabelBadge: {
    marginTop: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabelText: {
    textAlign: 'center',
  },
  dualBreakdownSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    gap: 12,
  },
  unifiedCompareCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.sm,
  },
  compareCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  compareHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compareIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  compareSubtitle: {
    ...typography.tiny,
    fontWeight: '500',
  },
  periodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  periodBadgeText: {
    ...typography.tiny,
    fontWeight: '600',
  },
  compareColumnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.sm,
  },
  compareColBox: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
  },
  colHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  colHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  colSubunit: {
    fontSize: 9,
    fontWeight: '500',
    marginBottom: 8,
  },
  compareMetricItem: {
    paddingVertical: 3,
  },
  metricLabelSmall: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 1,
  },
  metricValBold: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  metricUnitTiny: {
    fontSize: 9,
    fontWeight: '500',
  },
  compareInnerDivider: {
    height: 1,
    marginVertical: 4,
  },
  pfBannerBox: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.sm,
    marginTop: 4,
  },
  pfBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pfBannerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pfBannerTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  pfBannerScore: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 2,
  },
  pfBannerMax: {
    fontSize: 9,
    fontWeight: '500',
  },
  pfStatusBadgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  pfStatusBadgeTextSmall: {
    fontSize: 9,
    fontWeight: '700',
  },
  pfProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  pfProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  
  // Bar Graph Value Labels
  barValueLabel: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.gray200,
    zIndex: 20,
    minWidth: 40,
    alignItems: 'center',
    ...shadows.sm,
  },
  barValueText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Bar Graph
  barGraphContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xs,
    paddingBottom: 26,
    minWidth: '100%',
  },
  barCol: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
    marginHorizontal: 2,
  },
  dualBarWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
    height: '100%',
  },
  bar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 2,
  },
  secondaryBar: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },

  // Statistics
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  statTitle: {
    ...typography.tiny,
    color: colors.gray500,
    marginBottom: 6,
    fontWeight: '600',
    textAlign: 'center',
  },
  statValBlue: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValRed: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.danger,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValGreen: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  statUnit: {
    ...typography.tiny,
    color: colors.gray400,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryMetric: {
    ...typography.tiny,
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
  },
  vDivider: {
    width: 1,
    backgroundColor: colors.gray300,
    marginHorizontal: 8,
  },

  // Report Type Modal
  reportTypeModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  reportTypeContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    width: '94%',
    maxWidth: 420,
    ...shadows.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTypeTitle: {
    ...typography.h2,
    color: colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  reportModalSectionLabel: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  reportSegmentContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 6,
  },
  reportSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  reportSegmentBtnActive: {
    ...shadows.sm,
  },
  reportSegmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  yearScrollContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  yearPillModern: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  yearPillModernText: {
    fontSize: 13,
  },
  monthGridModern: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  monthGridCard: {
    width: '23%',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  monthCardNumber: {
    fontSize: 14,
    lineHeight: 16,
  },
  monthCardName: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  monthCardCheckmark: {
    position: 'absolute',
    top: 2,
    right: 3,
  },
  monthCardLock: {
    position: 'absolute',
    top: 3,
    right: 3,
  },
  dailyInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  dailyInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  dailyInfoSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  unitSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  unitPillModern: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  unitPillTitle: {
    fontSize: 13,
  },
  unitPillSubtitle: {
    fontSize: 10,
    marginTop: 1,
  },
  downloadSubmitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  downloadSubmitText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  reportTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  reportTypeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  reportTypeName: {
    ...typography.h3,
    color: colors.black,
    marginBottom: 4,
  },
  reportTypeDesc: {
    ...typography.small,
    color: colors.gray500,
  },
  cancelReportBtn: {
    marginTop: 10,
    padding: 12,
    backgroundColor: colors.gray200,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelReportText: {
    ...typography.body,
    color: colors.gray600,
    fontWeight: '600',
  },

  // Filter Modal
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
    ...shadows.lg,
  },
  modalTitle: {
    ...typography.h2,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'center',
    color: colors.primary,
  },
  
  // Filter Sections
  filterSection: {
    marginBottom: spacing.xl,
  },
  filterLabel: {
    fontWeight: '600',
    color: colors.gray500,
    ...typography.body,
    marginBottom: spacing.md,
  },
  
  // Month Filter
  monthScroll: {
    flexDirection: 'row',
  },
  monthBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  monthBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  monthText: {
    ...typography.small,
    color: colors.gray600,
    fontWeight: '500',
  },
  monthTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  
  // Year Filter
  yearScroll: {
    flexDirection: 'row',
  },
  yearBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  yearBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  yearText: {
    ...typography.small,
    color: colors.gray600,
    fontWeight: '500',
  },
  yearTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  
  // Filter Actions
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  cancelText: {
    color: colors.gray600,
    fontWeight: '600',
    ...typography.body,
  },
  applyBtn: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  applyText: {
    color: colors.white,
    fontWeight: '700',
    ...typography.body,
  },
  successModalOverlay: {
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
  }
});
