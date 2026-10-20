import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSettings, useUpdateSettings } from "../../src/hooks/useSettings";
import { useAuthStore } from "../../src/stores/auth.store";
import { useRouter } from "expo-router";
import { useTheme } from "../../src/theme/ThemeContext";
import type { ThemeMode } from "../../src/theme/colors";
import { SyncIndicator } from "../../src/ui/SyncIndicator";
import {
  Screen,
  ScreenHeader,
  Card,
  SectionTitle,
  PrimaryButton,
  spacing,
  typography,
} from "../../src/ui/components";

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { signOut, user } = useAuthStore();
  const router = useRouter();
  const settings = useSettings();
  const updateSettings = useUpdateSettings();
  const { mode, setMode } = useTheme();

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
      <Screen>
        <ScreenHeader title="Configuración" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textMuted }}>
            Cargando configuración...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Configuración"
        subtitle="Personaliza tu app y reglas financieras"
        right={<SyncIndicator />}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* Usuario */}
        <SectionTitle>Usuario</SectionTitle>
        <Card>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                backgroundColor: colors.primaryMuted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 20 }}>👤</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 11,
                  fontWeight: "700",
                  textTransform: "uppercase",
                }}
              >
                Conectado como
              </Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: "700",
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {user?.email || "No identificado"}
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 12,
                padding: 12,
                gap: 12,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => router.push("/trucks" as any)}
          >
            <Text style={{ fontSize: 22 }}>🚛</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                Mis Camiones
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                Gestiona placas, marcas y kilometraje
              </Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 22 }}>›</Text>
          </Pressable>
        </Card>

        {/* Apariencia */}
        <SectionTitle>Apariencia</SectionTitle>
        <Card>
          <Text
            style={{
              fontSize: 11,
              color: colors.textMuted,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Modo de tema
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            {(["light", "dark", "system"] as ThemeMode[]).map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: "center",
                      backgroundColor: active
                        ? colors.primary
                        : colors.surfaceMuted,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => setMode(m)}
                >
                  <Text
                    style={{
                      color: active
                        ? colors.textOnPrimary
                        : colors.textSecondary,
                      fontSize: 12,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {m === "light"
                      ? "☀️ Claro"
                      : m === "dark"
                        ? "🌙 Oscuro"
                        : "🔄 Sistema"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Retenciones */}
        <SectionTitle>Retenciones del flete (%)</SectionTitle>
        <Card>
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
        </Card>

        {/* Amarre */}
        <SectionTitle>Amarre · default para nuevos viajes</SectionTitle>
        <Card>
          <Text style={fieldLabelStyle(colors)}>¿Cómo se cobra el amarre?</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            {[
              { id: "deduct" as const, label: "Descuento fijo" },
              { id: "charge_per_moto" as const, label: "Por moto" },
            ].map((opt) => {
              const active = tieMode === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: "center",
                      backgroundColor: active
                        ? colors.primary
                        : colors.surfaceMuted,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => setTieMode(opt.id)}
                >
                  <Text
                    style={{
                      color: active
                        ? colors.textOnPrimary
                        : colors.textSecondary,
                      fontSize: 12,
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
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
        </Card>

        {/* Anticipo */}
        <SectionTitle>Anticipo · default para nuevos viajes</SectionTitle>
        <Card>
          <Field
            label="Porcentaje del anticipo (%)"
            value={advancePct}
            onChangeText={setAdvancePct}
            keyboardType="numeric"
          />
        </Card>

        {/* Descargue */}
        <SectionTitle>Descargue · default para nuevos viajes</SectionTitle>
        <Card>
          <Field
            label="Valor por moto ($)"
            value={unloadPerMoto}
            onChangeText={setUnloadPerMoto}
            keyboardType="numeric"
          />
        </Card>

        {/* Concepto 10% */}
        <SectionTitle>Concepto del 10%</SectionTitle>
        <Card>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingVertical: 4,
            }}
          >
            <Text style={fieldLabelStyle(colors)}>
              Activar concepto del 10%
            </Text>
            <Switch
              value={tenEnabled}
              onValueChange={setTenEnabled}
              trackColor={{
                false: colors.surfaceMuted,
                true: colors.primary,
              }}
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

              <Text style={fieldLabelStyle(colors, 12)}>Base de cálculo</Text>
              <ChoiceRow
                options={[
                  { id: "gross_freight" as const, label: "Flete total" },
                  { id: "net_freight" as const, label: "Flete neto" },
                ]}
                value={tenBase}
                onChange={setTenBase}
              />

              <Text style={fieldLabelStyle(colors, 12)}>Tipo</Text>
              <ChoiceRow
                options={[
                  { id: "discount" as const, label: "Descuento" },
                  { id: "expense" as const, label: "Gasto del viaje" },
                ]}
                value={tenKind}
                onChange={setTenKind}
              />

              <Text style={fieldLabelStyle(colors, 12)}>Afecta a</Text>
              <ChoiceRow
                options={[
                  { id: "freight" as const, label: "Flete" },
                  { id: "advance" as const, label: "Anticipo" },
                ]}
                value={tenAffects}
                onChange={setTenAffects}
              />

              <View
                style={{
                  backgroundColor: colors.primaryMuted,
                  borderRadius: 8,
                  padding: 10,
                  marginTop: 12,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {tenKind === "discount"
                    ? tenAffects === "freight"
                      ? "Se descuenta del flete → reduce el flete neto"
                      : "Se descuenta del anticipo → reduce el anticipo recibido"
                    : "Se registra como gasto del viaje (pagado con el anticipo)"}
                </Text>
              </View>
            </>
          )}
        </Card>

        <PrimaryButton
          label={saving ? "GUARDANDO..." : "GUARDAR CONFIGURACIÓN"}
          icon="💾"
          onPress={handleSave}
          loading={saving}
        />

        <Pressable
          style={({ pressed }) => [
            {
              backgroundColor: colors.danger,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 16,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={handleLogout}
        >
          <Text
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: "800",
            }}
          >
            🚪 CERRAR SESIÓN
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
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
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={fieldLabelStyle(colors)}>{label}</Text>
      <TextInput
        style={{
          backgroundColor: colors.surfaceMuted,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
          marginTop: 4,
          fontSize: 16,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
        }}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            style={({ pressed }) => [
              {
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: active ? colors.primary : colors.surfaceMuted,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={() => onChange(opt.id)}
          >
            <Text
              style={{
                color: active ? colors.textOnPrimary : colors.textSecondary,
                fontSize: 12,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function fieldLabelStyle(
  colors: ReturnType<typeof useTheme>["colors"],
  marginTop = 8,
) {
  return {
    fontSize: 11 as const,
    color: colors.textMuted,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginTop,
  };
}
