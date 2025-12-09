import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useRouter } from "expo-router";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const { forgotPassword } = useAuth();
  const router = useRouter();

  const submit = () => {
    forgotPassword(email);
    alert("Password reset link sent!");
    router.back();
  };

  return (
    <View style={{ padding: 20, marginTop: 80 }}>
      <Text style={{ fontSize: 28, fontWeight: "600", marginBottom: 25 }}>
        Reset Password
      </Text>

      <TextInput
        placeholder="Enter Email"
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          borderRadius: 8,
          padding: 12,
          marginBottom: 20,
        }}
        onChangeText={setEmail}
      />

      <TouchableOpacity
        onPress={submit}
        style={{
          backgroundColor: "#1E88E5",
          padding: 15,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "white", textAlign: "center", fontSize: 18 }}>
          Send Reset Link
        </Text>
      </TouchableOpacity>
    </View>
  );
}
