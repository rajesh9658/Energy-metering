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
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSiteDataUrl } from '../config';
import { useAuth } from '../context/AuthContext'; // Adjust path as per your project

const { width } = Dimensions.get('window');

export default function MoreScreen() {
  // AuthContext से data लें
  const { user, getSiteId, getSlug, getSiteName } = useAuth();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const getConnectionStatus = () => {
    if (!siteData) return 'UNKNOWN';
    const relayStatus = siteData?.asset_information?.site_values?.relay_status;
    return relayStatus !== undefined ? 
      (relayStatus ? 'CONNECTED' : 'DISCONNECTED') : 'UNKNOWN';
  };

  const renderAPIDataTile = () => {
    if (!siteData || !siteData.asset_information) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#6b7280" />
          <Text style={styles.errorText}>
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
            <Text style={styles.loginPrompt}>
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
        <View style={styles.siteHeader}>
          <View style={styles.siteHeaderLeft}>
            <View style={styles.siteIcon}>
              <FontAwesome5 name="building" size={24} color="#0b63a8" />
            </View>
            <View>
              <Text style={styles.siteName}>
                {asset_information.site_name || siteInfo.siteName || 'Site Name'}
              </Text>
              <View style={styles.siteLocation}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={styles.locationText}>
                  {asset_information.location || 'Location not specified'}
                </Text>
              </View>
              {user?.name && (
                <Text style={styles.userInfo}>
                  Logged in as: {user.name}
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
          <Text style={styles.sectionHeaderText}>Charges</Text>
          
          <View style={styles.chargesGrid}>
            <View style={styles.chargeCard}>
              <View style={styles.chargeIcon}>
                <Ionicons name="receipt-outline" size={18} color="#0b63a8" />
              </View>
              <View style={styles.chargeContent}>
                <Text style={styles.chargeLabel}>Meter Unit Charge</Text>
                <Text style={styles.chargeValue}>
                  ₹{asset_information.m_unit_charge?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
            
            <View style={styles.chargeCard}>
              <View style={styles.chargeIcon}>
                <Ionicons name="calendar-outline" size={18} color="#0b63a8" />
              </View>
              <View style={styles.chargeContent}>
                <Text style={styles.chargeLabel}>Meter Fixed Charge</Text>
                <Text style={styles.chargeValue}>
                  ₹{asset_information.m_fixed_charge?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
            
            <View style={styles.chargeCard}>
              <View style={styles.chargeIcon}>
                <Ionicons name="flash-outline" size={18} color="#f59e0b" />
              </View>
              <View style={styles.chargeContent}>
                <Text style={styles.chargeLabel}>DG Unit Charge</Text>
                <Text style={styles.chargeValue}>
                  ₹{asset_information.dg_unit_charge?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
            
            <View style={styles.chargeCard}>
              <View style={styles.chargeIcon}>
                <Ionicons name="time-outline" size={18} color="#f59e0b" />
              </View>
              <View style={styles.chargeContent}>
                <Text style={styles.chargeLabel}>DG Fixed Charge</Text>
                <Text style={styles.chargeValue}>
                  ₹{asset_information.dg_fixed_charge?.toFixed(2) || '0.00'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Site Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.sectionHeaderText}>Site Status</Text>
          
          <View style={styles.statusGrid}>
            <View style={[styles.statusCard, !siteValues.low_balance_cut && styles.statusOk]}>
              <MaterialIcons 
                name={siteValues.low_balance_cut ? "warning" : "check-circle"} 
                size={20} 
                color={siteValues.low_balance_cut ? "#ef4444" : "#10b981"} 
              />
              <Text style={styles.statusTextSmall}>Low Balance</Text>
              <Text style={[styles.statusValueSmall, siteValues.low_balance_cut && styles.statusError]}>
                {siteValues.low_balance_cut ? 'Cut' : 'Normal'}
              </Text>
            </View>
            
            <View style={[styles.statusCard, !siteValues.dg_overload_trip && styles.statusOk]}>
              <Ionicons 
                name={siteValues.dg_overload_trip ? "alert-circle-outline" : "checkmark-circle-outline"} 
                size={20} 
                color={siteValues.dg_overload_trip ? "#ef4444" : "#10b981"} 
              />
              <Text style={styles.statusTextSmall}>DG Overload</Text>
              <Text style={[styles.statusValueSmall, siteValues.dg_overload_trip && styles.statusError]}>
                {siteValues.dg_overload_trip ? 'Tripped' : 'Normal'}
              </Text>
            </View>
            
            <View style={[styles.statusCard, !siteValues.overload_limit_reached && styles.statusOk]}>
              <MaterialIcons 
                name={siteValues.overload_limit_reached ? "error-outline" : "done-outline"} 
                size={20} 
                color={siteValues.overload_limit_reached ? "#ef4444" : "#10b981"} 
              />
              <Text style={styles.statusTextSmall}>Overload Limit</Text>
              <Text style={[styles.statusValueSmall, siteValues.overload_limit_reached && styles.statusError]}>
                {siteValues.overload_limit_reached ? 'Reached' : 'Normal'}
              </Text>
            </View>
            
            <View style={[styles.statusCard, !siteValues.force_off && styles.statusOk]}>
              <MaterialIcons 
                name={siteValues.force_off ? "power-off" : "power-settings-new"} 
                size={20} 
                color={siteValues.force_off ? "#ef4444" : "#10b981"} 
              />
              <Text style={styles.statusTextSmall}>Supply</Text>
              <Text style={[styles.statusValueSmall, siteValues.force_off && styles.statusError]}>
                {siteValues.force_off ? 'Force Off' : 'Normal'}
              </Text>
            </View>
          </View>
        </View>

        {/* Meter Information */}
        <View style={styles.meterContainer}>
          <Text style={styles.sectionHeaderText}>Meter Details</Text>
          
          <View style={styles.meterCard}>
            <View style={styles.meterRow}>
              <View style={styles.meterIcon}>
                <Ionicons name="hardware-chip-outline" size={18} color="#6b7280" />
              </View>
              <View style={styles.meterContent}>
                <Text style={styles.meterLabel}>Meter Name</Text>
                <Text style={styles.meterValue}>
                  {asset_information.meter_name || 'Not specified'}
                </Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.meterRow}>
              <View style={styles.meterIcon}>
                <MaterialIcons name="developer-board" size={18} color="#6b7280" />
              </View>
              <View style={styles.meterContent}>
                <Text style={styles.meterLabel}>Controller</Text>
                <Text style={styles.meterValue}>
                  {asset_information.controller || 'Not specified'}
                </Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.meterRow}>
              <View style={styles.meterIcon}>
                <Ionicons name="person-circle-outline" size={18} color="#6b7280" />
              </View>
              <View style={styles.meterContent}>
                <Text style={styles.meterLabel}>Custom Name</Text>
                <Text style={styles.meterValue}>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0b63a8" />
        <Text style={styles.loadingText}>
          {siteInfo.siteName ? 
            `Loading ...` : 
            'Loading site information...'
          }
        </Text>
        {siteInfo.siteId && (
          <Text style={styles.siteIdText}>
            {/* Site ID: {siteInfo.siteId} */}
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#0b63a8']}
          tintColor="#0b63a8"
        />
      }
    >
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>
          {siteInfo.siteName ? `Site: ${siteInfo.siteName}` : 'Site Details'}
        </Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={22} color="#0b63a8" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {renderAPIDataTile()}
        
        {/* Settings */}
        <View style={styles.settingsSection}>
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
        <View style={styles.menuSection}>
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
        <View style={styles.appInfo}>
          <View style={styles.appLogo}>
            <Ionicons name="flash-outline" size={32} color="#0b63a8" />
          </View>
          <Text style={styles.appName}>Energy Meter</Text>
          <Text style={styles.appVersion}>Version 2.1.0</Text>
          <Text style={styles.appTagline}>Smart Energy Monitoring</Text>
          {user?.name && (
            <Text style={styles.userEmail}>
              User: {user.name}
            </Text>
          )}
          {siteInfo.siteName && (
            <Text style={styles.siteInfo}>
              Site: {siteInfo.siteName}
            </Text>
          )}
          <Text style={styles.appCopyright}>© 2024 Energy Solutions</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </View>
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
    fontSize: 18,
    fontWeight: '600',
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
    fontWeight: '600',
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '600',
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
  },
  chargeValue: {
    fontSize: 14,
    fontWeight: '600',
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
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 2,
  },
  statusValueSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
  },
  meterValue: {
    fontSize: 14,
    fontWeight: '600',
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
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#6b7280',
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
    padding: 24,
    marginHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  appLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 14,
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
    marginTop: 12,
  },
  bottomSpacer: {
    height: 20,
  },
});