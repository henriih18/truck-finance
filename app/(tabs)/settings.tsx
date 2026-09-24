import { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, Pressable, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useSettings, useUpdateSettings } from '../../src/hooks/useSettings';
import { useAuthStore } from '../../src/stores/auth.store';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { signOut, user } = useAuthStore();
  const router = useRouter();
  const settings = useSettings();
  const updateSettings = useUpdateSettings();

  const [sourceRet, setSourceRet] = useState('');
  const [icaRet, setIcaRet] = useState('');
  const [tieMode, setTieMode] = useState<'deduct' | 'charge_per_moto'>('deduct');
  const [tieFixed, setTieFixed] = useState('');
  const [tiePerMoto, setTiePerMoto] = useState('');
  const [advancePct, setAdvancePct] = useState('');
  const [unloadPerMoto, setUnloadPerMoto] = useState('');
  const [tenEnabled, setTenEnabled] = useState(false);
  const [tenLabel, setTenLabel] = useState('');
  const [tenValue, setTenValue] = useState('');
  const [saving, setSaving] = useState(false);

  // ✅ CORREGIDO: Usar useEffect para cargar valores cuando settings cambie
  useEffect(() => {
    if (settings) {
      setSourceRet(String(settings.sourceRetPct));
      setIcaRet(String(settings.icaRetPct));
      setTieMode(settings.tieMode);
      setTieFixed(String(settings.tieFixed));
      setTiePerMoto(String(settings.tiePerMoto));
      setAdvancePct(String(settings.advancePct));
      setUnloadPerMoto(String(settings.unloadPerMoto));
      setTenEnabled(settings.tenPctEnabled);
      setTenLabel(settings.tenPctLabel);
      setTenValue(String(settings.tenPctValue));
    }
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // ✅ CORREGIDO: Enviar camelCase al hook
      await updateSettings({
        sourceRetPct: Number(sourceRet) || 1.0,
        icaRetPct: Number(icaRet) || 1.0,
        tieMode: tieMode,
        tieFixed: Number(tieFixed) || 130000,
        tiePerMoto: Number(tiePerMoto) || 4000,
        advancePct: Number(advancePct) || 70.0,
        unloadPerMoto: Number(unloadPerMoto) || 3500,
        tenPctEnabled: tenEnabled,
        tenPctLabel: tenLabel || 'Concepto 10%',
        tenPctValue: Number(tenValue) || 10.0,
      });
      Alert.alert('Éxito', 'Configuración guardada correctamente');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, salir',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  if (!settings) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: '#6b7280' }}>Cargando configuración...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container}>
      <Text style={s.title}>Configuración</Text>

      {/* Usuario */}
      <Section title="USUARIO">
        <Text style={s.email}>{user?.email || 'No identificado'}</Text>
      </Section>

      {/* Retenciones */}
      <Section title="RETENCIONES DEL FLETE (%)">
        <Field label="Retención en la fuente (%)" value={sourceRet} onChangeText={setSourceRet} keyboardType="numeric" />
        <Field label="Retención ICA (%)" value={icaRet} onChangeText={setIcaRet} keyboardType="numeric" />
      </Section>

      {/* Amarre */}
      <Section title="AMARRE">
        <Text style={s.label}>¿Cómo se cobra el amarre?</Text>
        <View style={s.row}>
          <Pressable
            style={[s.choice, tieMode === 'deduct' && s.choiceActive]}
            onPress={() => setTieMode('deduct')}
          >
            <Text style={tieMode === 'deduct' ? s.choiceTextActive : s.choiceText}>
              Descuento fijo
            </Text>
          </Pressable>
          <Pressable
            style={[s.choice, tieMode === 'charge_per_moto' && s.choiceActive]}
            onPress={() => setTieMode('charge_per_moto')}
          >
            <Text style={tieMode === 'charge_per_moto' ? s.choiceTextActive : s.choiceText}>
              Por moto
            </Text>
          </Pressable>
        </View>

        {tieMode === 'deduct' ? (
          <Field label="Valor fijo del amarre ($)" value={tieFixed} onChangeText={setTieFixed} keyboardType="numeric" />
        ) : (
          <Field label="Valor por moto ($)" value={tiePerMoto} onChangeText={setTiePerMoto} keyboardType="numeric" />
        )}
      </Section>

      {/* Anticipo */}
      <Section title="ANTICIPO">
        <Field label="Porcentaje del anticipo (%)" value={advancePct} onChangeText={setAdvancePct} keyboardType="numeric" />
      </Section>

      {/* Descargue */}
      <Section title="DESCARGUE">
        <Field label="Valor por moto ($)" value={unloadPerMoto} onChangeText={setUnloadPerMoto} keyboardType="numeric" />
      </Section>

      {/* Concepto 10% */}
      <Section title="CONCEPTO DEL 10%">
        <View style={s.switchRow}>
          <Text style={s.label}>Activar concepto del 10%</Text>
          <Switch value={tenEnabled} onValueChange={setTenEnabled} />
        </View>

        {tenEnabled && (
          <>
            <Field label="Nombre del concepto" value={tenLabel} onChangeText={setTenLabel} />
            <Field label="Porcentaje (%)" value={tenValue} onChangeText={setTenValue} keyboardType="numeric" />
          </>
        )}
      </Section>

      {/* Botón guardar */}
      <Pressable style={[s.button, saving && s.buttonDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={s.buttonText}>{saving ? 'Guardando...' : 'GUARDAR CONFIGURACIÓN'}</Text>
      </Pressable>

      {/* Logout */}
      <Pressable style={s.logoutButton} onPress={handleLogout}>
        <Text style={s.logoutText}>Cerrar Sesión</Text>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Field({ label, value, onChangeText, keyboardType = 'default' }: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'numeric';
}) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  section: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#6b7280', letterSpacing: 0.5, textTransform: 'uppercase' },
  label: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 8 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    fontSize: 16,
    color: '#111827',
  },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  choice: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  choiceActive: { backgroundColor: '#2563eb' },
  choiceText: { color: '#374151', fontWeight: '600' },
  choiceTextActive: { color: 'white', fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  email: { fontSize: 14, color: '#111827', marginTop: 4 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  logoutText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});