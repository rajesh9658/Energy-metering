import { Stack } from "expo-router";
import { AuthProvider } from "./context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Authentication screens */}
        <Stack.Screen name="login" />
        
        {/* Main app screens */}
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  );
}