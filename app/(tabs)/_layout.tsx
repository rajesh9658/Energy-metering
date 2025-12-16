import { Tabs, Redirect } from "expo-router";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

export default function TabLayout() {
  const { user, loading, logout } = useAuth();

  // Show loading indicator while checking authentication status
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={{ marginTop: 10, color: "#555" }}>Checking authentication...</Text>
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect href="/login" />;
  }

  const handleLogout = async () => {
    await logout();
    // Redirect will happen automatically because user state will become null
  };

  return (
    <>
      {/* =================== 3D HEADER WITH SHADOW =================== */}
      <View style={{ position: "relative" }}>
        
        {/* Shadow Layer (behind header) */}
        <View
          style={{
            position: "absolute",
            top: 10,
            left: 0,
            right: 0,
            height: "100%",
            backgroundColor: "#1565C0",
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
            elevation: 14,
          }}
        />

        {/* Main Header */}
        <View
          style={{
            paddingTop: 45,
            paddingBottom: 16,
            backgroundColor: "#1E88E5",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 18,
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,

            // 3D border effect
            borderWidth: 2,
            borderColor: "#1565C0",
            borderTopColor: "rgba(255, 255, 255, 0.25)",
            borderLeftColor: "#1565C0",
            borderRightColor: "#1565C0",
            borderBottomColor: "#0D47A1",

            // Down shadow
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 12,
          }}
        >
          <View>
            <Text
              style={{
                color: "white",
                fontSize: 20,
                fontWeight: "700",
                textShadowColor: "rgba(0, 0, 0, 0.3)",
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 3,
              }}
            >
              Welcome, {user.name}
            </Text>
            {user.site_name && (
              <Text
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Site: {user.site_name}
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.3)",
              borderTopColor: "rgba(255, 255, 255, 0.4)",
              borderBottomColor: "rgba(0, 0, 0, 0.25)",
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 16,
                fontWeight: "600",
                textShadowColor: "rgba(0, 0, 0, 0.25)",
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            >
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* =================== TABS =================== */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#1E88E5",
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
              <Ionicons name="battery-charging" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="report"
          options={{
            title: "Reports",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text" size={size} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="apps" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}