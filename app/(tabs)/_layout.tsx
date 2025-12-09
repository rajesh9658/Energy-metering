import { Tabs, Redirect } from "expo-router";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

export default function TabLayout() {
  const { user, logout } = useAuth();

  if (!user) return <Redirect href="/login" />;

  return (
    <>
      {/* Header */}
      <View
        style={{
          paddingTop: 40,
          paddingBottom: 12,
          backgroundColor: "#1E88E5",
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: 15,
        }}
      >
        <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>
          Welcome, {user.name}
        </Text>

        <TouchableOpacity onPress={logout}>
          <Text style={{ color: "white", fontSize: 16 }}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#1E88E5" }}>
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
