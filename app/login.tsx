import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const submit = () => {
    login(name, password);
    router.replace("/(tabs)/overview");
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
          />
        </View>

        {/* Login Button */}
        <TouchableOpacity style={styles.btn} onPress={submit}>
          <Text style={styles.btnText}>Login</Text>
        </TouchableOpacity>

        {/* Links */}
        <TouchableOpacity onPress={() => router.push("/forgot")}>
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push("/signup")}>
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

  btnText: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "600",
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
