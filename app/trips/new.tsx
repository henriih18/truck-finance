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
import { useTripsRepo } from "../../src/hooks/useTripsRepo";
import { useSettings } from "../../src/hooks/useSettings";
   import { useAuthStore } from '../../src/stores/auth.store';


export default function NewTrip() {
  const router = useRouter();
  const repo = useTripsRepo();
 const settings = useSettings();

  const [client, setClient] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [motoQty, setMotoQty] = useState("");
  const [grossFreight, setGrossFreight] = useState("");
  const [tieDeducted, setTieDeducted] = useState(true);

  const gf = Number(grossFreight) || 0;
  const mq = Number(motoQty) || 0;

  // Muestra cargando mientras se inicializa el repositorio
  if (!repo) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2563eb" />
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
             userId: useAuthStore.getState().user?.id || 'local-user',
          tripNumber,
          date: new Date().toISOString().slice(0, 10),
          client,
          origin,
          destination,
          motoQty: mq,
          grossFreight: gf,
          tieDeducted,
        },
        settings,
      );
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo guardar el viaje");
    }
  };

  return (
    <ScrollView style={s.container}>
      <Text style={s.title}>Nuevo viaje</Text>

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

      <Pressable style={s.button} onPress={submit}>
        <Text style={s.buttonText}>GUARDAR VIAJE</Text>
      </Pressable>
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
  choiceActive: { backgroundColor: "#2563eb" },
  choiceText: { color: "#111827" },
  choiceTextActive: { color: "white", fontWeight: "bold" },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
