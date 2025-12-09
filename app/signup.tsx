import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Signup() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = () => {
    if (!name || !email || !password) {
      return alert("All fields are required!");
    }

    alert("Account Created Successfully!");
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account ✨</Text>
      <Text style={styles.subtitle}>Sign up to get started</Text>

      <View style={styles.card}>
        {/* Name */}
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={22} color="#1E88E5" />
          <TextInput
            placeholder="Full Name"
            style={styles.input}
            onChangeText={setName}
          />
        </View>

        {/* Email */}
        <View style={styles.inputWrapper}>
          <Ionicons name="mail-outline" size={22} color="#1E88E5" />
          <TextInput
            placeholder="Email Address"
            style={styles.input}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={22} color="#1E88E5" />
          <TextInput
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            onChangeText={setPassword}
          />
        </View>

        {/* Signup Button */}
        <TouchableOpacity style={styles.btn} onPress={submit}>
          <Text style={styles.btnText}>Sign Up</Text>
        </TouchableOpacity>

        {/* Already have account */}
        <TouchableOpacity onPress={() => router.replace("/login")}>
          <Text style={styles.link}>
            Already have an account? <Text style={{ color: "#1E88E5" }}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, paddingTop: 80, backgroundColor: "#F5F9FF" },
  title: { fontSize: 32, fontWeight: "700", color: "#1E88E5" },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 30 },
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
  input: { marginLeft: 10, flex: 1, fontSize: 16 },
  btn: { backgroundColor: "#1E88E5", padding: 15, borderRadius: 12, marginTop: 10 },
  btnText: { color: "white", fontSize: 18, textAlign: "center", fontWeight: "600" },
  link: { textAlign: "center", marginTop: 15, fontSize: 15, color: "#444" },
});
