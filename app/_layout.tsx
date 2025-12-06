// app/_layout.tsx - SIMPLE VERSION
import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar, View, Text, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function TabLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Custom Header
  const CustomHeader = () => {
    return (
      <SafeAreaView style={{ backgroundColor: '#2e7d32' }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 15,
          height: 80,
        }}>
          {/* App Title */}
          <Text style={{
            color: '#fff',
            fontSize: 22,
            fontWeight: 'bold',
          }}>
            Energy Dashboard
          </Text>
          
          {/* Login/Logout Button */}
          <TouchableOpacity 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              paddingHorizontal: 15,
              paddingVertical: 8,
              borderRadius: 20,
            }}
            onPress={() => {
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
                        Alert.alert('Success', 'Logged out successfully!');
                      }
                    }
                  ]
                );
              } else {
                setShowLoginModal(true);
              }
            }}
          >
            <Text style={{ fontSize: 20, color: '#fff' }}>
              {isLoggedIn ? '👤' : '🔓'}
            </Text>
            <Text style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: '600',
              marginLeft: 6,
            }}>
              {isLoggedIn ? 'Logout' : 'Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  // Login Modal
  const LoginModal = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = () => {
      setIsLoggedIn(true);
      setShowLoginModal(false);
      setUsername('');
      setPassword('');
      Alert.alert('Success', 'Login successful!');
    };

    return (
      <Modal
        visible={showLoginModal}
        transparent={true}
        animationType="slide"
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 20,
            padding: 25,
            width: '85%',
            maxWidth: 400,
          }}>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: '#2e7d32',
              marginBottom: 25,
              textAlign: 'center',
            }}>
              Login
            </Text>
            
            <TextInput
              style={{
                fontSize: 16,
                color: '#333',
                padding: 12,
                backgroundColor: '#f9f9f9',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#e0e0e0',
                marginBottom: 15,
              }}
              placeholder="Username"
              placeholderTextColor="#999"
              value={username}
              onChangeText={setUsername}
            />
            
            <TextInput
              style={{
                fontSize: 16,
                color: '#333',
                padding: 12,
                backgroundColor: '#f9f9f9',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#e0e0e0',
                marginBottom: 20,
              }}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginRight: 10,
                  backgroundColor: '#f5f5f5',
                }}
                onPress={() => setShowLoginModal(false)}
              >
                <Text style={{ color: '#666', fontSize: 16, fontWeight: '600' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: '#2e7d32',
                }}
                onPress={handleLogin}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  Login
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#2e7d32" />
      
      {/* Custom Header */}
      <CustomHeader />
      
      {/* Tabs */}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2e7d32',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 2,
            borderTopColor: '#e0e0e0',
            height: 65,
            paddingBottom: 8,
            paddingTop: 8,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: 'Overview',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 24, color: focused ? '#2e7d32' : 'gray' }}>
                🏠
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="recharge"
          options={{
            tabBarLabel: 'Recharge',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 24, color: focused ? '#2e7d32' : 'gray' }}>
                💰
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="report"
          options={{
            tabBarLabel: 'Report',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 24, color: focused ? '#2e7d32' : 'gray' }}>
                📊
              </Text>
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            tabBarLabel: 'More',
            tabBarIcon: ({ focused }) => (
              <Text style={{ fontSize: 24, color: focused ? '#2e7d32' : 'gray' }}>
                ☰
              </Text>
            ),
          }}
        />
      </Tabs>

      {/* Login Modal */}
      <LoginModal />
    </SafeAreaProvider>
  );
}