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
  ScrollView,
  Dimensions,
  Animated
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext"; 
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function Login() {
  const [userid, setUserid] = useState(""); 
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState({ userid: false, password: false });
  
  const { login, error: loginError, setError } = useAuth();
  const router = useRouter();
  
  const useridInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true })
    ]).start();
  }, []);

  const handleLogin = async () => {
    setError("");
    if (!userid.trim() || !password.trim()) {
      Alert.alert("Required", "Please enter User ID and Password.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(userid, password); 
      if (result.success) {
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: -50, duration: 300, useNativeDriver: true })
        ]).start(() => router.replace("/(tabs)/overview"));
      } else {
        // Check if this is a first-time login requiring password change
        if (result.message && result.message.includes("Password change required")) {
          Alert.alert(
            "First Time Login", 
            "Please change your password to continue.",
            [
              {
                text: "Change Password",
                onPress: () => {
                  // Navigate to change-password screen with the email
                  router.push({
                    pathname: "/(auth)/change-password",
                    params: { email: userid.trim() }
                  });
                },
              },
              {
                text: "Cancel",
                style: "cancel"
              }
            ]
          );
        } else {
          Alert.alert("Login Failed", result.message || "Invalid credentials");
        }
      }
    } catch (error) {
      Alert.alert("Connection Error", "Please check your internet connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#667eea', '#764ba2', '#667eea']} style={styles.gradientBackground}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              
              <View style={styles.header}>
                <Text style={styles.title}>Energy-Metering</Text>
              </View>

              <View style={styles.card}>
                <LinearGradient colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.95)']} style={styles.cardGradient}>
                  
                  {/* User ID Input Section */}
                  <TouchableOpacity 
                    style={[styles.inputWrapper, isFocused.userid && styles.inputWrapperFocused]}
                    activeOpacity={1}
                    onPress={() => useridInputRef.current?.focus()}
                  >
                    <Ionicons name="person-outline" size={22} color={isFocused.userid ? "#667eea" : "#9CA3AF"} />
                    <TextInput
                      ref={useridInputRef}
                      placeholder="Email Address"
                      style={styles.input}
                      value={userid} 
                      onChangeText={setUserid}
                      onFocus={() => setIsFocused(prev => ({ ...prev, userid: true }))}
                      onBlur={() => setIsFocused(prev => ({ ...prev, userid: false }))}
                      editable={!isLoading}
                      autoCapitalize="none"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </TouchableOpacity>

                  {/* Password Input Section */}
                  <TouchableOpacity 
                    style={[styles.inputWrapper, isFocused.password && styles.inputWrapperFocused]}
                    activeOpacity={1}
                    onPress={() => passwordInputRef.current?.focus()}
                  >
                    <Ionicons name="lock-closed-outline" size={22} color={isFocused.password ? "#667eea" : "#9CA3AF"} />
                    <TextInput
                      ref={passwordInputRef}
                      placeholder="Password"
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setIsFocused(prev => ({ ...prev, password: true }))}
                      onBlur={() => setIsFocused(prev => ({ ...prev, password: false }))}
                      editable={!isLoading}
                      secureTextEntry={!isPasswordVisible}
                      placeholderTextColor="#9CA3AF"
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={styles.eyeIcon}>
                      <Ionicons name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} size={22} color="#9CA3AF" />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  <View style={styles.utilityRow}>
                    <TouchableOpacity 
                    style={styles.forgotPassword} 
                    onPress={() =>
                      router.push({
                        pathname: "/change-password",
                        params: { email: userid.trim() },
                      })
                    }
                    disabled={isLoading}
                  >
                    <Text style={styles.forgotPasswordText}>Change Password</Text>
                  </TouchableOpacity>

                  </View>

                  <TouchableOpacity 
                    style={[styles.btn, isLoading && styles.btnDisabled]} 
                    onPress={handleLogin} 
                    disabled={isLoading}
                  >
                    <LinearGradient 
                      colors={isLoading ? ['#9CA3AF', '#9CA3AF'] : ['#667eea', '#764ba2']} 
                      style={styles.btnGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Ionicons name="log-in-outline" size={22} color="white" />
                          <Text style={styles.btnText}>Login</Text>
                        </View>
                      )}

                    </LinearGradient>
                  </TouchableOpacity>

                  {/* First Time Login Info */}
                  <View style={styles.infoBox}>
                    <Ionicons name="information-circle-outline" size={18} color="#667eea" />
                    <Text style={styles.infoText}>
                      First time users must change their password after login
                    </Text>
                  </View>
                </LinearGradient>
              </View>

              <Text style={styles.versionText}>v1.0.0 • Secure Login</Text>
            </Animated.View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: { 
    flexGrow: 1, 
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'center',
    minHeight: height,
  },
  animatedContainer: {
    width: '100%',
  },
  
  // --- Header Styles ---
  header: { 
    marginBottom: 40,
    alignItems: 'center',
  },
  title: { 
    fontSize: 32, 
    fontWeight: "800", 
    color: "white", 
    marginBottom: 8,
    textAlign: 'center',
  },

  // --- Card Styles ---
  card: { 
    backgroundColor: "transparent",
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 30,
  },
  cardGradient: {
    padding: 32,
    borderRadius: 28,
  },
  
  // --- Input Styles ---
  inputWrapper: { 
    flexDirection: "row", 
    alignItems: "center", 
    borderWidth: 2, 
    borderColor: "#E5E7EB", 
    borderRadius: 16, 
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 20, 
    backgroundColor: "white",
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
    color: "#1F2937", 
    fontWeight: '500',
    marginLeft: 12,
    padding: 0,
    zIndex: 10,
    includeFontPadding: false,
    paddingVertical: 0,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  
  // --- Utility Row ---
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 24,
  },
  forgotPassword: {
    padding: 8,
  },
  forgotPasswordText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // --- Button Styles ---
  btn: { 
    borderRadius: 16, 
    overflow: 'hidden',
    marginBottom: 16,
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
  btnText: { 
    color: "white", 
    fontSize: 18, 
    fontWeight: "700", 
    marginLeft: 12, 
  },

  // --- Info Box ---
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E4FF',
    marginTop: 16,
  },
  infoText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  
  // --- Version ---
  versionText: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 20,
  },
});