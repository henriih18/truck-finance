import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { syncStore } from "../sync/sync.store";
import { useSyncExternalStore } from "react";
import { getSyncService } from "../sync/init";

const subscribe = (cb: () => void) => syncStore.subscribe(cb);
const getSnapshot = () => syncStore.getState();

export function SyncIndicator() {
  const { online, syncing, pendingCount } = useSyncExternalStore(
    subscribe,
    getSnapshot,
  );

  let color = "#dc2626";
  let label = "Sin conexión";
  let bgColor = "#fee2e2";

  if (online) {
    if (syncing) {
      color = "#eab308";
      bgColor = "#fef9c3";
      label = "Sincronizando...";
    } else if (pendingCount > 0) {
      color = "#eab308";
      bgColor = "#fef9c3";
      label = `${pendingCount} pendientes`;
    } else {
      color = "#16a34a";
      bgColor = "#dcfce7";
      label = "Sincronizado";
    }
  }

  const handlePress = async () => {
    if (!online) {
      Alert.alert(
        "Sin conexión",
        "Trabajando sin conexión. Los cambios se sincronizarán cuando vuelva Internet.",
      );
      return;
    }
    try {
      const syncSvc = getSyncService();
      if (!syncSvc) {
        Alert.alert("Error", "Servicio de sincronización no disponible.");
        return;
      }
      await syncSvc.syncAll();
      const { pendingCount: pending } = syncStore.getState();
      if (pending === 0) {
        Alert.alert("✅ Sincronización completada", "Todo sincronizado.");
      } else {
        Alert.alert(
          "⚠️ Sincronización parcial",
          `Quedan ${pending} cambio(s) pendientes. Se reintentará automáticamente.`,
        );
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo sincronizar");
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[s.container, { backgroundColor: bgColor }]}
    >
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={[s.text, { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 11, fontWeight: "600" },
});
