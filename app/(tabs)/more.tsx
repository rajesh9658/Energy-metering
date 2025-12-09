import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function MoreScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const menuItems = [
    { title: 'Profile Settings', icon: '👤', description: 'Manage your profile' },
    { title: 'Notification Settings', icon: '🔔', description: 'Configure alerts' },
    { title: 'Billing Information', icon: '💳', description: 'Payment methods' },
    { title: 'Usage History', icon: '📊', description: 'Past consumption' },
    { title: 'Device Management', icon: '🔧', description: 'Manage meters' },
    { title: 'Support & Help', icon: '🆘', description: 'Get assistance' },
    { title: 'About App', icon: 'ℹ️', description: 'Version & info' },
    { title: 'Logout', icon: '🚪', description: 'Sign out', color: '#ff4444' },
  ];

  return (
    <ScrollView style={styles.scrollView}>
      

      <View style={styles.content}>
        {/* User Profile Section */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.avatarText}>SD</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Sanjay Gupta</Text>
            <Text style={styles.profileMeter}>Meter: #B-0001</Text>
            <Text style={styles.profileEmail}>customer@example.com</Text>
          </View>
        </View>

        {/* Settings Section */}
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <View style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔔</Text>
              <View>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Receive alerts and updates</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#767577', true: '#81c784' }}
              thumbColor={notificationsEnabled ? '#2e7d32' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🌙</Text>
              <View>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingDescription}>Switch to dark theme</Text>
              </View>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: '#767577', true: '#81c784' }}
              thumbColor={darkModeEnabled ? '#2e7d32' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionTitle}>Menu</Text>
        
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.menuCard,
                item.color && { borderColor: item.color, borderWidth: 1 }
              ]}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[
                styles.menuTitle,
                item.color && { color: item.color }
              ]}>
                {item.title}
              </Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.appInfoCard}>
          <Text style={styles.appInfoTitle}>Energy Meter App</Text>
          <Text style={styles.appInfoVersion}>Version 2.1.0</Text>
          <Text style={styles.appInfoText}>© 2025 Energy Solutions Ltd.</Text>
          <Text style={styles.appInfoText}>All rights reserved</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    // backgroundColor: '#2e7d32',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  content: {
    padding: 20,
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2e7d32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  profileMeter: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 3,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 5,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  menuCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
    textAlign: 'center',
  },
  menuDescription: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  appInfoCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  appInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 10,
  },
  appInfoVersion: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  appInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
});