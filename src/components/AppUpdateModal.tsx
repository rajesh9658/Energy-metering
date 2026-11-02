import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import Constants from 'expo-constants';
import * as Animatable from 'react-native-animatable';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getAppVersionUrl } from '../config';

const APP_PACKAGE_NAME = 'com.mr_sanjay_gupta.Energy_metring';
export const CURRENT_APP_VERSION =
  Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0';

export interface AppVersionResponse {
  latest_version: string;
  min_version: string;
  force_update: boolean;
  release_notes: string;
  store_url: string;
  build_number?: number;
  platform?: 'android' | 'ios';
  channel?: 'apk' | 'play_store' | 'app_store';
  published_at?: string | null;
}

export interface UpdateModalState {
  visible: boolean;
  latestVersion: string;
  currentVersion: string;
  forceUpdate: boolean;
  releaseNotes: string;
  storeUrl: string;
  channel: 'apk' | 'play_store' | 'app_store';
}

/**
 * Compare two semver strings (e.g. "1.0.2" vs "1.0.1")
 * Returns:
 *   -1 if v1 < v2
 *    0 if v1 == v2
 *    1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  if (!v1 && !v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;

  const clean = (v: string) =>
    v.replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);

  const a = clean(v1);
  const b = clean(v2);
  const len = Math.max(a.length, b.length);

  for (let i = 0; i < len; i++) {
    const valA = a[i] || 0;
    const valB = b[i] || 0;
    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }
  return 0;
}

// Minimum interval between automatic foreground checks (1 minute) to respect rate limits
const CHECK_THROTTLE_MS = 60 * 1000;

export function AppUpdateModal() {
  const { theme, isDarkMode } = useTheme();
  const lastCheckTimestamp = useRef<number>(0);

  const [updateState, setUpdateState] = useState<UpdateModalState>({
    visible: false,
    latestVersion: CURRENT_APP_VERSION,
    currentVersion: CURRENT_APP_VERSION,
    forceUpdate: false,
    releaseNotes: '',
    storeUrl: '',
    channel: 'apk',
  });

  const checkForUpdate = useCallback(async (forcedManual = false) => {
    const now = Date.now();
    if (!forcedManual && now - lastCheckTimestamp.current < CHECK_THROTTLE_MS) {
      return;
    }
    lastCheckTimestamp.current = now;

    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const defaultChannel = platform === 'ios' ? 'app_store' : 'apk';
      const channel =
        (process.env.EXPO_PUBLIC_APP_CHANNEL as 'apk' | 'play_store' | 'app_store') ||
        defaultChannel;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const endpoint = getAppVersionUrl(platform, channel);
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (!response || !response.ok) return;

      const data: AppVersionResponse = await response.json().catch(() => null);
      if (!data) return;

      // Neutral response (no release active) or empty download URL
      if (!data.latest_version || data.latest_version === '0.0.0' || !data.store_url) {
        return;
      }

      const currentVer = CURRENT_APP_VERSION;
      const isBelowMin = compareVersions(currentVer, data.min_version || '0.0.0') < 0;
      const isBelowLatest = compareVersions(currentVer, data.latest_version) < 0;
      const mustForceUpdate = isBelowMin || (isBelowLatest && Boolean(data.force_update));

      if (mustForceUpdate || isBelowLatest) {
        setUpdateState({
          visible: true,
          latestVersion: data.latest_version,
          currentVersion: currentVer,
          forceUpdate: mustForceUpdate,
          releaseNotes: data.release_notes || '',
          storeUrl: data.store_url,
          channel: (data.channel as any) || channel,
        });
      }
    } catch (error) {
      // Network/API errors must never block normal app usage
      console.warn('App version check skipped:', error);
    }
  }, []);

  useEffect(() => {
    // Initial check on app startup
    checkForUpdate(true);

    // Re-check when app returns from background
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkForUpdate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkForUpdate]);

  const handleUpdatePress = async () => {
    const { storeUrl, channel } = updateState;
    if (!storeUrl) return;

    if (Platform.OS === 'ios') {
      try {
        const canOpen = await Linking.canOpenURL(storeUrl);
        if (canOpen) {
          await Linking.openURL(storeUrl);
          return;
        }
      } catch {
        // Fallback
      }
      await Linking.openURL(storeUrl).catch(() => {});
      return;
    }

    // Android APK direct download
    if (channel === 'apk' || storeUrl.toLowerCase().endsWith('.apk')) {
      try {
        await Linking.openURL(storeUrl);
      } catch (err) {
        console.warn('Failed to open APK URL:', err);
      }
      return;
    }

    // Android Play Store
    const playStoreMarketUrl = `market://details?id=${APP_PACKAGE_NAME}`;
    try {
      const canOpenMarket = await Linking.canOpenURL(playStoreMarketUrl);
      if (canOpenMarket) {
        await Linking.openURL(playStoreMarketUrl);
        return;
      }
      await Linking.openURL(storeUrl);
    } catch {
      await Linking.openURL(storeUrl).catch(() => {});
    }
  };

  const handleDismiss = () => {
    if (!updateState.forceUpdate) {
      setUpdateState((prev) => ({ ...prev, visible: false }));
    }
  };

  if (!updateState.visible) return null;

  // Determine button title & icon based on platform and channel
  const getButtonConfig = () => {
    if (Platform.OS === 'ios') {
      return {
        icon: 'apple' as const,
        label: 'Update from App Store',
      };
    }
    if (updateState.channel === 'apk' || updateState.storeUrl.toLowerCase().endsWith('.apk')) {
      return {
        icon: 'download' as const,
        label: 'Download APK Update',
      };
    }
    return {
      icon: 'google-play' as const,
      label: 'Update from Play Store',
    };
  };

  const buttonConfig = getButtonConfig();

  return (
    <Modal
      visible={updateState.visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.backdrop}>
        <Animatable.View
          animation="zoomIn"
          duration={350}
          style={[
            styles.card,
            {
              backgroundColor: theme.surface || (isDarkMode ? '#1E293B' : '#FFFFFF'),
              borderColor: theme.border || (isDarkMode ? '#334155' : '#E2E8F0'),
            },
          ]}
        >
          {/* Top Decorative Icon */}
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconCircleOuter,
                updateState.forceUpdate && styles.iconCircleOuterForced,
              ]}
            >
              <View
                style={[
                  styles.iconCircleInner,
                  updateState.forceUpdate && styles.iconCircleInnerForced,
                ]}
              >
                <MaterialCommunityIcons
                  name={updateState.forceUpdate ? 'shield-alert' : 'rocket-launch'}
                  size={36}
                  color="#FFFFFF"
                />
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text || '#0F172A' }]}>
            {updateState.forceUpdate ? 'Mandatory Update Required' : 'Update Available! 🎉'}
          </Text>

          {/* Version badge */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.versionBadge,
                updateState.forceUpdate && styles.versionBadgeForced,
              ]}
            >
              <Text
                style={[
                  styles.versionBadgeText,
                  updateState.forceUpdate && styles.versionBadgeTextForced,
                ]}
              >
                v{updateState.latestVersion} Available
              </Text>
            </View>
            <Text
              style={[
                styles.currentVersionText,
                { color: theme.mutedText || '#64748B' },
              ]}
            >
              (Current: v{updateState.currentVersion})
            </Text>
          </View>

          {/* Release Notes / Description */}
          <Text style={[styles.description, { color: theme.mutedText || '#475569' }]}>
            {updateState.releaseNotes ||
              (updateState.forceUpdate
                ? 'A critical update is required to continue using the application. Please update now.'
                : 'A new version of the Energy Metering app is available with improvements and bug fixes.')}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.updateButton,
                updateState.forceUpdate && styles.updateButtonForced,
              ]}
              activeOpacity={0.85}
              onPress={handleUpdatePress}
            >
              <MaterialCommunityIcons
                name={buttonConfig.icon}
                size={22}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.updateButtonText}>{buttonConfig.label}</Text>
            </TouchableOpacity>

            {/* Later button is only rendered if update is optional */}
            {!updateState.forceUpdate && (
              <TouchableOpacity
                style={[
                  styles.laterButton,
                  { borderColor: theme.border || (isDarkMode ? '#334155' : '#CBD5E1') },
                ]}
                activeOpacity={0.7}
                onPress={handleDismiss}
              >
                <Text style={[styles.laterButtonText, { color: theme.mutedText || '#64748B' }]}>
                  Remind Me Later
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animatable.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircleOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleOuterForced: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  iconCircleInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  iconCircleInnerForced: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  versionBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  versionBadgeForced: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  versionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
  },
  versionBadgeTextForced: {
    color: '#DC2626',
  },
  currentVersionText: {
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  updateButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  updateButtonForced: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  laterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
