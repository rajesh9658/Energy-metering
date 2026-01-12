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
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { getSiteDataUrl } from '../config';

const { width } = Dimensions.get('window');

export default function MoreScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const menuItems = [
    { title: 'Profile', icon: '👤', description: 'Manage profile' },
    { title: 'Notifications', icon: '🔔', description: 'Alert settings' },
    { title: 'Devices', icon: '🔧', description: 'Manage meters' },
    { title: 'Support', icon: '🆘', description: 'Help center' },
    { title: 'About', icon: 'ℹ️', description: 'App info' },
  ];

  useEffect(() => {
    fetchSiteData();
  }, []);

  const fetchSiteData = async () => {
    try {
      const response = await axios.get(getSiteDataUrl('neelkanth-1'));
      if (response.data && response.data.success) {
        setSiteData(response.data);
      }
    } catch (err) {
      console.error('Error fetching site data:', err);
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
    const relayStatus = siteData?.asset_information?.site_values?.relay_status;
    if (relayStatus === undefined) return 'UNKNOWN';
    return relayStatus ? 'CONNECTED' : 'DISCONNECTED';
  };

  const renderAPIDataTile = () => {
    if (!siteData?.asset_information) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#6b7280" />
          <Text style={styles.errorText}>No data available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSiteData}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryButtonText}> Try Again</Text>
          </TouchableOpacity>
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
              <Text style={styles.siteName}>{asset_information.site_name || 'Site Name'}</Text>
              <View style={styles.siteLocation}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={styles.locationText}>
                  {asset_information.location || 'Location'}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.statusBadge, isConnected ? styles.connected : styles.disconnected]}>
            <View
              style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]}
            />
            <Text style={styles.statusText}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
          </View>
        </View>

        {/* Charges Information */}
        <View style={styles.chargesContainer}>
          <Text style={styles.sectionHeaderText}>Charges</Text>
          <View style={styles.chargesGrid}>
            {[
              { label: 'Meter Unit Charge', value: asset_information.m_unit_charge, icon: 'receipt-outline', color: '#0b63a8' },
              { label: 'Meter Fixed Charge', value: asset_information.m_fixed_charge, icon: 'calendar-outline', color: '#0b63a8' },
              { label: 'DG Unit Charge', value: asset_information.dg_unit_charge, icon: 'flash-outline', color: '#f59e0b' },
              { label: 'DG Fixed Charge', value: asset_information.dg_fixed_charge, icon: 'time-outline', color: '#f59e0b' },
            ].map((item, idx) => (
              <View key={idx} style={styles.chargeCard}>
                <View style={styles.chargeIcon}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={styles.chargeContent}>
                  <Text style={styles.chargeLabel}>{item.label}</Text>
                  <Text style={styles.chargeValue}>₹{item.value?.toFixed(2) || '0.00'}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Site Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.sectionHeaderText}>Site Status</Text>
          <View style={styles.statusGrid}>
            {[
              { key: 'low_balance_cut', label: 'Low Balance', iconOn: 'warning', iconOff: 'check-circle' },
              { key: 'dg_overload_trip', label: 'DG Overload', iconOn: 'alert-circle-outline', iconOff: 'checkmark-circle-outline' },
              { key: 'overload_limit_reached', label: 'Overload Limit', iconOn: 'error-outline', iconOff: 'done-outline' },
              { key: 'force_off', label: 'Supply', iconOn: 'power-off', iconOff: 'power-settings-new' },
            ].map((item, idx) => {
              const isError = siteValues?.[item.key];
              return (
                <View key={idx} style={[styles.statusCard, !isError && styles.statusOk]}>
                  <MaterialIcons
                    name={isError ? item.iconOn : item.iconOff}
                    size={20}
                    color={isError ? '#ef4444' : '#10b981'}
                  />
                  <Text style={styles.statusTextSmall}>{item.label}</Text>
                  <Text style={[styles.statusValueSmall, isError && styles.statusError]}>
                    {isError ? 'Issue' : 'Normal'}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Meter Information */}
        <View style={styles.meterContainer}>
          <Text style={styles.sectionHeaderText}>Meter Details</Text>
          <View style={styles.meterCard}>
            {[
              { label: 'Meter Name', value: asset_information.meter_name, icon: <Ionicons name="hardware-chip-outline" size={18} color="#6b7280" /> },
              { label: 'Controller', value: asset_information.controller, icon: <MaterialIcons name="developer-board" size={18} color="#6b7280" /> },
              { label: 'Custom Name', value: asset_information.custom_name, icon: <Ionicons name="person-circle-outline" size={18} color="#6b7280" /> },
            ].map((item, idx) => (
              <React.Fragment key={idx}>
                <View style={styles.meterRow}>
                  <View style={styles.meterIcon}>{item.icon}</View>
                  <View style={styles.meterContent}>
                    <Text style={styles.meterLabel}>{item.label}</Text>
                    <Text style={styles.meterValue}>{item.value || 'N/A'}</Text>
                  </View>
                </View>
                {idx < 2 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0b63a8" />
        <Text style={styles.loadingText}>Loading site information...</Text>
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
        <Text style={styles.pageTitle}>Site Details</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={22} color="#0b63a8" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {renderAPIDataTile()}

        {/* Settings Section */}
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
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
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
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
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
  },
  locationText: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
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
  keyMetricsContainer: {
    marginBottom: 24,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  gridCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  dgCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  balanceCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#0b63a8',
  },
  powerCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  parametersContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  parametersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  parameterItem: {
    flex: 1,
    alignItems: 'center',
  },
  parameterLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  parameterValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  parameterDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },
  voltageCurrentContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  vcSection: {
    flex: 1,
  },
  vcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  vcTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  vcGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vcItem: {
    flex: 1,
    alignItems: 'center',
  },
  vcLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  vcValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  vcDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
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
  appCopyright: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  bottomSpacer: {
    height: 20,
  },
});