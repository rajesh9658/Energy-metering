import React, { useEffect, useState } from "react";
import { Tabs, Redirect } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const { user, loading, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const fadeAnim = useState(new Animated.Value(0))[0];

  const showToast = (message: string) => {
    setToastMsg(message);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  useEffect(() => {
    if (user) {
      showToast(`Welcome back, ${user.name?.split("@")[0]}!`);
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1E88E5" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  const handleLogout = async () => {
    showToast("Logged out successfully!");
    setTimeout(async () => {
      await logout();
    }, 800);
  };

  return (
    <>
      {/* ================= TOAST ================= */}
      {toastVisible && (
        <Animated.View
          style={{
            position: "absolute",
            top: insets.top + 16,
            left: 20,
            right: 20,
            backgroundColor: "#334155",
            padding: 14,
            borderRadius: 12,
            zIndex: 9999,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            opacity: fadeAnim,
            elevation: 10,
          }}
        >
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          <Text style={{ color: "white", fontWeight: "700", marginLeft: 8 }}>
            {toastMsg}
          </Text>
        </Animated.View>
      )}

      {/* ================= HEADER ================= */}
      <View style={{ backgroundColor: "#1E88E5" }}>
       <View
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 18,
          paddingHorizontal: 20,
          backgroundColor: "#1E88E5",
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="person" size={22} color="white" />
            </View>

            <View>
              <Text style={{ color: "white", fontSize: 18, fontWeight: "800" }}>
                {user.name?.split("@")[0].toUpperCase() || "USER"}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="location-sharp" size={13} color="#bbdefb" />
                <Text style={{ color: "#bbdefb", fontSize: 12, marginLeft: 4 }}>
                  Site: {user.site?.location || "No Site"}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.7}
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            <Ionicons name="power" size={22} color="white" />
            <Text style={{ color: "white", fontSize: 8, fontWeight: "700" }}>
              LOGOUT
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= TABS ================= */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#1E88E5",
          tabBarInactiveTintColor: "#94a3b8",
          tabBarStyle: {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            backgroundColor: "white",
            elevation: 20,
          },
        }}
      >
        <Tabs.Screen
          name="overview"
          options={{
            title: "Overview",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="speedometer" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="recharge"
          options={{
            title: "Recharge",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="flash" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="report"
          options={{
            title: "Reports",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "Menu",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
