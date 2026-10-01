import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ExpensesRepository } from "../../src/db/repositories/expenses.repo";
import { getDatabase } from "../../src/db/connection";
import { useAuthStore } from "../../src/stores/auth.store";
import { useExpenseCategories } from "../../src/hooks/useExpenseCategories";

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
  const router = useRouter();
  const { categories, loading } = useExpenseCategories();

  // Filtrar solo categorías generales (is_trip_expense = 0)
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
      Alert.alert("Permiso denegado",
        "Necesitamos acceso a la cámara para tomar fotos de los recibos.");
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
    if (!result.canceled && result.assets[0])
      setReceiptUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!selected) { Alert.alert("Error", "Selecciona una categoría."); return; }
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
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10 }}>Cargando categorías...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container}>
      <Text style={s.title}>Gasto General del Camión</Text>

      <Text style={s.label}>CATEGORÍA</Text>
      <View style={s.categoryRow}>
        {generalCategories.map((cat) => {
          const isActive = selected?._local_id === cat._local_id;
          const icon = CATEGORY_ICONS[cat.code] || "📦";
          return (
            <Pressable
              key={cat._local_id}
              style={[s.catButton, isActive && s.catButtonActive]}
              onPress={() => setSelectedLocalId(cat._local_id)}
            >
              <Text style={[s.catText, isActive && s.catTextActive]}>
                {icon} {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {generalCategories.length === 0 && (
        <Text style={s.empty}>No hay categorías generales todavía.</Text>
      )}

      <Text style={s.label}>VALOR ($)</Text>
      <TextInput style={s.input} value={amount} onChangeText={setAmount}
        keyboardType="numeric" placeholder="0" />

      <Text style={s.label}>DESCRIPCIÓN (Opcional)</Text>
      <TextInput style={s.input} value={description} onChangeText={setDescription}
        placeholder={selected ? `Ej: ${selected.label}` : "Ej: Cambio de aceite"} />

      <Text style={s.label}>KILOMETRAJE ACTUAL (Opcional)</Text>
      <TextInput style={s.input} value={mileage} onChangeText={setMileage}
        keyboardType="numeric" placeholder="Ej: 150400" />

      <Text style={s.label}>FOTO DEL RECIBO</Text>
      <View style={s.photoRow}>
        <Pressable style={s.photoButton} onPress={takePhoto}>
          <Text style={s.photoButtonText}>📷 Tomar Foto</Text>
        </Pressable>
        <Pressable style={s.photoButton} onPress={pickImage}>
          <Text style={s.photoButtonText}>🖼️ Galería</Text>
        </Pressable>
      </View>
      {receiptUri && (
        <View style={s.photoPreview}>
          <Text style={{ color: "#059669", fontWeight: "600" }}>✅ Foto seleccionada</Text>
        </View>
      )}

      <Pressable style={[s.button, saving && s.buttonDisabled]} onPress={handleSave} disabled={saving}>
        <Text style={s.buttonText}>{saving ? "Guardando..." : "GUARDAR GASTO"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827", marginBottom: 20 },
  label: { fontSize: 11, color: "#6b7280", fontWeight: "600", marginTop: 16, letterSpacing: 0.5 },
  input: {
    backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
    marginTop: 4, fontSize: 16, color: "#111827", borderWidth: 1, borderColor: "#e5e7eb",
  },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  catButton: {
    minWidth: "46%", paddingVertical: 12, borderRadius: 8, alignItems: "center",
    backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb",
  },
  catButtonActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  catText: { color: "#374151", fontSize: 13, fontWeight: "600", textAlign: "center" },
  catTextActive: { color: "white" },
  empty: { color: "#9ca3af", fontSize: 13, marginTop: 8, fontStyle: "italic" },
  photoRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  photoButton: {
    flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center",
    backgroundColor: "#e0e7ff", borderWidth: 1, borderColor: "#c7d2fe",
  },
  photoButtonText: { color: "#3730a3", fontWeight: "600" },
  photoPreview: { marginTop: 12, padding: 12, backgroundColor: "#ecfdf5", borderRadius: 8, alignItems: "center" },
  button: { backgroundColor: "#2563eb", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 32, marginBottom: 16 },
  buttonDisabled: { backgroundColor: "#93c5fd" },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});