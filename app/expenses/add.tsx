import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ExpensesRepository } from "../../src/db/repositories/expenses.repo";
import { getDatabase } from "../../src/db/connection";
import { useAuthStore } from "../../src/stores/auth.store";
import { useExpenseCategories } from "../../src/hooks/useExpenseCategories";
import { useTheme } from "../../src/theme/ThemeContext";
import {
  Screen,
  ScreenHeader,
  Card,
  SectionTitle,
  PrimaryButton,
} from "../../src/ui/components";

// Mapa de iconos por código (fallback visual)
const CATEGORY_ICONS: Record<string, string> = {
  MANTENIMIENTO: "🔧",
  ACEITE: "🛢️",
  LLANTAS: "🛞",
  REPARACION: "🛠️",
  IMPUESTOS: "📄",
  SEGUROS: "🛡️",
  LAVADO: "🚿",
  OTRO: "📦",
};

export default function AddGeneralExpense() {
  const { colors } = useTheme();
  const router = useRouter();
  const { categories, loading } = useExpenseCategories();

  const generalCategories = categories.filter((c) => c.is_trip_expense === 0);

  const [selectedLocalId, setSelectedLocalId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [mileage, setMileage] = useState("");
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected =
    generalCategories.find((c) => c._local_id === selectedLocalId) ??
    generalCategories[0] ??
    null;

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Necesitamos acceso a la cámara para tomar fotos de los recibos.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!selected) {
      Alert.alert("Error", "Selecciona una categoría.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      Alert.alert("Error", "Ingresa un valor válido para el gasto.");
      return;
    }

    setSaving(true);
    try {
      const db = await getDatabase();
      const expensesRepo = new ExpensesRepository(db);

      await expensesRepo.create({
        userId: useAuthStore.getState().user?.id || "local-user",
        tripId: undefined,
        categoryId: selected._local_id,
        categoryCode: selected.code,
        description: description || selected.label,
        amount: Number(amount),
        date: new Date().toISOString().slice(0, 10),
        mileage: mileage ? Number(mileage) : undefined,
        receiptLocal: receiptUri || undefined,
      });

      Alert.alert("Éxito", "Gasto general registrado correctamente");
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message || "No se pudo guardar el gasto");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <ScreenHeader title="Nuevo gasto" subtitle="Gasto general del camión" />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textMuted }}>
            Cargando categorías...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Nuevo gasto" subtitle="Gasto general del camión" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* === Categoría === */}
        <SectionTitle>Categoría</SectionTitle>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {generalCategories.map((cat) => {
            const isActive = selected?._local_id === cat._local_id;
            const icon = CATEGORY_ICONS[cat.code] || "📦";
            return (
              <Pressable
                key={cat._local_id}
                style={({ pressed }) => [
                  {
                    flexGrow: 1,
                    minWidth: "46%",
                    paddingVertical: 12,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: isActive
                      ? colors.primary
                      : colors.surfaceMuted,
                    borderWidth: 1,
                    borderColor: isActive ? colors.primary : colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => setSelectedLocalId(cat._local_id)}
              >
                <Text style={{ fontSize: 18 }}>{icon}</Text>
                <Text
                  style={{
                    color: isActive
                      ? colors.textOnPrimary
                      : colors.textSecondary,
                    fontSize: 13,
                    fontWeight: "700",
                    textAlign: "center",
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {generalCategories.length === 0 && (
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 13,
              marginTop: 12,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            No hay categorías generales todavía.
          </Text>
        )}

        {/* === Detalle del gasto === */}
        <SectionTitle>Detalle del gasto</SectionTitle>
        <Card>
          <Field
            label="Valor ($)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
          />
          <Field
            label="Descripción (opcional)"
            value={description}
            onChangeText={setDescription}
            placeholder={
              selected ? `Ej: ${selected.label}` : "Ej: Cambio de aceite"
            }
          />
          <Field
            label="Kilometraje actual (opcional)"
            value={mileage}
            onChangeText={setMileage}
            keyboardType="numeric"
            placeholder="Ej: 150400"
          />
        </Card>

        {/* === Foto del recibo === */}
        <SectionTitle>Foto del recibo (opcional)</SectionTitle>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            style={({ pressed }) => [
              {
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
                backgroundColor: colors.surfaceMuted,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={takePhoto}
          >
            <Text style={{ fontSize: 18 }}>📷</Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              Cámara
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              {
                flex: 1,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
                backgroundColor: colors.surfaceMuted,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={pickImage}
          >
            <Text style={{ fontSize: 18 }}>🖼️</Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              Galería
            </Text>
          </Pressable>
        </View>

        {receiptUri && (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              backgroundColor: colors.primaryMuted,
              borderRadius: 10,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>
              ✅ Foto seleccionada
            </Text>
          </View>
        )}

        <PrimaryButton
          label={saving ? "GUARDANDO..." : "GUARDAR GASTO"}
          icon="💾"
          onPress={handleSave}
          loading={saving}
        />
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
