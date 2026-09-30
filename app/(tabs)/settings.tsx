import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSettings, useUpdateSettings } from "../../src/hooks/useSettings";
import { useAuthStore } from "../../src/stores/auth.store";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeContext";
import type { ThemeMode } from "../../src/theme/colors";

export default function SettingsScreen() {
  const { signOut, user } = useAuthStore();
  const router = useRouter();
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const { mode, setMode, colors } = useTheme();

  const [sourceRet, setSourceRet] = useState("");
  const [icaRet, setIcaRet] = useState("");
  const [tieMode, setTieMode] = useState<"deduct" | "charge_per_moto">(
    "deduct",
  );
  const [tieFixed, setTieFixed] = useState("");
  const [tiePerMoto, setTiePerMoto] = useState("");
  const [advancePct, setAdvancePct] = useState("");
  const [unloadPerMoto, setUnloadPerMoto] = useState("");
  const [tenEnabled, setTenEnabled] = useState(false);
  const [tenLabel, setTenLabel] = useState("");
  const [tenValue, setTenValue] = useState("");
  const [tenBase, setTenBase] = useState<"gross_freight" | "net_freight">(
    "net_freight",
  );
  const [tenKind, setTenKind] = useState<"discount" | "expense">("discount");
  const [tenAffects, setTenAffects] = useState<"freight" | "advance">(
    "freight",
  );
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
      setTenBase(settings.tenPctBase);
      setTenKind(settings.tenPctKind);
      setTenAffects(settings.tenPctAffects);
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
        tenPctLabel: tenLabel || "Concepto 10%",
        tenPctValue: Number(tenValue) || 10.0,
        tenPctBase: tenBase,
        tenPctKind: tenKind,
        tenPctAffects: tenAffects,
      });
      Alert.alert("Éxito", "Configuración guardada correctamente");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro de que deseas salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, salir",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  if (!settings) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 10, color: colors.textMuted }}>
          Cargando configuración...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]}>
      <Text style={[s.title, { color: colors.text }]}>Configuración</Text>

      {/* Usuario */}
      <Section title="USUARIO">
        <Text style={[s.email, { color: colors.text }]}>
          {user?.email || "No identificado"}
        </Text>
        <Pressable
          style={[
            s.truckBtn,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          onPress={() => router.push("/trucks" as any)}
        >
          <Text style={s.truckBtnIcon}>🚛</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.truckBtnTitle, { color: colors.text }]}>
              Mis Camiones
            </Text>
            <Text style={[s.truckBtnSub, { color: colors.textMuted }]}>
              Gestiona placas, marcas y kilometraje
            </Text>
          </View>
          <Text style={[s.truckBtnArrow, { color: colors.textMuted }]}>›</Text>
        </Pressable>
      </Section>

      {/* Apariencia */}
      <Section title="APARIENCIA">
        <Text style={[s.label, { color: colors.textMuted }]}>Modo de tema</Text>
        <View style={s.row}>
          {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
            <Pressable
              key={m}
              style={[
                s.choice,
                { backgroundColor: colors.surfaceMuted },
                mode === m && { backgroundColor: colors.primary },
              ]}
              onPress={() => setMode(m)}
            >
              <Text
                style={[
                  s.choiceText,
                  { color: colors.textSecondary },
                  mode === m && s.choiceTextActive,
                ]}
              >
                {m === "light"
                  ? "☀️ Claro"
                  : m === "dark"
                    ? "🌙 Oscuro"
                    : "🔄 Sistema"}
              </Text>
            </Pressable>
          ))}
        </View>
      </Section>

      {/* Retenciones */}
      <Section title="RETENCIONES DEL FLETE (%)">
        <Field
          label="Retención en la fuente (%)"
          value={sourceRet}
          onChangeText={setSourceRet}
          keyboardType="numeric"
        />
        <Field
          label="Retención ICA (%)"
          value={icaRet}
          onChangeText={setIcaRet}
          keyboardType="numeric"
        />
      </Section>

      {/* Amarre */}
      <Section title="AMARRE">
        <Text style={s.label}>¿Cómo se cobra el amarre?</Text>
        <View style={s.row}>
          <Pressable
            style={[s.choice, tieMode === "deduct" && s.choiceActive]}
            onPress={() => setTieMode("deduct")}
          >
            <Text
              style={tieMode === "deduct" ? s.choiceTextActive : s.choiceText}
            >
              Descuento fijo
            </Text>
          </Pressable>
          <Pressable
            style={[s.choice, tieMode === "charge_per_moto" && s.choiceActive]}
            onPress={() => setTieMode("charge_per_moto")}
          >
            <Text
              style={
                tieMode === "charge_per_moto"
                  ? s.choiceTextActive
                  : s.choiceText
              }
            >
              Por moto
            </Text>
          </Pressable>
        </View>

        {tieMode === "deduct" ? (
          <Field
            label="Valor fijo del amarre ($)"
            value={tieFixed}
            onChangeText={setTieFixed}
            keyboardType="numeric"
          />
        ) : (
          <Field
            label="Valor por moto ($)"
            value={tiePerMoto}
            onChangeText={setTiePerMoto}
            keyboardType="numeric"
          />
        )}
      </Section>

      {/* Anticipo */}
      <Section title="ANTICIPO">
        <Field
          label="Porcentaje del anticipo (%)"
          value={advancePct}
          onChangeText={setAdvancePct}
          keyboardType="numeric"
        />
      </Section>

      {/* Descargue */}
      <Section title="DESCARGUE">
        <Field
          label="Valor por moto ($)"
          value={unloadPerMoto}
          onChangeText={setUnloadPerMoto}
          keyboardType="numeric"
        />
      </Section>

      {/* Concepto 10% */}
      <Section title="CONCEPTO DEL 10%">
        <View style={s.switchRow}>
          <Text style={[s.label, { color: colors.textMuted }]}>
            Activar concepto del 10%
          </Text>
          <Switch
            value={tenEnabled}
            onValueChange={setTenEnabled}
            trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
          />
        </View>

        {tenEnabled && (
          <>
            <Field
              label="Nombre del concepto"
              value={tenLabel}
              onChangeText={setTenLabel}
            />
            <Field
              label="Porcentaje (%)"
              value={tenValue}
              onChangeText={setTenValue}
              keyboardType="numeric"
            />

            {/* Base de cálculo */}
            <Text style={[s.label, { color: colors.textMuted }]}>
              Base de cálculo
            </Text>
            <View style={s.row}>
              <Pressable
                style={[
                  s.choice,
                  { backgroundColor: colors.surfaceMuted },
                  tenBase === "gross_freight" && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setTenBase("gross_freight")}
              >
                <Text
                  style={[
                    s.choiceText,
                    { color: colors.textSecondary },
                    tenBase === "gross_freight" && s.choiceTextActive,
                  ]}
                >
                  Flete total
                </Text>
              </Pressable>
              <Pressable
                style={[
                  s.choice,
                  { backgroundColor: colors.surfaceMuted },
                  tenBase === "net_freight" && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setTenBase("net_freight")}
              >
                <Text
                  style={[
                    s.choiceText,
                    { color: colors.textSecondary },
                    tenBase === "net_freight" && s.choiceTextActive,
                  ]}
                >
                  Flete neto
                </Text>
              </Pressable>
            </View>

            {/* Tipo: descuento o gasto */}
            <Text style={[s.label, { color: colors.textMuted }]}>Tipo</Text>
            <View style={s.row}>
              <Pressable
                style={[
                  s.choice,
                  { backgroundColor: colors.surfaceMuted },
                  tenKind === "discount" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setTenKind("discount")}
              >
                <Text
                  style={[
                    s.choiceText,
                    { color: colors.textSecondary },
                    tenKind === "discount" && s.choiceTextActive,
                  ]}
                >
                  Descuento
                </Text>
              </Pressable>
              <Pressable
                style={[
                  s.choice,
                  { backgroundColor: colors.surfaceMuted },
                  tenKind === "expense" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setTenKind("expense")}
              >
                <Text
                  style={[
                    s.choiceText,
                    { color: colors.textSecondary },
                    tenKind === "expense" && s.choiceTextActive,
                  ]}
                >
                  Gasto del viaje
                </Text>
              </Pressable>
            </View>

            {/* Afecta a: flete o anticipo */}
            <Text style={[s.label, { color: colors.textMuted }]}>Afecta a</Text>
            <View style={s.row}>
              <Pressable
                style={[
                  s.choice,
                  { backgroundColor: colors.surfaceMuted },
                  tenAffects === "freight" && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setTenAffects("freight")}
              >
                <Text
                  style={[
                    s.choiceText,
                    { color: colors.textSecondary },
                    tenAffects === "freight" && s.choiceTextActive,
                  ]}
                >
                  Flete
                </Text>
              </Pressable>
              <Pressable
                style={[
                  s.choice,
                  { backgroundColor: colors.surfaceMuted },
                  tenAffects === "advance" && {
                    backgroundColor: colors.primary,
                  },
                ]}
                onPress={() => setTenAffects("advance")}
              >
                <Text
                  style={[
                    s.choiceText,
                    { color: colors.textSecondary },
                    tenAffects === "advance" && s.choiceTextActive,
                  ]}
                >
                  Anticipo
                </Text>
              </Pressable>
            </View>

            {/* Resumen de la configuración */}
            <View
              style={[s.summaryBox, { backgroundColor: colors.primaryMuted }]}
            >
              <Text style={[s.summaryText, { color: colors.primary }]}>
                {tenKind === "discount"
                  ? tenAffects === "freight"
                    ? "Se descuenta del flete → reduce el flete neto"
                    : "Se descuenta del anticipo → reduce el anticipo recibido"
                  : "Se registra como gasto del viaje (pagado con el anticipo)"}
              </Text>
            </View>
          </>
        )}
      </Section>

      {/* Botón guardar */}
      <Pressable
        style={[
          s.button,
          { backgroundColor: saving ? colors.primaryMuted : colors.primary },
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={[s.buttonText, { color: colors.textOnPrimary }]}>
          {saving ? "Guardando..." : "GUARDAR CONFIGURACIÓN"}
        </Text>
      </Pressable>

      {/* Logout */}
      <Pressable
        style={[s.logoutButton, { backgroundColor: colors.danger }]}
        onPress={handleLogout}
      >
        <Text style={[s.logoutText, { color: colors.textOnPrimary }]}>
          Cerrar Sesión
        </Text>
      </Pressable>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={[s.section, { backgroundColor: colors.surface }]}>
      <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={[s.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[
          s.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  section: { borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  label: { fontSize: 11, fontWeight: "600", marginTop: 8 },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    fontSize: 16,
    borderWidth: 1,
  },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  choice: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  choiceText: { fontWeight: "600" },
  choiceTextActive: { color: "white", fontWeight: "bold" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  summaryBox: {
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  summaryText: { fontSize: 12, fontWeight: "600" },
  email: { fontSize: 14, marginTop: 4 },
  truckBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 12,
  },
  truckBtnIcon: { fontSize: 24 },
  truckBtnTitle: { fontSize: 15, fontWeight: "600" },
  truckBtnSub: { fontSize: 12, marginTop: 2 },
  truckBtnArrow: { fontSize: 22 },
  button: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: "bold" },
  logoutButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  logoutText: { fontSize: 16, fontWeight: "bold" },
});
