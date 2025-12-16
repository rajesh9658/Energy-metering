import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, error, setError } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    // Clear previous errors
    setError("");

    // Validation
    if (!name.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(name, password);
      
      if (result.success) {
        // Navigate to overview on success
        Alert.alert("Success", result.message);
        router.replace("/(tabs)/overview");
      } else {
        // Show error from API
        Alert.alert("Login Failed", result.message);
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back 👋</Text>
          <Text style={styles.subtitle}>Login to continue using the app</Text>
        </View>

        {/* Card Box */}
        <View style={styles.card}>
          {/* Name Input */}
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={22} color="#1E88E5" />
            <TextInput
              placeholder="Enter Name or Email"
              style={styles.input}
              value={name}
              onChangeText={setName}
              editable={!isLoading}
              autoCapitalize="none"
              placeholderTextColor="#888"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={22} color="#1E88E5" />
            <TextInput
              placeholder="Enter Password"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              secureTextEntry
              placeholderTextColor="#888"
            />
          </View>

          {/* Error Message (if any) */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={18} color="#D32F2F" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.btn, isLoading && styles.btnDisabled]} 
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="white" />
                <Text style={styles.btnText}>Login</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Test Connection Button */}
          <TouchableOpacity 
            style={styles.testButton}
            onPress={async () => {
              Alert.alert("Testing API", "Checking connection...");
              try {
                const response = await fetch("http://10.0.2.2:8000/api/mobile-login", {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({name: 'test', password: 'test'})
                });
                const data = await response.json();
                Alert.alert("API Test", JSON.stringify(data, null, 2));
              } catch (err) {
                Alert.alert("API Error", err.message);
              }
            }}
            disabled={isLoading}
          >
            <Ionicons name="wifi-outline" size={18} color="white" />
            <Text style={styles.testButtonText}> Test API Connection</Text>
          </TouchableOpacity>

          {/* Links */}
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => router.push("/forgot")} disabled={isLoading}>
              <Text style={styles.forgot}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/signup")} disabled={isLoading}>
              <Text style={styles.signup}>
                Don't have an account? <Text style={{ color: "#1E88E5", fontWeight: "600" }}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Enter credentials and press Login
            {"\n"}2. App calls API: http://10.0.2.2:8000/api/mobile-login
            {"\n"}3. If API returns "status": true → Login successful
            {"\n"}4. User data saved in AsyncStorage as string
            {"\n"}5. Token (device_id) saved for future requests
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F9FF",
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 25,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1E88E5",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  card: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C9D5EE",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    backgroundColor: "#F8FAFF",
  },
  input: {
    marginLeft: 12,
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  btn: {
    backgroundColor: "#1E88E5",
    padding: 18,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 16,
  },
  btnDisabled: {
    backgroundColor: "#90CAF9",
  },
  btnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  testButton: {
    backgroundColor: "#4CAF50",
    padding: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  testButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 6,
  },
  linksContainer: {
    alignItems: "center",
  },
  forgot: {
    fontSize: 15,
    color: "#1E88E5",
    fontWeight: "500",
    marginBottom: 12,
  },
  signup: {
    fontSize: 15,
    color: "#555",
  },
  infoBox: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBDEFB",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1976D2",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
});