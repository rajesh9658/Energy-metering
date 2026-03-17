import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getChangePasswordUrl } from "./config";

const { height } = Dimensions.get("window");
const PLACEHOLDER_COLOR = "#4B5563";

export default function ChangePasswordSimple() {
  const { email: routeEmail } = useLocalSearchParams();
  const resolvedRouteEmail = Array.isArray(routeEmail) ? routeEmail[0] ?? "" : routeEmail ?? "";

  const [email, setEmail] = useState(resolvedRouteEmail);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [isFocused, setIsFocused] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [fieldPositions, setFieldPositions] = useState({
    current: 0,
    next: 0,
    confirm: 0,
  });
  const currentPasswordRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  const passwordFieldProps: TextInputProps = {
    autoCapitalize: "none",
    autoCorrect: false,
    spellCheck: false,
    contextMenuHidden: false,
    importantForAutofill: "no",
  };

  const scrollToField = (y: number, extraOffset = 140) => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(0, y - extraOffset),
      animated: true,
    });
  };

  const updateFieldPosition = (
    key: "current" | "next" | "confirm",
    event: { nativeEvent?: { layout?: { y?: number } } }
  ) => {
    const y = event?.nativeEvent?.layout?.y;

    if (typeof y !== "number") {
      return;
    }

    setFieldPositions((prev) => ({
      ...prev,
      [key]: y,
    }));
  };

  const validatePassword = (password: string) => {
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
    const syncEmail = async () => {
      try {
        setEmail(resolvedRouteEmail);

        if (resolvedRouteEmail) {
          await AsyncStorage.setItem("user_email", resolvedRouteEmail);
        } else {
          await AsyncStorage.removeItem("user_email");
        }
      } catch (syncError) {
        console.error("Error syncing email:", syncError);
      }
    };

    syncEmail();
  }, [resolvedRouteEmail]);

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
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          user_email: email,
          current_password: currentPassword,
          new_password: newPassword,
          new_password_confirmation: confirmPassword,
        }),
      });

      const data = await response.json();

      if (data.status === true) {
        Alert.alert("Success", data.message, [
          {
            text: "OK",
            onPress: () => {
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
              router.replace("/(auth)/login");
            },
          },
        ]);
      } else {
        setError(data.message || "Failed to change password");
      }
    } catch (requestError) {
      console.error("Error:", requestError);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#667eea", "#764ba2", "#667eea"]} style={styles.gradientBackground}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
          style={styles.keyboardView}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Change Password</Text>
              <Text style={styles.subtitle}>Secure your account with a new password</Text>
            </View>

            <View style={styles.card}>
              <LinearGradient
                colors={["rgba(255, 255, 255, 0.9)", "rgba(255, 255, 255, 0.95)"]}
                style={styles.cardGradient}
              >
                {email ? (
                  <View style={styles.emailContainer}>
                    <Text style={styles.emailLabel}>Changing password for</Text>
                    <Text style={styles.emailText}>{email}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.inputWrapper,
                    isFocused.current && styles.inputWrapperFocused,
                  ]}
                  activeOpacity={1}
                  onPress={() => currentPasswordRef.current?.focus()}
                  onLayout={(event) => updateFieldPosition("current", event)}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={22}
                    color={isFocused.current ? "#667eea" : "#9CA3AF"}
                  />
                  <TextInput
                    ref={currentPasswordRef}
                    placeholder="Current Password"
                    placeholderTextColor={PLACEHOLDER_COLOR}
                    secureTextEntry={!isPasswordVisible.current}
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    editable={!loading}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => newPasswordRef.current?.focus()}
                    autoComplete="off"
                    textContentType="none"
                    {...passwordFieldProps}
                    onFocus={() => {
                      setIsFocused((prev) => ({ ...prev, current: true }));
                      scrollToField(fieldPositions.current, 120);
                    }}
                    onBlur={() => setIsFocused((prev) => ({ ...prev, current: false }))}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setIsPasswordVisible((prev) => ({ ...prev, current: !prev.current }))
                    }
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={isPasswordVisible.current ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.inputWrapper,
                    isFocused.next && styles.inputWrapperFocused,
                  ]}
                  activeOpacity={1}
                  onPress={() => newPasswordRef.current?.focus()}
                  onLayout={(event) => updateFieldPosition("next", event)}
                >
                  <Ionicons
                    name="key-outline"
                    size={22}
                    color={isFocused.next ? "#667eea" : "#9CA3AF"}
                  />
                  <TextInput
                    ref={newPasswordRef}
                    placeholder="New Password"
                    placeholderTextColor={PLACEHOLDER_COLOR}
                    secureTextEntry={!isPasswordVisible.next}
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!loading}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    autoComplete="off"
                    textContentType="none"
                    {...passwordFieldProps}
                    onFocus={() => {
                      setIsFocused((prev) => ({ ...prev, next: true }));
                      scrollToField(fieldPositions.next, 140);
                    }}
                    onBlur={() => setIsFocused((prev) => ({ ...prev, next: false }))}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setIsPasswordVisible((prev) => ({ ...prev, next: !prev.next }))
                    }
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={isPasswordVisible.next ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.inputWrapper,
                    isFocused.confirm && styles.inputWrapperFocused,
                  ]}
                  activeOpacity={1}
                  onPress={() => confirmPasswordRef.current?.focus()}
                  onLayout={(event) => updateFieldPosition("confirm", event)}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={22}
                    color={isFocused.confirm ? "#667eea" : "#9CA3AF"}
                  />
                  <TextInput
                    ref={confirmPasswordRef}
                    placeholder="Confirm Password"
                    placeholderTextColor={PLACEHOLDER_COLOR}
                    secureTextEntry={!isPasswordVisible.confirm}
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!loading}
                    returnKeyType="done"
                    onSubmitEditing={handleChangePassword}
                    autoComplete="off"
                    textContentType="none"
                    {...passwordFieldProps}
                    onFocus={() => {
                      setIsFocused((prev) => ({ ...prev, confirm: true }));
                      scrollToField(fieldPositions.confirm, 180);
                    }}
                    onBlur={() => setIsFocused((prev) => ({ ...prev, confirm: false }))}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setIsPasswordVisible((prev) => ({ ...prev, confirm: !prev.confirm }))
                    }
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={isPasswordVisible.confirm ? "eye-off-outline" : "eye-outline"}
                      size={22}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </TouchableOpacity>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                  style={[styles.btn, loading && styles.btnDisabled]}
                  onPress={handleChangePassword}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={loading ? ["#9CA3AF", "#9CA3AF"] : ["#667eea", "#764ba2"]}
                    style={styles.btnGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Ionicons name="shield-outline" size={22} color="white" />
                        <Text style={styles.btnText}>Update Password</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                  <Text style={styles.backButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: height,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  card: {
    backgroundColor: "transparent",
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
  },
  cardGradient: {
    padding: 32,
    borderRadius: 28,
  },
  emailContainer: {
    backgroundColor: "#F0F4FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D6E4FF",
    marginBottom: 20,
    alignItems: "center",
  },
  emailLabel: {
    fontSize: 13,
    color: "#667085",
    marginBottom: 6,
    fontWeight: "600",
  },
  emailText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4F46E5",
    textAlign: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#D1D5DB",
    borderRadius: 16,
    paddingLeft: 18,
    paddingRight: 14,
    paddingVertical: 14,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  inputWrapperFocused: {
    borderColor: "#667eea",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: "#1F2937",
    fontWeight: "500",
    marginLeft: 12,
    paddingHorizontal: 0,
    paddingVertical: 6,
    minHeight: 36,
    textAlignVertical: "center",
  },
  eyeIcon: {
    paddingVertical: 6,
    paddingLeft: 8,
    paddingRight: 4,
  },
  error: {
    color: "#DC2626",
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  btn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 4,
  },
  btnGradient: {
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
  },
  backButton: {
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  backButtonText: {
    color: "#667eea",
    fontSize: 14,
    fontWeight: "600",
  },
});
