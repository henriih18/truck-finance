import React, { useState } from "react";
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
import type { TruckRow } from "../../src/db/repositories/trucks.repo";

export default function NewTrip() {
  const router = useRouter();
  const repo = useTripsRepo();
  const settings = useSettings();
  const { trucks } = useTrucks();

  const [client, setClient] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [motoQty, setMotoQty] = useState("");
  const [grossFreight, setGrossFreight] = useState("");
  const [tieDeducted, setTieDeducted] = useState(true);
  const [truckId, setTruckId] = useState<string | null>(null);
  const [truckPickerVisible, setTruckPickerVisible] = useState(false);
  const [initialMileage, setInitialMileage] = useState("");

  const selectedTruck = trucks.find((t) => t._local_id === truckId) ?? null;

  const gf = Number(grossFreight) || 0;
  const mq = Number(motoQty) || 0;

  // Cuando se selecciona un camión, sugerir su kilometraje actual como inicial
  // (solo si el campo está vacío o si cambia el camión seleccionado)
  const truckMileage = selectedTruck?.mileage ?? null;
  const lastTruckIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (truckId !== lastTruckIdRef.current) {
      lastTruckIdRef.current = truckId;
      if (truckMileage != null) {
        setInitialMileage(String(truckMileage));
      }
    }
  }, [truckId, truckMileage]);

  if (!repo) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={{ marginTop: 10, color: "#6b7280" }}>
          Preparando formulario...
        </Text>
      </View>
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
    <ScrollView style={s.container}>
      <Text style={s.title}>Nuevo viaje</Text>

      {/* Selector de camión */}
      <Text style={s.label}>CAMIÓN</Text>
      <Pressable
        style={[s.input, s.truckSelector]}
        onPress={() => setTruckPickerVisible(true)}
      >
        {selectedTruck ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={s.truckPlateChip}>{selectedTruck.plate}</Text>
            <Text style={s.truckSelectorSub}>
              {[selectedTruck.brand, selectedTruck.model, selectedTruck.year]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        ) : (
          <Text style={s.placeholder}>Seleccionar camión (opcional)</Text>
        )}
        <Text style={s.truckSelectorArrow}>▾</Text>
      </Pressable>

      <Text style={s.label}>CLIENTE / EMPRESA</Text>
      <TextInput
        style={s.input}
        value={client}
        onChangeText={setClient}
        placeholder="Ej: Empresa XYZ"
      />

      <Text style={s.label}>ORIGEN</Text>
      <TextInput
        style={s.input}
        value={origin}
        onChangeText={setOrigin}
        placeholder="Ej: Armenia"
      />

      <Text style={s.label}>DESTINO</Text>
      <TextInput
        style={s.input}
        value={destination}
        onChangeText={setDestination}
        placeholder="Ej: Bogotá"
      />

      <Text style={s.label}>CANTIDAD DE MOTOS</Text>
      <TextInput
        style={s.input}
        value={motoQty}
        onChangeText={setMotoQty}
        keyboardType="numeric"
        placeholder="0"
      />

      <Text style={s.label}>FLETE TOTAL</Text>
      <TextInput
        style={s.input}
        value={grossFreight}
        onChangeText={setGrossFreight}
        keyboardType="numeric"
        placeholder="0"
      />

      <Text style={s.label}>¿EL AMARRE SE DESCUENTA DEL FLETE?</Text>
      <View style={s.row}>
        <Pressable
          style={[s.choice, tieDeducted && s.choiceActive]}
          onPress={() => setTieDeducted(true)}
        >
          <Text style={tieDeducted ? s.choiceTextActive : s.choiceText}>
            Sí
          </Text>
        </Pressable>
        <Pressable
          style={[s.choice, !tieDeducted && s.choiceActive]}
          onPress={() => setTieDeducted(false)}
        >
          <Text style={!tieDeducted ? s.choiceTextActive : s.choiceText}>
            No
          </Text>
        </Pressable>
      </View>

      <Text style={s.label}>KILOMETRAJE INICIAL (opcional)</Text>
      <TextInput
        style={s.input}
        value={initialMileage}
        onChangeText={setInitialMileage}
        keyboardType="numeric"
        placeholder="0"
      />
      {selectedTruck?.mileage != null && (
        <Text style={s.hint}>
          🚛 Kilometraje actual del camión:{" "}
          {selectedTruck.mileage.toLocaleString("es-CO")} km
        </Text>
      )}

      <Pressable style={s.button} onPress={submit}>
        <Text style={s.buttonText}>GUARDAR VIAJE</Text>
      </Pressable>

      {/* Modal picker de camiones */}
      <Modal visible={truckPickerVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Selecciona un camión</Text>
              <Pressable
                onPress={() => {
                  setTruckId(null);
                  setTruckPickerVisible(false);
                }}
              >
                <Text style={s.clearText}>Quitar</Text>
              </Pressable>
            </View>

            {trucks.length === 0 ? (
              <View style={s.emptyPicker}>
                <Text style={s.emptyPickerText}>
                  No tienes camiones registrados.
                </Text>
                <Pressable
                  style={s.goToTrucksBtn}
                  onPress={() => {
                    setTruckPickerVisible(false);
                    router.push("/trucks");
                  }}
                >
                  <Text style={s.goToTrucksText}>Ir a Mis Camiones</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={trucks}
                keyExtractor={(t) => t._local_id}
                renderItem={({ item }) => (
                  <Pressable
                    style={[
                      s.truckOption,
                      item._local_id === truckId && s.truckOptionActive,
                    ]}
                    onPress={() => pickTruck(item)}
                  >
                    <Text style={s.truckPlate}>{item.plate}</Text>
                    <Text style={s.truckSub}>
                      {[item.brand, item.model, item.year]
                        .filter(Boolean)
                        .join(" · ") || "Sin detalles"}
                    </Text>
                  </Pressable>
                )}
              />
            )}

            <Pressable
              style={s.closePickerBtn}
              onPress={() => setTruckPickerVisible(false)}
            >
              <Text style={s.closePickerText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#111827",
  },
  label: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 4,
    fontSize: 16,
    color: "#111827",
  },
  row: { flexDirection: "row", gap: 8, marginTop: 8 },
  choice: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#e5e7eb",
  },
  choiceActive: { backgroundColor: "#059669" },
  choiceText: { color: "#111827" },
  choiceTextActive: { color: "white", fontWeight: "bold" },
  hint: { fontSize: 11, color: "#6b7280", marginTop: 4, marginLeft: 2 },
  button: {
    backgroundColor: "#059669",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  // Selector de camión
  truckSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  truckPlateChip: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 14,
    letterSpacing: 1,
  },
  truckSelectorSub: { fontSize: 12, color: "#6b7280" },
  truckSelectorArrow: { color: "#9ca3af", fontSize: 16 },
  placeholder: { color: "#9ca3af", fontSize: 16 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  clearText: { color: "#dc2626", fontWeight: "600" },
  emptyPicker: { paddingVertical: 24, alignItems: "center" },
  emptyPickerText: { color: "#6b7280", marginBottom: 12 },
  goToTrucksBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  goToTrucksText: { color: "white", fontWeight: "600" },
  truckOption: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    marginBottom: 8,
  },
  truckOptionActive: {
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#059669",
  },
  truckPlate: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    letterSpacing: 1,
  },
  truckSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  closePickerBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
  },
  closePickerText: { color: "#374151", fontWeight: "600" },
});
