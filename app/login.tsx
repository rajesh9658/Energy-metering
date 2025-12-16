import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from "react-native";
import { useState } from "react";
// import { useAuth } from "../context/AuthContext";
import { useAuth } from "./context/AuthContext";
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
      setError("Please fill all fields");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(name, password);
      
      if (result.success) {
        // Navigate to overview on success
        router.replace("/(tabs)/overview");
      } else {
        // Error is already set in AuthContext
        Alert.alert("Login Failed", result.message || "Invalid credentials");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Welcome Back 👋</Text>
      <Text style={styles.subtitle}>Login to continue using the app</Text>

      {/* Card Box */}
      <View style={styles.card}>
        {/* Username Input */}
        <View style={styles.inputWrapper}>
          <Ionicons name="person-circle-outline" size={22} color="#1E88E5" />
          <TextInput
            placeholder="Enter Name"
            style={styles.input}
            onChangeText={setName}
            value={name}
            editable={!isLoading}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={22} color="#1E88E5" />
          <TextInput
            placeholder="Enter Password"
            secureTextEntry
            style={styles.input}
            onChangeText={setPassword}
            value={password}
            editable={!isLoading}
          />
        </View>

        {/* Error Message */}
        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {/* Login Button */}
        <TouchableOpacity 
          style={[styles.btn, isLoading && styles.btnDisabled]} 
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.btnText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Links */}
        <TouchableOpacity onPress={() => router.push("/forgot")} disabled={isLoading}>
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/signup")} disabled={isLoading}>
          <Text style={styles.signup}>
            Don't have an account? <Text style={{ color: "#1E88E5" }}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    paddingTop: 80,
    backgroundColor: "#F5F9FF",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1E88E5",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C9D5EE",
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
    backgroundColor: "#F8FAFF",
  },
  input: {
    marginLeft: 10,
    flex: 1,
    fontSize: 16,
  },
  btn: {
    backgroundColor: "#1E88E5",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  btnDisabled: {
    backgroundColor: "#90CAF9",
  },
  btnText: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "600",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
    textAlign: "center",
  },
  forgot: {
    textAlign: "center",
    marginTop: 15,
    fontSize: 15,
    color: "#1E88E5",
  },
  signup: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 15,
    color: "#444",
  },
});