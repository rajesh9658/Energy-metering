import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSiteDataUrl } from '../../src/config';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { EnergyUnitMode, useEnergyUnit } from '../../src/context/EnergyUnitContext';
import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
import { NOTIFICATION_PREFS_KEY, defaultNotificationPrefs } from '../../src/hooks/useNotificationPreferences';

export default function MoreScreen() {
  // AuthContext से data लें
  const { user, getSiteId, getSlug, getSiteName } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const { energyUnitMode, setEnergyUnitMode } = useEnergyUnit();
  const router = useRouter();
  const elevatedCardStyle = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: isDarkMode ? 0.35 : 0.16,
    shadowRadius: 15,
    elevation: isDarkMode ? 14 : 8,
  };
  const softCardStyle = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: isDarkMode ? 0.24 : 0.12,
    shadowRadius: 15,
    elevation: isDarkMode ? 10 : 5,
  };

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showEnergyUnitModal, setShowEnergyUnitModal] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState(defaultNotificationPrefs);
  const [customThresholdInput, setCustomThresholdInput] = useState<string>('500');
  const [siteInfo, setSiteInfo] = useState({
    siteName: null,
    siteId: null,
    slug: null
  });

  const energyUnitOptions: {
    mode: EnergyUnitMode;
    title: string;
    shortLabel: string;
    description: string;
  }[] = [
    {
      mode: 'kwh',
      title: 'kWh Only',
      shortLabel: 'kWh',
      description: 'Show only active energy values.',
    },
    {
      mode: 'kvah',
      title: 'kVAh Only',
      shortLabel: 'kVAh',
      description: 'Show only apparent energy values.',
    },
    {
      mode: 'both',
      title: 'Show Both',
      shortLabel: 'Both',
      description: 'Show kWh and kVAh together with clear separation.',
    },
  ];

  const menuItems = [
    { 
      title: 'Profile', 
      icon: '👤', 
      description: 'Manage profile' 
    },
    { 
      title: 'Notifications', 
      icon: '🔔', 
      description: 'Alert settings' 
    },
    { 
      title: 'Devices', 
      icon: '🔧', 
      description: 'Manage meters' 
    },
    { 
      title: 'Support', 
      icon: '🆘', 
      description: 'Help center' 
    },
    { 
      title: 'About', 
      icon: 'ℹ️', 
      description: 'App info' 
    },
  ];

  // Load site info from AuthContext or AsyncStorage
  useEffect(() => {
    const loadSiteInfo = async () => {
      try {
        const savedPrefs = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (savedPrefs) {
          const parsedPrefs = JSON.parse(savedPrefs);
          const initialThreshold = Number(parsedPrefs.lowBalanceThreshold) > 0
            ? Number(parsedPrefs.lowBalanceThreshold)
            : 500;
          setNotificationPrefs({
            ...defaultNotificationPrefs,
            ...parsedPrefs,
            lowBalanceThreshold: initialThreshold,
          });
          setCustomThresholdInput(String(initialThreshold));
          setNotificationsEnabled(parsedPrefs.enabled ?? true);
        }
        // Priority 1: AuthContext से
        const authSiteName = getSiteName();
        const authSiteId = getSiteId();
        const authSlug = getSlug();
        
        if (authSiteName && authSiteId) {
          setSiteInfo({
            siteName: authSiteName,
            siteId: authSiteId,
            slug: authSlug
          });
          return;
        }
        
        // Priority 2: AsyncStorage से directly
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsedData = JSON.parse(userData);
          setSiteInfo({
            siteName: parsedData.site_name,
            siteId: parsedData.site_id,
            slug: parsedData.slug
          });
        }
        
      } catch (error) {
        console.error("Error loading site info:", error);
      }
    };
    
    loadSiteInfo();
  }, [user]);

  useEffect(() => {
    if (siteInfo.siteName) {
      fetchSiteData();
    }
  }, [siteInfo.siteName]);

  const fetchSiteData = async () => {
    try {
      setLoading(true);
      
      // Use slug if available, otherwise use siteName
      const slugToUse = siteInfo.slug || siteInfo.siteName;
      if (!slugToUse) {
        setLoading(false);
        return;
      }
      
      const token =
        user?.token ||
        user?.auth_token ||
        user?.access_token ||
        user?.bearer_token ||
        siteInfo.user?.token ||
        siteInfo.user?.auth_token;

      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) {
        headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }

      const response = await axios.get(getSiteDataUrl(slugToUse), { headers });
      if (response.data && response.data.success) {
        setSiteData(response.data);
        AsyncStorage.setItem("meterData", JSON.stringify(response.data)).catch(() => {});
        DeviceEventEmitter.emit('METER_DATA_UPDATED');
      }
    } catch (err) {
      console.error("Error fetching site data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSiteData();
  };

  const updateNotificationPref = (key, value) => {
    setNotificationPrefs(prev => {
      const nextPrefs = key === 'enabled' && !value
        ? {
            ...prev,
            enabled: false,
            lowBalance: false,
            supply: false,
            overload: false,
          }
        : { ...prev, [key]: value };
      if (key === 'enabled') {
        setNotificationsEnabled(value);
      }
      return nextPrefs;
    });
  };

  const handleSelectBalancePreset = (amount: number) => {
    setCustomThresholdInput(String(amount));
    setNotificationPrefs(prev => ({
      ...prev,
      lowBalance: true,
      lowBalanceThreshold: amount,
    }));
  };

  const handleCustomThresholdChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomThresholdInput(cleaned);
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setNotificationPrefs(prev => ({
        ...prev,
        lowBalance: true,
        lowBalanceThreshold: parsed,
      }));
    }
  };

  const saveNotificationPreferences = async () => {
    try {
      const parsedVal = parseInt(customThresholdInput, 10);
      const finalThreshold = !isNaN(parsedVal) && parsedVal >= 0
        ? parsedVal
        : (notificationPrefs.lowBalanceThreshold ?? 500);

      const toSave = {
        ...defaultNotificationPrefs,
        ...notificationPrefs,
        lowBalance: true,
        lowBalanceThreshold: finalThreshold,
      };

      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(toSave));
      setNotificationPrefs(toSave);
      setCustomThresholdInput(String(finalThreshold));
      setNotificationsEnabled(toSave.enabled);

      if (siteData) {
        await AsyncStorage.setItem("meterData", JSON.stringify(siteData)).catch(() => {});
      }

      setShowNotificationModal(false);
      DeviceEventEmitter.emit('NOTIFICATION_PREFS_UPDATED');
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  };

  const thresholdVal = notificationPrefs.lowBalanceThreshold ?? 500;
  const notificationSummary = !notificationPrefs.enabled
    ? 'Alerts are turned off'
    : [
        notificationPrefs.lowBalance ? `low balance (≤ ₹${thresholdVal})` : null,
        notificationPrefs.supply ? 'supply' : null,
        notificationPrefs.overload ? 'overload' : null,
      ].filter(Boolean).join(', ') || 'No alert types selected';

  const getConnectionStatus = () => {
    if (!siteData) return 'UNKNOWN';
    const relayStatus = siteData?.asset_information?.site_values?.relay_status;
    return relayStatus !== undefined ? 
      (relayStatus ? 'CONNECTED' : 'DISCONNECTED') : 'UNKNOWN';
  };

  const renderHistorySection = () => (
    <View style={styles.historySection}>
      <View style={styles.historySectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>History</Text>
        <Text style={[styles.historySectionSubtitle, { color: theme.mutedText }]}>
          Quick access
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/history')}
        style={[
          styles.historySingleCard,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
          elevatedCardStyle,
        ]}
      >
        <View style={[styles.historyGlow, { backgroundColor: isDarkMode ? 'rgba(37,99,235,0.16)' : '#DBEAFE' }]} />
        <View style={[styles.historyCardTopBar, { backgroundColor: '#2563EB' }]} />
        <View style={styles.historyCardContent}>
          <View style={[styles.historyIconWrap, { backgroundColor: isDarkMode ? theme.card : '#EFF6FF' }]}>
            <Ionicons name="swap-horizontal-outline" size={20} color="#2563EB" />
          </View>
          <View style={styles.historyCopy}>
            <Text numberOfLines={2} style={[styles.historyTitleLine, { color: theme.text }]}>
              Transaction & Deduction
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#2563EB" />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderAPIDataTile = () => {
    if (!siteData || !siteData.asset_information) {
      return (
        <View style={[styles.errorContainer, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCardStyle]}>
          <Ionicons name="alert-circle-outline" size={50} color={theme.mutedText} />
          <Text style={[styles.errorText, { color: theme.text }]}>
            {siteInfo.siteName ? 
              `No data available for ${siteInfo.siteName}` : 
              'No site information found'
            }
          </Text>
          {siteInfo.siteName ? (
            <TouchableOpacity style={styles.retryButton} onPress={fetchSiteData}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryButtonText}> Try Again</Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.loginPrompt, { color: theme.error }]}>
              Please login to view site details
            </Text>
          )}
        </View>
      );
    }

    const { asset_information } = siteData;
    const electricParams = asset_information.electric_parameters || {};
    const siteValues = asset_information.site_values || {};
    const connectionStatus = getConnectionStatus();
    const isConnected = connectionStatus === 'CONNECTED';

    return (
      <View style={styles.contentContainer}>
        {/* Site Header */}
        <View style={[styles.siteHeader, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCardStyle]}>
          <View style={styles.siteHeaderLeft}>
            <View style={[styles.siteIcon, { backgroundColor: theme.card }]}>
              <FontAwesome5 name="building" size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[styles.siteName, { color: theme.text }]}
              >
                {asset_information.site_name || siteInfo.siteName || 'Site Name'}
              </Text>
              <View style={styles.siteLocation}>
                <Ionicons name="location-outline" size={13} color={theme.mutedText} />
                <Text numberOfLines={1} style={[styles.locationText, { color: theme.mutedText }]}>
                  {asset_information.location || 'Location not specified'}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, isConnected ? styles.connected : styles.disconnected]}>
            <View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
            <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
          </View>
        </View>

        {renderHistorySection()}

        {/* Charges Information */}
        <View style={styles.chargesContainer}>
          <Text style={[styles.sectionHeaderText, { color: theme.text }]}>Charges</Text>
          
          <View style={styles.chargesGrid}>
            <View style={[styles.chargeCard, { backgroundColor: theme.surface, borderColor: theme.border }, softCardStyle]}>
              <View style={[styles.chargeIcon, { backgroundColor: theme.card }]}>
                <Ionicons name="receipt-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.chargeContent}>
                <Text style={[styles.chargeLabel, { color: theme.mutedText }]}>Meter Unit Charge</Text>
                <Text style={[styles.chargeValue, { color: theme.text }]}>
                  ₹{asset_information.m_unit_charge?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
            
            <View style={[styles.chargeCard, { backgroundColor: theme.surface, borderColor: theme.border }, softCardStyle]}>
              <View style={[styles.chargeIcon, { backgroundColor: theme.card }]}>
                <Ionicons name="calendar-outline" size={18} color={theme.primary} />
              </View>
              <View style={styles.chargeContent}>
                <Text style={[styles.chargeLabel, { color: theme.mutedText }]}>Meter Fixed Charge</Text>
                <Text style={[styles.chargeValue, { color: theme.text }]}>
                  ₹{asset_information.m_fixed_charge?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
            
            <View style={[styles.chargeCard, { backgroundColor: theme.surface, borderColor: theme.border }, softCardStyle]}>
              <View style={[styles.chargeIcon, { backgroundColor: theme.card }]}>
                <Ionicons name="flash-outline" size={18} color="#f59e0b" />
              </View>
              <View style={styles.chargeContent}>
                <Text style={[styles.chargeLabel, { color: theme.mutedText }]}>DG Unit Charge</Text>
                <Text style={[styles.chargeValue, { color: theme.text }]}>
                  ₹{asset_information.dg_unit_charge?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
            
            <View style={[styles.chargeCard, { backgroundColor: theme.surface, borderColor: theme.border }, softCardStyle]}>
              <View style={[styles.chargeIcon, { backgroundColor: theme.card }]}>
                <Ionicons name="time-outline" size={18} color="#f59e0b" />
              </View>
              <View style={styles.chargeContent}>
                <Text style={[styles.chargeLabel, { color: theme.mutedText }]}>DG Fixed Charge</Text>
                <Text style={[styles.chargeValue, { color: theme.text }]}>
                  ₹{asset_information.dg_fixed_charge?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Site Status */}
        <View style={styles.statusContainer}>
          <Text style={[styles.sectionHeaderText, { color: theme.text }]}>Site Status</Text>
          
          <View style={styles.statusGrid}>
            <View
              style={[
                styles.statusCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                softCardStyle,
                !siteValues.low_balance_cut &&
                  (isDarkMode
                    ? { backgroundColor: "#10261f", borderColor: "#1f7a5b" }
                    : styles.statusOk),
              ]}
            >
              <MaterialIcons 
                name={siteValues.low_balance_cut ? "warning" : "check-circle"} 
                size={20} 
                color={siteValues.low_balance_cut ? "#ef4444" : "#10b981"} 
              />
              <Text style={[styles.statusTextSmall, { color: theme.mutedText }]}>Low Balance</Text>
              <Text style={[styles.statusValueSmall, { color: theme.text }, siteValues.low_balance_cut && styles.statusError]}>
                {siteValues.low_balance_cut ? 'Cut' : 'Normal'}
              </Text>
            </View>
            
            <View
              style={[
                styles.statusCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                softCardStyle,
                !siteValues.dg_overload_trip &&
                  (isDarkMode
                    ? { backgroundColor: "#10261f", borderColor: "#1f7a5b" }
                    : styles.statusOk),
              ]}
            >
              <Ionicons 
                name={siteValues.dg_overload_trip ? "alert-circle-outline" : "checkmark-circle-outline"} 
                size={20} 
                color={siteValues.dg_overload_trip ? "#ef4444" : "#10b981"} 
              />
              <Text style={[styles.statusTextSmall, { color: theme.mutedText }]}>DG Overload</Text>
              <Text style={[styles.statusValueSmall, { color: theme.text }, siteValues.dg_overload_trip && styles.statusError]}>
                {siteValues.dg_overload_trip ? 'Tripped' : 'Normal'}
              </Text>
            </View>
            
            <View
              style={[
                styles.statusCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                softCardStyle,
                !siteValues.overload_limit_reached &&
                  (isDarkMode
                    ? { backgroundColor: "#10261f", borderColor: "#1f7a5b" }
                    : styles.statusOk),
              ]}
            >
              <MaterialIcons 
                name={siteValues.overload_limit_reached ? "error-outline" : "done-outline"} 
                size={20} 
                color={siteValues.overload_limit_reached ? "#ef4444" : "#10b981"} 
              />
              <Text style={[styles.statusTextSmall, { color: theme.mutedText }]}>Overload Limit</Text>
              <Text style={[styles.statusValueSmall, { color: theme.text }, siteValues.overload_limit_reached && styles.statusError]}>
                {siteValues.overload_limit_reached ? 'Reached' : 'Normal'}
              </Text>
            </View>
            
            <View
              style={[
                styles.statusCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                softCardStyle,
                siteValues.relay_status &&
                  (isDarkMode
                    ? { backgroundColor: "#10261f", borderColor: "#1f7a5b" }
                    : styles.statusOk),
              ]}
            >
              <MaterialIcons 
                name={siteValues.relay_status ? "power-off" : "power-settings-new"} 
                size={20} 
                color={siteValues.relay_status ? "#10b981" : "#ef4444"} 
              />
              <Text style={[styles.statusTextSmall, { color: theme.mutedText }]}>Supply</Text>
              <Text style={[styles.statusValueSmall, { color: theme.text }, !siteValues.relay_status && styles.statusError]}>
                {siteValues.relay_status ? 'Connected' : 'Disconnected'}
              </Text>
            </View>
          </View>
        </View>

      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.mutedText }]}>
          {siteInfo.siteName ? 
            `Loading ${siteInfo.siteName} details...` : 
            'Loading site information...'
          }
        </Text>
       
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.primary]}
          tintColor={theme.primary}
        />
      }
    >
      {/* Page Header */}
     

      {/* Main Content */}
      <View style={styles.mainContent}>
        {renderAPIDataTile()}

        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>

          <View style={[styles.settingsCard, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCardStyle]}>
            <TouchableOpacity
              style={styles.settingItem}
              activeOpacity={0.8}
              onPress={() => {
                setCustomThresholdInput(String(notificationPrefs.lowBalanceThreshold ?? 500));
                setShowNotificationModal(true);
              }}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.card }]}>
                  <Ionicons name="notifications-outline" size={22} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Notifications</Text>
                  <Text style={[styles.settingDesc, { color: theme.mutedText }]}>{notificationSummary}</Text>
                </View>
              </View>
              <View style={styles.settingAction}>
                <View style={[styles.notificationStatusDot, { backgroundColor: notificationsEnabled ? theme.success : theme.gray }]} />
                <Ionicons name="chevron-forward" size={20} color={theme.mutedText} />
              </View>
            </TouchableOpacity>

            <View style={[styles.settingDivider, { backgroundColor: theme.border }]} />

            <TouchableOpacity style={styles.settingItem} activeOpacity={0.8} onPress={() => setShowEnergyUnitModal(true)}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIconContainer, { backgroundColor: theme.card }]}>
                  <MaterialIcons name="tune" size={22} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.settingTitle, { color: theme.text }]}>Energy Display</Text>
                  <Text style={[styles.settingDesc, { color: theme.mutedText }]}>
                    {energyUnitOptions.find((option) => option.mode === energyUnitMode)?.title}
                  </Text>
                </View>
              </View>
              <View style={styles.settingAction}>
                <View style={[styles.energyModeChipInline, { backgroundColor: isDarkMode ? theme.card : "#E8F1FF" }]}>
                  <Text style={[styles.energyModeChipInlineText, { color: theme.primary }]}>
                    {energyUnitOptions.find((option) => option.mode === energyUnitMode)?.shortLabel}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.mutedText} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={[styles.appInfo, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCardStyle]}>
          <View style={[styles.appLogo, { backgroundColor: theme.card }]}>
            <Ionicons name="flash-outline" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Energy Meter</Text>
          <Text style={[styles.appVersion, { color: theme.mutedText }]}>
            Version {Constants.expoConfig?.version || '1.0.0'}
          </Text>
          <Text style={[styles.appTagline, { color: theme.text }]}>Smart Energy Monitoring</Text>
          
          
          <Text style={styles.appCopyright}>© 2026 Sochiot Smart Meter</Text>
        </View>
        <View style={styles.bottomSpacer} />
      </View>

      <Modal visible={showNotificationModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.notificationModal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              <Text style={[styles.notificationModalTitle, { color: theme.text }]}>Notification Settings</Text>
              <Text style={[styles.notificationModalDesc, { color: theme.mutedText }]}>
                Choose which alerts should appear in the navbar bell.
              </Text>

              <View style={[styles.notificationOptionRow, { borderColor: theme.border }]}>
                <View style={styles.notificationOptionText}>
                  <Text style={[styles.notificationOptionTitle, { color: theme.text }]}>Enable Notifications</Text>
                  <Text style={[styles.notificationOptionDesc, { color: theme.mutedText }]}>Show bell alerts in the navbar</Text>
                </View>
                <Switch
                  value={notificationPrefs.enabled}
                  onValueChange={(value) => updateNotificationPref('enabled', value)}
                  trackColor={{ false: theme.border, true: '#a7f3d0' }}
                  thumbColor={notificationPrefs.enabled ? theme.success : theme.gray}
                />
              </View>

              <View style={[styles.notificationOptionRow, { borderColor: theme.border }]}>
                <View style={styles.notificationOptionText}>
                  <Text style={[styles.notificationOptionTitle, { color: theme.text }]}>Low Balance</Text>
                  <Text style={[styles.notificationOptionDesc, { color: theme.mutedText }]}>
                    Show alert when balance drops to ₹{customThresholdInput || '500'} or below
                  </Text>
                </View>
                <Switch
                  value={notificationPrefs.lowBalance}
                  onValueChange={(value) => updateNotificationPref('lowBalance', value)}
                  trackColor={{ false: theme.border, true: '#a7f3d0' }}
                  thumbColor={notificationPrefs.lowBalance ? theme.success : theme.gray}
                />
              </View>

              {notificationPrefs.lowBalance && (
                <View style={[styles.thresholdContainer, { backgroundColor: isDarkMode ? '#1e293b' : '#F1F5F9', borderColor: theme.border }]}>
                  <View style={styles.thresholdHeaderRow}>
                    <Text style={[styles.thresholdLabel, { color: theme.text }]}>
                      Custom Balance Limit
                    </Text>
                    <View style={[styles.thresholdBadge, { backgroundColor: isDarkMode ? 'rgba(59,130,246,0.2)' : '#EFF6FF', borderColor: theme.primary }]}>
                      <Text style={[styles.thresholdBadgeText, { color: theme.primary }]}>
                        ₹{customThresholdInput || '0'}
                      </Text>
                    </View>
                  </View>

                  {/* Preset Quick Chips */}
                  <View style={styles.presetRow}>
                    {[200, 500, 1000, 2000].map((amount) => {
                      const isSelected = Number(customThresholdInput) === amount;
                      return (
                        <TouchableOpacity
                          key={amount}
                          style={[
                            styles.presetChip,
                            {
                              borderColor: isSelected ? theme.primary : theme.border,
                              backgroundColor: isSelected ? theme.primary : (isDarkMode ? theme.surface : '#ffffff'),
                            },
                          ]}
                          onPress={() => handleSelectBalancePreset(amount)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.presetChipText,
                              { color: isSelected ? '#ffffff' : theme.text },
                            ]}
                          >
                            ₹{amount}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Custom Input Field */}
                  <View
                    style={[
                      styles.thresholdInputWrapper,
                      {
                        borderColor: theme.border,
                        backgroundColor: isDarkMode ? theme.surface : '#ffffff',
                      },
                    ]}
                  >
                    <Text style={[styles.currencyPrefix, { color: theme.primary }]}>₹</Text>
                    <TextInput
                      style={[styles.thresholdInput, { color: theme.text }]}
                      keyboardType="number-pad"
                      value={customThresholdInput}
                      onChangeText={handleCustomThresholdChange}
                      placeholder="Enter custom amount"
                      placeholderTextColor={theme.mutedText}
                      maxLength={7}
                    />
                    {customThresholdInput.length > 0 && (
                      <TouchableOpacity
                        onPress={() => handleCustomThresholdChange('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.inputClearBtn}
                      >
                        <Ionicons name="close-circle" size={16} color={theme.mutedText} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={[styles.thresholdHint, { color: theme.mutedText }]}>
                    🔔 Alert triggers if balance is ₹{customThresholdInput || '500'} or below
                  </Text>
                </View>
              )}

              <View style={[styles.notificationOptionRow, { borderColor: theme.border }]}>
                <View style={styles.notificationOptionText}>
                  <Text style={[styles.notificationOptionTitle, { color: theme.text }]}>Supply Alerts</Text>
                  <Text style={[styles.notificationOptionDesc, { color: theme.mutedText }]}>Show alerts for disconnected supply or relay off</Text>
                </View>
                <Switch
                  value={notificationPrefs.supply}
                  onValueChange={(value) => updateNotificationPref('supply', value)}
                  trackColor={{ false: theme.border, true: '#a7f3d0' }}
                  thumbColor={notificationPrefs.supply ? theme.success : theme.gray}
                />
              </View>

              <View style={[styles.notificationOptionRow, { borderColor: theme.border }]}>
                <View style={styles.notificationOptionText}>
                  <Text style={[styles.notificationOptionTitle, { color: theme.text }]}>Overload Alerts</Text>
                  <Text style={[styles.notificationOptionDesc, { color: theme.mutedText }]}>Show DG overload and overload limit alerts</Text>
                </View>
                <Switch
                  value={notificationPrefs.overload}
                  onValueChange={(value) => updateNotificationPref('overload', value)}
                  trackColor={{ false: theme.border, true: '#a7f3d0' }}
                  thumbColor={notificationPrefs.overload ? theme.success : theme.gray}
                />
              </View>

              <View style={styles.notificationModalActions}>
                <TouchableOpacity
                  style={[styles.notificationModalBtn, { backgroundColor: isDarkMode ? theme.card : '#F3F4F6', borderColor: theme.border }]}
                  onPress={() => setShowNotificationModal(false)}
                >
                  <Text style={[styles.notificationModalBtnText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.notificationModalBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={saveNotificationPreferences}
                >
                  <Text style={[styles.notificationModalBtnText, { color: '#fff' }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showEnergyUnitModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.notificationModal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.notificationModalTitle, { color: theme.text }]}>Energy Display</Text>
            <Text style={[styles.notificationModalDesc, { color: theme.mutedText }]}>
              Select how values should appear on overview and reports.
            </Text>

            {energyUnitOptions.map((option) => {
              const isSelected = energyUnitMode === option.mode;

              return (
                <TouchableOpacity
                  key={option.mode}
                  activeOpacity={0.85}
                  onPress={async () => {
                    await setEnergyUnitMode(option.mode);
                    setShowEnergyUnitModal(false);
                  }}
                  style={[
                    styles.energyModalOption,
                    {
                      borderColor: isSelected ? theme.primary : theme.border,
                      backgroundColor: isSelected
                        ? (isDarkMode ? theme.card : "#F3F8FF")
                        : (isDarkMode ? theme.surface : "#FFFFFF"),
                    },
                  ]}
                >
                  <View style={styles.energyModalOptionCopy}>
                    <Text style={[styles.energyModalOptionTitle, { color: theme.text }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.energyModalOptionDesc, { color: theme.mutedText }]}>
                      {option.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.energyModalCheck,
                      {
                        borderColor: isSelected ? theme.primary : theme.border,
                        backgroundColor: isSelected ? theme.primary : "transparent",
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.energyModalCloseButton,
                {
                  backgroundColor: isDarkMode ? theme.card : '#F8FAFC',
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setShowEnergyUnitModal(false)}
            >
              <Ionicons name="close-outline" size={18} color={isDarkMode ? "#E2E8F0" : theme.text} />
              <Text style={[styles.energyModalCloseText, { color: isDarkMode ? "#E2E8F0" : theme.text }]}>Close Panel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
  },
  siteIdText: {
    marginTop: 8,
    color: '#94a3b8',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    margin: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  errorText: {
    fontSize: 16,
    color: '#374151',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  loginPrompt: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#0b63a8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    paddingBottom: 20,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  siteHeader: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 0,
    marginTop: 14,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  siteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  siteIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  siteName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  siteLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 3,
  },
  userInfo: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  connected: {
    backgroundColor: '#d1fae5',
  },
  disconnected: {
    backgroundColor: '#fee2e2',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  dotConnected: {
    backgroundColor: '#10b981',
  },
  dotDisconnected: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    marginHorizontal: 0,
  },
  chargesContainer: {
    marginBottom: 16,
  },
  chargesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chargeCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  chargeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chargeContent: {
    flex: 1,
  },
  chargeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    lineHeight: 17,
  },
  chargeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  statusOk: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  statusTextSmall: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 2,
    textAlign: 'center',
  },
  statusValueSmall: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  statusError: {
    color: '#ef4444',
  },
  meterContainer: {
    marginBottom: 24,
  },
  meterCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  meterIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  meterContent: {
    flex: 1,
  },
  meterLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
    lineHeight: 17,
  },
  meterValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 4,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  settingsSection: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingDivider: {
    height: 1,
    marginVertical: 18,
  },
  settingAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  energyModeChipInline: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 10,
  },
  energyModeChipInlineText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  energyModalOption: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  energyModalOptionCopy: {
    flex: 1,
    paddingRight: 14,
  },
  energyModalOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  energyModalOptionDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  energyModalCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyModalCloseButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  energyModalCloseText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  notificationModal: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    maxHeight: '88%',
  },
  notificationModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  notificationModalDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  notificationOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  notificationOptionText: {
    flex: 1,
    paddingRight: 12,
  },
  notificationOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  notificationOptionDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  thresholdContainer: {
    marginVertical: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  thresholdHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  thresholdLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  thresholdBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  thresholdBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 6,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  thresholdInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 6,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  thresholdInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    padding: 0,
  },
  inputClearBtn: {
    padding: 4,
  },
  thresholdHint: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  notificationModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 12,
  },
  notificationModalBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  notificationModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  historySection: {
    marginBottom: 18,
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginHorizontal: 16,
  },
  historySectionSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  historySingleCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  historyHeroCard: {
    width: '48.5%',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  historyHeroCardCompact: {
    marginLeft: 0,
  },
  historyGlow: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    top: -26,
    right: -22,
    opacity: 0.55,
  },
  historyCardTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  historyCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
  },
  historyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyCopy: {
    flex: 1,
    paddingRight: 6,
    justifyContent: 'center',
  },
  historyTitleLine: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
    letterSpacing: 0.1,
    marginBottom: 0,
  },
  historyDesc: {
    fontSize: 10,
    lineHeight: 14,
  },
  menuSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuItem: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  menuIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuIconText: {
    fontSize: 20,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
    textAlign: 'center',
  },
  menuItemDesc: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  appInfo: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  appLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  appName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  appVersion: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  siteInfo: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  appCopyright: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
});
