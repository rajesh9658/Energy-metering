import React, { useState, useEffect, useCallback } from 'react';
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
import { getApiUrl } from '../config';

const APP_PACKAGE_NAME = 'com.mr_sanjay_gupta.Energy_metring';
const CURRENT_APP_VERSION =
  Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.0';

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  forceUpdate: boolean;
  releaseNotes?: string;
  storeUrl?: string;
}

/**
 * Compare two semver strings (e.g. "1.0.1" > "1.0.0")
 */
function isNewerVersion(remoteVer: string, currentVer: string): boolean {
  if (!remoteVer || !currentVer) return false;

  const clean = (v: string) =>
    v.replace(/[^0-9.]/g, '').split('.').map((n) => parseInt(n, 10) || 0);

  const remoteParts = clean(remoteVer);
  const currentParts = clean(currentVer);

  const length = Math.max(remoteParts.length, currentParts.length);
  for (let i = 0; i < length; i++) {
    const r = remoteParts[i] || 0;
    const c = currentParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

export function AppUpdateModal() {
  const { theme, isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
    hasUpdate: false,
    latestVersion: CURRENT_APP_VERSION,
    currentVersion: CURRENT_APP_VERSION,
    forceUpdate: false,
  });

  const checkForUpdate = useCallback(async () => {
    try {
      // 1. Try fetching version info from backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const endpoint = getApiUrl('/api/app-version');
      const response = await fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const data = await response.json().catch(() => null);
        if (data && (data.version || data.latest_version)) {
          const remoteVersion = data.version || data.latest_version;
          const isForce = Boolean(
            data.force_update ||
            (data.min_version && isNewerVersion(data.min_version, CURRENT_APP_VERSION))
          );

          if (isNewerVersion(remoteVersion, CURRENT_APP_VERSION)) {
            setUpdateInfo({
              hasUpdate: true,
              latestVersion: remoteVersion,
              currentVersion: CURRENT_APP_VERSION,
              forceUpdate: isForce,
              releaseNotes: data.release_notes || data.message,
              storeUrl: data.store_url || data.play_store_url,
            });
            setModalVisible(true);
            return;
          }
        }
      }
    } catch {
      // Silently ignore network failures on check to never block normal app usage
    }
  }, []);

  useEffect(() => {
    // Check when app starts
    checkForUpdate();

    // Check when app returns from background
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
    if (Platform.OS === 'ios') {
      const iosStoreUrl =
        updateInfo.storeUrl ||
        `itms-apps://apps.apple.com/app/id/${Constants.expoConfig?.ios?.bundleIdentifier || 'energymetring'}`;
      try {
        const canOpen = await Linking.canOpenURL(iosStoreUrl);
        if (canOpen) {
          await Linking.openURL(iosStoreUrl);
          return;
        }
      } catch {
        // Fallback
      }
      if (updateInfo.storeUrl) {
        await Linking.openURL(updateInfo.storeUrl).catch(() => {});
      }
      return;
    }

    const playStoreMarketUrl = `market://details?id=${APP_PACKAGE_NAME}`;
    const playStoreWebUrl =
      updateInfo.storeUrl ||
      `https://play.google.com/store/apps/details?id=${APP_PACKAGE_NAME}&hl=en_IN`;

    try {
      if (Platform.OS === 'android') {
        const canOpenMarket = await Linking.canOpenURL(playStoreMarketUrl);
        if (canOpenMarket) {
          await Linking.openURL(playStoreMarketUrl);
          return;
        }
      }
      await Linking.openURL(playStoreWebUrl);
    } catch {
      // Fallback to web link
      await Linking.openURL(playStoreWebUrl).catch(() => {});
    }
  };

  const handleDismiss = () => {
    if (!updateInfo.forceUpdate) {
      setModalVisible(false);
    }
  };

  if (!modalVisible) return null;

  return (
    <Modal
      visible={modalVisible}
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
            <View style={styles.iconCircleOuter}>
              <View style={styles.iconCircleInner}>
                <MaterialCommunityIcons name="rocket-launch" size={36} color="#FFFFFF" />
              </View>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text || '#0F172A' }]}>
            Update Available! 🎉
          </Text>

          {/* Version badge */}
          <View style={styles.badgeRow}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>
                v{updateInfo.latestVersion} Available
              </Text>
            </View>
            <Text style={[styles.currentVersionText, { color: theme.mutedText || '#64748B' }]}>
              (Current: v{updateInfo.currentVersion})
            </Text>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: theme.mutedText || '#475569' }]}>
            {updateInfo.releaseNotes ||
              'A new and improved version of the Energy Metering app is ready on Google Play Store. Please update now to get the latest features, enhancements, and bug fixes.'}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.updateButton}
              activeOpacity={0.85}
              onPress={handleUpdatePress}
            >
              <MaterialCommunityIcons
                name={Platform.OS === 'ios' ? 'apple' : 'google-play'}
                size={22}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.updateButtonText}>
                {Platform.OS === 'ios' ? 'Update from App Store' : 'Update from Play Store'}
              </Text>
            </TouchableOpacity>

            {!updateInfo.forceUpdate && (
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
  title: {
    fontSize: 22,
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
  versionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
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
