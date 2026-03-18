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
  Modal
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSiteDataUrl } from '../config';
import { useAuth } from '../context/AuthContext'; // Adjust path as per your project
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');
const NOTIFICATION_PREFS_KEY = 'notificationPreferences';
const defaultNotificationPrefs = {
  enabled: true,
  lowBalance: true,
  supply: true,
  overload: true,
};

export default function MoreScreen() {
  // AuthContext से data लें
  const { user, getSiteId, getSlug, getSiteName } = useAuth();
  const { theme, isDarkMode } = useTheme();
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
  const [notificationPrefs, setNotificationPrefs] = useState(defaultNotificationPrefs);
  const [siteInfo, setSiteInfo] = useState({
    siteName: null,
    siteId: null,
    slug: null
  });

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
          setNotificationPrefs({ ...defaultNotificationPrefs, ...parsedPrefs });
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
      
      const response = await axios.get(getSiteDataUrl(slugToUse));
      if (response.data && response.data.success) {
        setSiteData(response.data);
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

  const saveNotificationPreferences = async () => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(notificationPrefs));
      setNotificationsEnabled(notificationPrefs.enabled);
      setShowNotificationModal(false);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
    }
  };

  const notificationSummary = !notificationPrefs.enabled
    ? 'Alerts are turned off'
    : [
        notificationPrefs.lowBalance ? 'low balance' : null,
        notificationPrefs.supply ? 'supply' : null,
        notificationPrefs.overload ? 'overload' : null,
      ].filter(Boolean).join(', ') || 'No alert types selected';

  const getConnectionStatus = () => {
    if (!siteData) return 'UNKNOWN';
    const relayStatus = siteData?.asset_information?.site_values?.relay_status;
    return relayStatus !== undefined ? 
      (relayStatus ? 'CONNECTED' : 'DISCONNECTED') : 'UNKNOWN';
  };

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
              <FontAwesome5 name="building" size={24} color={theme.primary} />
            </View>
            <View>
              <Text style={[styles.siteName, { color: theme.text }]}>
                {asset_information.site_name || siteInfo.siteName || 'Site Name'}
              </Text>
              <View style={styles.siteLocation}>
                <Ionicons name="location-outline" size={14} color={theme.mutedText} />
                <Text style={[styles.locationText, { color: theme.mutedText }]}>
                  {asset_information.location || 'Location not specified'}
                </Text>
              </View>
              {user?.name && (
                <Text style={styles.userInfo}>
                  
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, isConnected ? styles.connected : styles.disconnected]}>
            <View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
            <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
          </View>
        </View>

       

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

        {/* Meter Information */}
        <View style={styles.meterContainer}>
          <Text style={[styles.sectionHeaderText, { color: theme.text }]}>Meter Details</Text>
          
          <View style={[styles.meterCard, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCardStyle]}>
            <View style={styles.meterRow}>
              <View style={[styles.meterIcon, { backgroundColor: theme.card }]}>
                <Ionicons name="hardware-chip-outline" size={18} color={theme.mutedText} />
              </View>
              <View style={styles.meterContent}>
                <Text style={[styles.meterLabel, { color: theme.mutedText }]}>Meter Name</Text>
                <Text style={[styles.meterValue, { color: theme.text }]}>
                  {asset_information.meter_name || 'Not specified'}
                </Text>
              </View>
            </View>
            
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            
            <View style={styles.meterRow}>
              <View style={[styles.meterIcon, { backgroundColor: theme.card }]}>
                <MaterialIcons name="developer-board" size={18} color={theme.mutedText} />
              </View>
              <View style={styles.meterContent}>
                <Text style={[styles.meterLabel, { color: theme.mutedText }]}>Controller</Text>
                <Text style={[styles.meterValue, { color: theme.text }]}>
                  {asset_information.controller || 'Not specified'}
                </Text>
              </View>
            </View>
            
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            
            <View style={styles.meterRow}>
              <View style={[styles.meterIcon, { backgroundColor: theme.card }]}>
                <Ionicons name="person-circle-outline" size={18} color={theme.mutedText} />
              </View>
              <View style={styles.meterContent}>
                <Text style={[styles.meterLabel, { color: theme.mutedText }]}>Custom Name</Text>
                <Text style={[styles.meterValue, { color: theme.text }]}>
                  {asset_information.custom_name || 'Not specified'}
                </Text>
              </View>
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
            <TouchableOpacity style={styles.settingItem} activeOpacity={0.8} onPress={() => setShowNotificationModal(true)}>
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

          </View>
        </View>
        
        {/* Settings */}
       {/* <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="notifications-outline" size={22} color="#0b63a8" />
                </View>
                <View>
                  <Text style={styles.settingTitle}>Notifications</Text>
                  <Text style={styles.settingDesc}>Receive alerts and updates</Text>
                </View>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#d1d5db', true: '#a7f3d0' }}
                thumbColor={notificationsEnabled ? '#10b981' : '#9ca3af'}
              />
            </View>
            
            <View style={styles.horizontalDivider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={styles.settingIconContainer}>
                  <Ionicons name="moon-outline" size={22} color="#0b63a8" />
                </View>
                <View>
                  <Text style={styles.settingTitle}>Dark Mode</Text>
                  <Text style={styles.settingDesc}>Switch to dark theme</Text>
                </View>
              </View>
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#d1d5db', true: '#a7f3d0' }}
                thumbColor={darkModeEnabled ? '#10b981' : '#9ca3af'}
              />
            </View>
          </View>
        </View>

        {/* Quick Menu */}
        {/*<View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Quick Menu</Text>
          
          <View style={styles.menuGrid}>
            {menuItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.menuItem}>
                <View style={styles.menuIconBox}>
                  <Text style={styles.menuIconText}>{item.icon}</Text>
                </View>
                <Text style={styles.menuItemTitle}>{item.title}</Text>
                <Text style={styles.menuItemDesc}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* App Info */}
        <View style={[styles.appInfo, { backgroundColor: theme.surface, borderColor: theme.border }, elevatedCardStyle]}>
          <View style={[styles.appLogo, { backgroundColor: theme.card }]}>
            <Ionicons name="flash-outline" size={32} color={theme.primary} />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>Energy Meter</Text>
          <Text style={[styles.appVersion, { color: theme.mutedText }]}>Version 2.1.0</Text>
          <Text style={[styles.appTagline, { color: theme.text }]}>Smart Energy Monitoring</Text>
          
          
          <Text style={styles.appCopyright}>© 2026 Sochiot Smart Meter</Text>
        </View>
        <View style={styles.bottomSpacer} />
      </View>

      <Modal visible={showNotificationModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.notificationModal, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
                <Text style={[styles.notificationOptionDesc, { color: theme.mutedText }]}>Show an alert when balance gets low</Text>
              </View>
              <Switch
                value={notificationPrefs.lowBalance}
                onValueChange={(value) => updateNotificationPref('lowBalance', value)}
                trackColor={{ false: theme.border, true: '#a7f3d0' }}
                thumbColor={notificationPrefs.lowBalance ? theme.success : theme.gray}
              />
            </View>

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
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  siteHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  siteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  siteName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  siteLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
  },
  userInfo: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginTop: 4,
  },
  connected: {
    backgroundColor: '#d1fae5',
  },
  disconnected: {
    backgroundColor: '#fee2e2',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotConnected: {
    backgroundColor: '#10b981',
  },
  dotDisconnected: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeaderText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  chargesContainer: {
    marginBottom: 20,
  },
  chargesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
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
  },
  notificationModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  notificationModalDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
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
  notificationModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
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
