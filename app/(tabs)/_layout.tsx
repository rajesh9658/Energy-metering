import React, { useEffect, useState } from "react";
import { Tabs, Redirect } from "expo-router";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Animated, 
  Dimensions 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

const { width } = Dimensions.get("window");

export default function TabLayout() {
  const { user, loading, logout } = useAuth();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Logic for Beautiful Toast Notification
  const showToast = (message) => {
    setToastMsg(message);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  // Show Login Success Toast on first mount if user exists
  useEffect(() => {
    if (user) {
      showToast(`Welcome back, ${user.name?.split('@')[0]}!`);
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={{ marginTop: 10, color: "#64748b", fontWeight: "600" }}>Loading Dashboard...</Text>
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const handleLogout = async () => {
    showToast("Logged out successfully! 👋");
    setTimeout(async () => {
      await logout();
    }, 1000);
  };

  return (
    <>
      {/* =================== CUSTOM BEAUTIFUL TOAST =================== */}
      {toastVisible && (
        <Animated.View style={{
          position: 'absolute',
          top: 100,
          left: 20,
          right: 20,
          backgroundColor: '#334155',
          padding: 15,
          borderRadius: 12,
          zIndex: 9999,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: fadeAnim,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
        }}>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" style={{ marginRight: 10 }} />
          <Text style={{ color: 'white', fontWeight: 'bold' }}>{toastMsg}</Text>
        </Animated.View>
      )}

      {/* =================== MODERN PREMIUM HEADER =================== */}
      <View style={{ backgroundColor: "#f8fafc", zIndex: 100 }}>
        <View style={{
          paddingTop: 50,
          paddingBottom: 20,
          backgroundColor: "#1E88E5",
          paddingHorizontal: 20,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          
          // Shadow & 3D Depth
          shadowColor: "#1E88E5",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.4,
          shadowRadius: 15,
          elevation: 20,
          borderBottomWidth: 4,
          borderBottomColor: "#1565C0",
        }}>
          {/* User Profile Section */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.5)',
              marginRight: 12
            }}>
              <Ionicons name="person" size={24} color="white" />
            </View>
            <View>
              <Text style={{
                color: "white",
                fontSize: 18,
                fontWeight: "800",
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3
              }}>
                Hello, {user.name ? user.name.split('@')[0].toUpperCase() : "User"}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="location-sharp" size={14} color="#bbdefb" />
                <Text style={{ color: "#bbdefb", fontSize: 12, fontWeight: "600", marginLeft: 4 }}>
                  Site: {user.site_name || "Mundka"}
                </Text>
              </View>
            </View>
          </View>

          {/* Logout Styled Button */}
                          <TouchableOpacity
                    onPress={handleLogout}
                    activeOpacity={0.7}
                    style={{
                      backgroundColor: "#1E88E5",
                      width: 50,
                      height: 50,
                      borderRadius: 10,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.3)',
                      elevation: 5,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                    }}
                  >
                    <Ionicons 
                      name="power" 
                      size={22} 
                      color="white" 
                    />
                    <Text style={{ 
                      color: "white", 
                      fontWeight: "800", 
                      fontSize: 8,
                      textTransform: 'uppercase',
                      marginTop: 2
                    }}>
                      Logout
                    </Text>
                  </TouchableOpacity>
        </View>
      </View>

      {/* =================== TAB NAVIGATION =================== */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#1E88E5",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarStyle: {
            height: 65,
            paddingBottom: 10,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: 'white',
            position: 'absolute',
            borderTopWidth: 0,
            elevation: 20,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 10
          }
        }}
      >
        <Tabs.Screen
          name="overview"
          options={{
            title: "Overview",
            tabBarIcon: ({ color, size }) => <Ionicons name="speedometer" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="recharge"
          options={{
            title: "Recharge",
            tabBarIcon: ({ color, size }) => <Ionicons name="flash" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="report"
          options={{
            title: "Reports",
            tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "Menu",
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}