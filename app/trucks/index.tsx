import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useTrucks } from "../../src/hooks/useTrucks";
import { useAuthStore } from "../../src/stores/auth.store";
import { useTheme } from "../../src/theme/ThemeContext";
import {
  Screen,
  ScreenHeader,
  Card,
  EmptyState,
  PrimaryButton,
  spacing,
  typography,
} from "../../src/ui/components";
import type { TruckRow } from "../../src/db/repositories/trucks.repo";

export default function TrucksScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { trucks, loading, create, update, remove } = useTrucks();
  const user = useAuthStore((s) => s.user);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<TruckRow | null>(null);

  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [notes, setNotes] = useState("");

  const openNew = () => {
    setEditing(null);
    setPlate("");
    setBrand("");
    setModel("");
    setYear("");
    setMileage("");
    setNotes("");
    setModalVisible(true);
  };

  const openEdit = (t: TruckRow) => {
    setEditing(t);
    setPlate(t.plate);
    setBrand(t.brand ?? "");
    setModel(t.model ?? "");
    setYear(t.year ? String(t.year) : "");
    setMileage(t.mileage ? String(t.mileage) : "");
    setNotes(t.notes ?? "");
    setModalVisible(true);
  };

  const save = async () => {
    if (!plate.trim()) {
      Alert.alert("Falta la placa", "La placa es obligatoria.");
      return;
    }
    try {
      const payload = {
        plate: plate.trim().toUpperCase(),
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        year: year ? Number(year) : undefined,
        mileage: mileage ? Number(mileage) : undefined,
        notes: notes.trim() || undefined,
      };
      if (editing) {
        await update(editing._local_id, payload);
      } else {
        await create({
          userId: user?.id ?? "local-user",
          ...payload,
          mileage: payload.mileage ?? 0,
        });
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo guardar");
    }
  };

  const confirmDelete = (t: TruckRow) => {
    Alert.alert("Eliminar camión", `¿Eliminar el camión ${t.plate}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(t._local_id);
          } catch (e: any) {
            Alert.alert("Error", e?.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Mis Camiones" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Mis Camiones"
        subtitle={`${trucks.length} camion${trucks.length === 1 ? "" : "es"}`}
        right={
          <Pressable
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={openNew}
          >
            <Text
              style={{
                color: colors.textOnPrimary,
                fontWeight: "800",
                fontSize: 13,
              }}
            >
              + Nuevo
            </Text>
          </Pressable>
        }
      />

      {trucks.length === 0 ? (
        <EmptyState
          icon="🚛"
          title="No tienes camiones registrados"
          subtitle="Agrega tu primer camión para asociarlo a los viajes."
          cta={
            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  borderRadius: 16,
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={openNew}
            >
              <Text
                style={{
                  color: colors.textOnPrimary,
                  fontWeight: "800",
                  fontSize: 14,
                }}
              >
                + Agregar camión
              </Text>
            </Pressable>
          }
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {trucks.map((t) => (
            <Pressable
              key={t._local_id}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              onPress={() => openEdit(t)}
              onLongPress={() => confirmDelete(t)}
            >
              <Card style={{ marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.primaryMuted,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 16,
                        fontWeight: "800",
                        letterSpacing: 1,
                      }}
                    >
                      {t.plate}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: colors.surfaceMuted,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 11,
                        fontWeight: "700",
                      }}
                    >
                      {t.mileage
                        ? `${t.mileage.toLocaleString("es-CO")} km`
                        : "Sin km"}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  {[t.brand, t.model, t.year].filter(Boolean).join(" · ") ||
                    "Sin detalles"}
                </Text>
                {t.notes && (
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 12,
                      marginTop: 4,
                      fontStyle: "italic",
                    }}
                    numberOfLines={2}
                  >
                    💬 {t.notes}
                  </Text>
                )}
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Modal de crear/editar camión */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: "90%",
            }}
          >
            <Text
              style={[
                typography.h2,
                { color: colors.text, marginBottom: 16 },
              ]}
            >
              {editing ? "Editar camión" : "Nuevo camión"}
            </Text>

            <ScrollView>
              <Field
                label="Placa *"
                value={plate}
                onChangeText={(t) => setPlate(t.toUpperCase())}
                placeholder="Ej: ABC123"
                autoCapitalize="characters"
              />
              <Field
                label="Marca"
                value={brand}
                onChangeText={setBrand}
                placeholder="Ej: Freightliner"
              />
              <Field
                label="Modelo"
                value={model}
                onChangeText={setModel}
                placeholder="Ej: Cascadia"
              />
              <Field
                label="Año"
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                placeholder="Ej: 2020"
              />
              <Field
                label="Kilometraje"
                value={mileage}
                onChangeText={setMileage}
                keyboardType="numeric"
                placeholder="0"
              />
              <Field
                label="Observaciones"
                value={notes}
                onChangeText={setNotes}
                placeholder="Notas internas..."
                multiline
              />

              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 20,
                  marginBottom: 8,
                }}
              >
                <Pressable
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: colors.surfaceMuted,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontWeight: "700",
                    }}
                  >
                    Cancelar
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={save}
                >
                  <Text
                    style={{
                      color: colors.textOnPrimary,
                      fontWeight: "800",
                    }}
                  >
                    Guardar
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
  autoCapitalize,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric";
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 8 }}>
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
          paddingVertical: 12,
          marginTop: 4,
          fontSize: 16,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: multiline ? 70 : 44,
          textAlignVertical: multiline ? "top" : "center",
        }}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
    </View>
  );
}
