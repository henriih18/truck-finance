import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { Link } from "expo-router";
import { useTrips } from "../../src/hooks/useTrips";
import { useTripsRepo } from "../../src/hooks/useTripsRepo";

export default function Receivable() {
  const allTrips = useTrips();
  const repo = useTripsRepo();

  // Filtrar solo viajes finalizados y con el cumplido pendiente
  const receivableTrips = allTrips.filter(
    (t) => t.status === "finished" && t.balance_status === "pending",
  );

  // Calcular el total a cobrar
  const totalReceivable = receivableTrips.reduce(
    (sum, t) => sum + t.balance,
    0,
  );

  // Función para calcular días pendientes (usamos updated_at como referencia de finalización)
  const getDaysPending = (dateString: string) => {
    if (!dateString) return 0;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleMarkPaid = async (
    tripId: string,
    tripNumber: string,
    amount: number,
  ) => {
    if (!repo) return;

    Alert.alert(
      "Registrar Pago",
      `¿Confirmas que recibiste $${amount.toLocaleString("es-CO")} del viaje #${tripNumber}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, marcar pagado",
          style: "default",
          onPress: async () => {
            await repo.markBalancePaid(
              tripId,
              amount,
              new Date().toISOString(),
            );
            // El hook useTrips se actualizará solo en 2 segundos y quitará el viaje de esta lista
          },
        },
      ],
    );
  };

  if (!repo) {
    return (
      <View style={s.center}>
        <Text style={{ color: "#6b7280" }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Por Cobrar</Text>
      </View>

      <View style={s.totalCard}>
        <Text style={s.totalLabel}>TOTAL PENDIENTE</Text>
        <Text style={s.totalValue}>
          ${totalReceivable.toLocaleString("es-CO")}
        </Text>
        <Text style={s.totalSub}>
          {receivableTrips.length} viajes por cobrar
        </Text>
      </View>

      <FlatList
        data={receivableTrips}
        keyExtractor={(t) => t._local_id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const days = getDaysPending(item._updated_at);
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.tripNumber}>Viaje #{item.trip_number}</Text>
                <Text style={s.daysPending}>🔴 {days} días pendiente</Text>
              </View>

              <Text style={s.route}>
                {item.origin} → {item.destination}
              </Text>
              <Text style={s.client}>{item.client}</Text>

              <View style={s.amountRow}>
                <Text style={s.amountLabel}>Cumplido (30%):</Text>
                <Text style={s.amountValue}>
                  ${item.balance.toLocaleString("es-CO")}
                </Text>
              </View>

              <View style={s.actions}>
                <Link href={`/trips/${item._local_id}`} asChild>
                  <Pressable style={s.btnDetail}>
                    <Text style={s.btnDetailText}>Ver Detalle</Text>
                  </Pressable>
                </Link>
                <Pressable
                  style={s.btnPay}
                  onPress={() =>
                    handleMarkPaid(
                      item._local_id,
                      item.trip_number,
                      item.balance,
                    )
                  }
                >
                  <Text style={s.btnPayText}>Marcar Pagado</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>🎉</Text>
            <Text style={s.emptyText}>¡Todo al día!</Text>
            <Text style={s.emptySub}>No hay viajes pendientes por cobrar.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  totalCard: {
    backgroundColor: "#dc2626",
    padding: 20,
    margin: 16,
    borderRadius: 16,
  },
  totalLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  totalValue: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 4,
  },
  totalSub: { color: "rgba(255,255,255,0.9)", fontSize: 14, marginTop: 4 },
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tripNumber: { fontSize: 16, fontWeight: "bold", color: "#111827" },
  daysPending: { fontSize: 12, color: "#dc2626", fontWeight: "600" },
  route: { color: "#4b5563", fontSize: 14 },
  client: { color: "#6b7280", fontSize: 13, marginTop: 2, marginBottom: 12 },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  amountLabel: { color: "#4b5563", fontWeight: "600" },
  amountValue: { color: "#111827", fontWeight: "bold", fontSize: 16 },
  actions: { flexDirection: "row", gap: 10 },
  btnDetail: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#e5e7eb",
  },
  btnDetailText: { color: "#374151", fontWeight: "600" },
  btnPay: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#059669",
  },
  btnPayText: { color: "white", fontWeight: "bold" },
  emptyState: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  emptySub: { color: "#6b7280", marginTop: 4 },
});
