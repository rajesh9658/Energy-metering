// app/_layout.tsx

import { Stack, Redirect } from "expo-router";
// AuthProvider को context फोल्डर से इम्पोर्ट करें
import { AuthProvider, useAuth } from "./context/AuthContext"; 
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useEffect } from "react";
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function LayoutContent() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1E88E5" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* अगर user लॉग इन नहीं है, तो उसे (auth) पर रीडायरेक्ट करें */}
      <Stack.Screen name="(tabs)" redirect={!user} />
      
      {/* अगर user लॉग इन है, तो उसे (tabs) पर रीडायरेक्ट करें */}
      <Stack.Screen name="(auth)" redirect={!!user} />

      {/* रूट में मौजूद फ़ाइलों को रीडायरेक्ट करें */}
      <Stack.Screen name="index" redirect />
      <Stack.Screen name="login" redirect />
      <Stack.Screen name="signup" redirect />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <LayoutContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F9FF',
  }
});