// App.tsx - Header में Login Icon के साथ
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { 
  StatusBar, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import Screens
import OverviewScreen from './app/screens/OverviewScreen';
import RechargeScreen from './app/screens/RechargeScreen';
import ReportScreen from './app/screens/ReportScreen';
import MoreScreen from './app/screens/MoreScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Header with Login Icon on Right Side
const HeaderWithLogin = ({ navigation, route }: any) => {
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  const handleLoginLogout = () => {
    if (isLoggedIn) {
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Logout', 
            onPress: () => {
              setIsLoggedIn(false);
              Alert.alert('Logged Out', 'You have been logged out successfully');
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Login',
        'Login to your account',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Login', 
            onPress: () => {
              setIsLoggedIn(true);
              Alert.alert('Logged In', 'Welcome back!');
            }
          }
        ]
      );
    }
  };

  return (
    <View style={headerStyles.container}>
      {/* Left: App Title */}
      <View style={headerStyles.left}>
        <Text style={headerStyles.title}>Energy Dashboard</Text>
      </View>

      {/* Right: Login Icon */}
      <TouchableOpacity 
        style={headerStyles.loginButton}
        onPress={handleLoginLogout}
      >
        <View style={headerStyles.loginContainer}>
          <Text style={headerStyles.loginIcon}>
            {isLoggedIn ? '👤' : '🔓'}
          </Text>
          <Text style={headerStyles.loginText}>
            {isLoggedIn ? 'Logout' : 'Login'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Main App with Tabs
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          let icon = '🏠';
          let label = 'Overview';
          
          switch (route.name) {
            case 'Overview':
              icon = '🏠';
              label = 'Overview';
              break;
            case 'Recharge':
              icon = '💰';
              label = 'Recharge';
              break;
            case 'Report':
              icon = '📊';
              label = 'Report';
              break;
            case 'More':
              icon = '☰';
              label = 'More';
              break;
          }
          
          return (
            <View style={{ alignItems: 'center', paddingTop: 5 }}>
              <Text style={{ 
                fontSize: 24, 
                marginBottom: 4,
                color: focused ? '#2e7d32' : 'gray'
              }}>
                {icon}
              </Text>
              <Text style={{ 
                fontSize: 12, 
                color: focused ? '#2e7d32' : 'gray',
                fontWeight: focused ? '600' : '400'
              }}>
                {label}
              </Text>
            </View>
          );
        },
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 2,
          borderTopColor: '#e0e0e0',
          height: 70,
        },
        header: () => <HeaderWithLogin />,
      })}
    >
      <Tab.Screen 
        name="Overview" 
        component={OverviewScreen}
        options={{ 
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Recharge" 
        component={RechargeScreen}
        options={{ headerShown: true }}
      />
      <Tab.Screen 
        name="Report" 
        component={ReportScreen}
        options={{ headerShown: true }}
      />
      <Tab.Screen 
        name="More" 
        component={MoreScreen}
        options={{ headerShown: true }}
      />
    </Tab.Navigator>
  );
}

// Simple Login Modal
const LoginModal = ({ visible, onClose, onLogin }: any) => {
  if (!visible) return null;

  return (
    <View style={modalStyles.overlay}>
      <View style={modalStyles.container}>
        <Text style={modalStyles.title}>Login</Text>
        
        <View style={modalStyles.inputContainer}>
          <Text style={modalStyles.label}>Username</Text>
          <Text style={modalStyles.input}>shalani@example.com</Text>
        </View>
        
        <View style={modalStyles.inputContainer}>
          <Text style={modalStyles.label}>Password</Text>
          <Text style={modalStyles.input}>••••••••</Text>
        </View>
        
        <View style={modalStyles.buttonContainer}>
          <TouchableOpacity 
            style={[modalStyles.button, modalStyles.cancelButton]} 
            onPress={onClose}
          >
            <Text style={modalStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[modalStyles.button, modalStyles.loginButton]} 
            onPress={onLogin}
          >
            <Text style={modalStyles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
      
      <LoginModal 
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => {
          setShowLoginModal(false);
          Alert.alert('Success', 'Login successful!');
        }}
      />
    </SafeAreaProvider>
  );
}

// Header Styles
const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2e7d32',
    paddingHorizontal: 20,
    paddingVertical: 15,
    height: 80,
    paddingTop: 35,
  },
  left: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  loginButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  loginIcon: {
    fontSize: 20,
    color: '#fff',
    marginRight: 6,
  },
  loginText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Modal Styles
const modalStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    fontSize: 16,
    color: '#333',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loginButton: {
    backgroundColor: '#2e7d32',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});