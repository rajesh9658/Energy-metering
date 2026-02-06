import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { getChangePasswordUrl } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";

export default function ChangePasswordSimple() {
  const { email: routeEmail } = useLocalSearchParams();

  const [email, setEmail] = useState(routeEmail ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) return "At least 8 characters";
    if (!hasUpperCase) return "One uppercase letter";
    if (!hasLowerCase) return "One lowercase letter";
    if (!hasNumbers) return "One number";
    if (!hasSpecialChar) return "One special character";
    return null;
  };

  useEffect(() => {
    const loadEmail = async () => {
      try {
        // पहले route params से email लें
        if (routeEmail) {
          setEmail(routeEmail);
          await AsyncStorage.setItem("user_email", routeEmail);
        } else {
          // अगर route params में नहीं है तो AsyncStorage से लें
          const storedEmail = await AsyncStorage.getItem("user_email");
          if (storedEmail) {
            setEmail(storedEmail);
          }
        }
      } catch (error) {
        console.error("Error loading email:", error);
      }
    };
    loadEmail();
  }, [routeEmail]);

  const handleChangePassword = async () => {
    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
      const apiUrl = getChangePasswordUrl();
      console.log("Using email:", email);
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          user_email: email,
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json();
      console.log("Response:", data);

      if (data.status === true) {
        Alert.alert(
          "Success",
          data.message,
          [
            {
              text: "OK",
              onPress: () => {
                // Clear sensitive data
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
                router.replace("/(auth)/login");
              },
            },
          ]
        );
      } else {
        setError(data.message || "Failed to change password");
      }
    } catch (error) {
      console.error("Error:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Change Password</Text>
      
      {/* Email display (optional - आप चाहें तो इसे भी हटा सकते हैं) */}
      {email ? (
        <View style={styles.emailContainer}>
          <Text style={styles.emailLabel}>Changing password for:</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>
      ) : null}
      
      <TextInput
        placeholder="Current Password"
        secureTextEntry
        style={styles.input}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        editable={!loading}
        autoCapitalize="none"
      />
      
      <TextInput
        placeholder="New Password"
        secureTextEntry
        style={styles.input}
        value={newPassword}
        onChangeText={setNewPassword}
        editable={!loading}
        autoCapitalize="none"
      />
      
      <TextInput
        placeholder="Confirm Password"
        secureTextEntry
        style={styles.input}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        editable={!loading}
        autoCapitalize="none"
      />
      
      {error ? <Text style={styles.error}>{error}</Text> : null}
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleChangePassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Change Password</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  emailContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  emailLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: "white",
  },
  error: {
    color: "red",
    marginBottom: 15,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  backButton: {
    padding: 15,
    alignItems: "center",
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },
});