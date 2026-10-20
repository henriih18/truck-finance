import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { useTripsRepo } from "../../src/hooks/useTripsRepo";
import { useSettings } from "../../src/hooks/useSettings";
import { useTrucks } from "../../src/hooks/useTrucks";
import { useAuthStore } from "../../src/stores/auth.store";
import { useTheme } from "../../src/theme/ThemeContext";
import {
  Screen,
  ScreenHeader,
  Card,
  SectionTitle,
  PrimaryButton,
  spacing,
  typography,
} from "../../src/ui/components";
import type { TruckRow } from "../../src/db/repositories/trucks.repo";

export default function NewTrip() {
  const router = useRouter();
  const { colors } = useTheme();
  const repo = useTripsRepo();
  const settings = useSettings();
  const { trucks } = useTrucks();

  const [client, setClient] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [motoQty, setMotoQty] = useState("");
  const [grossFreight, setGrossFreight] = useState("");
  const [tieDeducted, setTieDeducted] = useState(true);
  const [tieFixed, setTieFixed] = useState("");
  const [tiePerMoto, setTiePerMoto] = useState("");
  const [advancePct, setAdvancePct] = useState("");
  const [unloadPerMoto, setUnloadPerMoto] = useState("");
  const [truckId, setTruckId] = useState<string | null>(null);
  const [truckPickerVisible, setTruckPickerVisible] = useState(false);
  const [initialMileage, setInitialMileage] = useState("");

  const selectedTruck = trucks.find((t) => t._local_id === truckId) ?? null;

  const gf = Number(grossFreight) || 0;
  const mq = Number(motoQty) || 0;

  useEffect(() => {
    if (!settings) return;
    setTieDeducted(settings.tieMode === "deduct");
    setTieFixed(String(settings.tieFixed));
    setTiePerMoto(String(settings.tiePerMoto));
    setAdvancePct(String(settings.advancePct));
    setUnloadPerMoto(String(settings.unloadPerMoto));
  }, [settings]);

  const truckMileage = selectedTruck?.mileage ?? null;
  const lastTruckIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (truckId !== lastTruckIdRef.current) {
      lastTruckIdRef.current = truckId;
      if (truckMileage != null) setInitialMileage(String(truckMileage));
    }
  }, [truckId, truckMileage]);

  if (!repo) {
    return (
      <Screen>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textMuted }}>
            Preparando formulario...
          </Text>
        </View>
      </Screen>
    );
  }

  const submit = async () => {
    if (!client || !origin || !destination || gf <= 0 || mq <= 0) {
      Alert.alert(
        "Faltan datos",
        "Completa cliente, origen, destino, motos y flete.",
      );
      return;
    }
    try {
      const tripNumber = String(Date.now()).slice(-5).padStart(5, "0");
      await repo.create(
        {
          userId: useAuthStore.getState().user?.id || "local-user",
          truckId: truckId ?? undefined,
          tripNumber,
          date: new Date().toISOString().slice(0, 10),
          client,
          origin,
          destination,
          motoQty: mq,
          grossFreight: gf,
          tieDeducted,
          tieFixed: tieFixed ? Number(tieFixed) : undefined,
          tiePerMoto: tiePerMoto ? Number(tiePerMoto) : undefined,
          advancePct: advancePct ? Number(advancePct) : undefined,
          unloadPerMoto: unloadPerMoto ? Number(unloadPerMoto) : undefined,
          initialMileage: initialMileage ? Number(initialMileage) : undefined,
        },
        settings,
      );
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo guardar el viaje");
    }
  };

  const pickTruck = (t: TruckRow) => {
    setTruckId(t._local_id);
    setTruckPickerVisible(false);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Nuevo viaje"
        subtitle="Completa los datos del flete"
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* === SECCIÓN: Datos del viaje === */}
        <SectionTitle>Camión</SectionTitle>
        <Pressable
          style={({ pressed }) => [
            {
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 16,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => setTruckPickerVisible(true)}
        >
          {selectedTruck ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View
                style={{
                  backgroundColor: colors.primaryMuted,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "800",
                    fontSize: 13,
                    letterSpacing: 1,
                  }}
                >
                  {selectedTruck.plate}
                </Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                {[selectedTruck.brand, selectedTruck.model, selectedTruck.year]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 15 }}>
              Seleccionar camión (opcional)
            </Text>
          )}
          <Text style={{ color: colors.textMuted, fontSize: 18 }}>▾</Text>
        </Pressable>

        <SectionTitle>Cliente y ruta</SectionTitle>
        <Card>
          <Field
            label="Cliente / empresa"
            value={client}
            onChangeText={setClient}
            placeholder="Ej: Empresa XYZ"
          />
          <Field
            label="Origen"
            value={origin}
            onChangeText={setOrigin}
            placeholder="Ej: Armenia"
          />
          <Field
            label="Destino"
            value={destination}
            onChangeText={setDestination}
            placeholder="Ej: Bogotá"
          />
        </Card>

        {/* === SECCIÓN: Carga === */}
        <SectionTitle>Carga</SectionTitle>
        <Card>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Cant. de motos"
                value={motoQty}
                onChangeText={setMotoQty}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
            <View style={{ flex: 2 }}>
              <Field
                label="Flete total ($)"
                value={grossFreight}
                onChangeText={setGrossFreight}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>
        </Card>

        {/* === SECCIÓN: Amarre, anticipo, descargue === */}
        <SectionTitle>Configuración del viaje</SectionTitle>
        <Card>
          <Text style={s.fieldLabel}>¿Amarre se descuenta del flete?</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
            <ChoiceButton
              label="Sí, descontar"
              active={tieDeducted}
              onPress={() => setTieDeducted(true)}
            />
            <ChoiceButton
              label="No, cobrar por moto"
              active={!tieDeducted}
              onPress={() => setTieDeducted(false)}
            />
          </View>

          {tieDeducted ? (
            <Field
              label="Valor del amarre ($)"
              value={tieFixed}
              onChangeText={setTieFixed}
              keyboardType="numeric"
              placeholder="130000"
            />
          ) : (
            <Field
              label="Valor por moto ($)"
              value={tiePerMoto}
              onChangeText={setTiePerMoto}
              keyboardType="numeric"
              placeholder="4000"
            />
          )}

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Anticipo (%)"
                value={advancePct}
                onChangeText={setAdvancePct}
                keyboardType="numeric"
                placeholder="70"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Descargue/moto ($)"
                value={unloadPerMoto}
                onChangeText={setUnloadPerMoto}
                keyboardType="numeric"
                placeholder="3500"
              />
            </View>
          </View>
        </Card>

        {/* === SECCIÓN: Kilometraje === */}
        <SectionTitle>Kilometraje inicial (opcional)</SectionTitle>
        <Card>
          <Field
            label="Kilometraje inicial"
            value={initialMileage}
            onChangeText={setInitialMileage}
            keyboardType="numeric"
            placeholder="0"
          />
          {selectedTruck?.mileage != null && (
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 12,
                marginTop: 8,
              }}
            >
              🚛 Kilometraje actual del camión:{" "}
              {selectedTruck.mileage.toLocaleString("es-CO")} km
            </Text>
          )}
        </Card>

        <PrimaryButton label="GUARDAR VIAJE" icon="🚚" onPress={submit} />

        {/* Modal picker de camiones */}
        <Modal visible={truckPickerVisible} animationType="slide" transparent>
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "flex-end",
            }}
            onPress={() => setTruckPickerVisible(false)}
          >
            <View
              style={{
                backgroundColor: colors.background,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 20,
                maxHeight: "70%",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text style={[typography.h2, { color: colors.text }]}>
                  Selecciona un camión
                </Text>
                <Pressable
                  onPress={() => {
                    setTruckId(null);
                    setTruckPickerVisible(false);
                  }}
                >
                  <Text
                    style={{
                      color: colors.danger,
                      fontWeight: "700",
                      fontSize: 13,
                    }}
                  >
                    Quitar
                  </Text>
                </Pressable>
              </View>

              {trucks.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: "center" }}>
                  <Text style={{ color: colors.textMuted, marginBottom: 12 }}>
                    No tienes camiones registrados.
                  </Text>
                  <Pressable
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                    }}
                    onPress={() => {
                      setTruckPickerVisible(false);
                      router.push("/trucks");
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textOnPrimary,
                        fontWeight: "700",
                      }}
                    >
                      Ir a Mis Camiones
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <FlatList
                  data={trucks}
                  keyExtractor={(t) => t._local_id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={({ pressed }) => [
                        {
                          padding: 14,
                          borderRadius: 12,
                          backgroundColor:
                            item._local_id === truckId
                              ? colors.primaryMuted
                              : colors.surface,
                          borderWidth: 1,
                          borderColor:
                            item._local_id === truckId
                              ? colors.primary
                              : colors.border,
                          marginBottom: 8,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                      onPress={() => pickTruck(item)}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "800",
                          color: colors.text,
                          letterSpacing: 1,
                        }}
                      >
                        {item.plate}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textMuted,
                          marginTop: 2,
                        }}
                      >
                        {[item.brand, item.model, item.year]
                          .filter(Boolean)
                          .join(" · ") || "Sin detalles"}
                      </Text>
                    </Pressable>
                  )}
                />
              )}

              <Pressable
                style={{
                  marginTop: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: 12,
                }}
                onPress={() => setTruckPickerVisible(false)}
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontWeight: "700",
                  }}
                >
                  Cerrar
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
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
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric";
  placeholder?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={s.fieldLabel}>{label}</Text>
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
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function ChoiceButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: "center",
          backgroundColor: active ? colors.primary : colors.surfaceMuted,
          borderWidth: 1,
          borderColor: active ? colors.primary : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: active ? colors.textOnPrimary : colors.textSecondary,
          fontSize: 13,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  fieldLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
