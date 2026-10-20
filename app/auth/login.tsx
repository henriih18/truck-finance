import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { supabase } from "../../src/supabase/client";
import { useTheme } from "../../src/theme/ThemeContext";

export default function Login() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert(
          "Éxito",
          "Cuenta creada. Revisa tu correo para confirmar (si está activado) o inicia sesión.",
        );
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "Ocurrió un error al autenticar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo + título */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 48 }}>🚚</Text>
          </View>
          <Text
            style={{
              fontSize: 30,
              fontWeight: "900",
              color: colors.text,
              textAlign: "center",
            }}
          >
            Truck Finance
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.textMuted,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            Gestión financiera para transportadores
          </Text>
        </View>

        {/* Formulario */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Field
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="conductor@ejemplo.com"
          />

          <Field
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          <Pressable
            style={({ pressed }) => [
              {
                backgroundColor: loading ? colors.surfaceMuted : colors.primary,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                marginTop: 24,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnPrimary} />
            ) : (
              <Text
                style={{
                  color: colors.textOnPrimary,
                  fontSize: 15,
                  fontWeight: "800",
                }}
              >
                {isSignUp ? "CREAR CUENTA" : "INICIAR SESIÓN"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setIsSignUp(!isSignUp)}
            style={({ pressed }) => ({
              marginTop: 20,
              alignItems: "center",
              opacity: pressed ? 0.6 : 1,
              padding: 8,
            })}
          >
            <Text
              style={{
                color: colors.primary,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              {isSignUp
                ? "¿Ya tienes cuenta? Inicia sesión"
                : "¿No tienes cuenta? Regístrate aquí"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ============================================================
 *  Field: label + input
 * ============================================================ */
function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
  secureTextEntry,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric" | "email-address";
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 12 }}>
      <Text
        style={{
          fontSize: 11,
          color: colors.textMuted,
          fontWeight: "700",
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.surfaceMuted,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 14,
          marginTop: 4,
          fontSize: 16,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
        }}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}
