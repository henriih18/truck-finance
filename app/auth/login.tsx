import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../src/supabase/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa correo y contraseña.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('Éxito', 'Cuenta creada. Revisa tu correo para confirmar (si está activado) o inicia sesión.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // El store se actualizará automáticamente y el layout nos llevará al dashboard
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Ocurrió un error al autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={s.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.content}>
        <Text style={s.title}>🚚 Truck Finance</Text>
        <Text style={s.subtitle}>Gestión financiera para transportadores</Text>

        <Text style={s.label}>CORREO ELECTRÓNICO</Text>
        <TextInput
          style={s.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="conductor@ejemplo.com"
        />

        <Text style={s.label}>CONTRASEÑA</Text>
        <TextInput
          style={s.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <Pressable 
          style={[s.button, loading && s.buttonDisabled]} 
          onPress={handleAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={s.buttonText}>
              {isSignUp ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => setIsSignUp(!isSignUp)} style={s.toggleContainer}>
          <Text style={s.toggleText}>
            {isSignUp 
              ? '¿Ya tienes cuenta? Inicia sesión' 
              : '¿No tienes cuenta? Regístrate aquí'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 40 },
  label: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 16, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  toggleContainer: { marginTop: 24, alignItems: 'center' },
  toggleText: { color: '#2563eb', fontWeight: '600' },
});