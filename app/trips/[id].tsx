import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { useTripsRepo } from "../../src/hooks/useTripsRepo";
import type { TripRow } from "../../src/db/repositories/trips.repo";
import { ExpensesRepository } from "../../src/db/repositories/expenses.repo";
import { getDatabase } from "../../src/db/connection";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
} from "react-native";

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const repo = useTripsRepo();
  const [trip, setTrip] = useState<TripRow | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Efectivo");
  const [payNotes, setPayNotes] = useState("");

  useEffect(() => {
    if (!id || !repo) return;

    const loadData = async () => {
      try {
        const t = await repo.getById(id);
        setTrip(t);

        const db = await getDatabase();
        const expRepo = new ExpensesRepository(db);
        const expList = await expRepo.listByTrip(id);
        setExpenses(expList);

        const total = await expRepo.getTotalByTrip(id);
        setExpensesTotal(total);
      } catch (e) {
        console.error("Error cargando viaje:", e);
      }
    };

    loadData();

    // Recargar cada 2 segundos por si se agregó un gasto desde otra pantalla
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [id, repo]);

  if (!repo || !trip) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: "#6b7280" }}>
          Cargando datos del viaje...
        </Text>
      </View>
    );
  }

  const available = trip.advance - expensesTotal;

  const onFinish = async () => {
    Alert.alert("Finalizar viaje", "¿Confirmas que el viaje ha terminado?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Finalizar",
        onPress: async () => {
          await repo.finish(trip._local_id);
          const t = await repo.getById(trip._local_id);
          setTrip(t);
        },
      },
    ]);
  };

  const onMarkPaid = () => {
    setPayAmount(String(trip.balance));
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayMethod("Efectivo");
    setPayNotes("");
    setShowPayModal(true);
  };

  const handleConfirmPay = async () => {
    if (!payAmount || Number(payAmount) <= 0) {
      Alert.alert("Error", "Ingresa un valor válido.");
      return;
    }
    try {
      await repo.markBalancePaid(
        trip._local_id,
        Number(payAmount),
        payDate,
        payMethod,
        payNotes,
      );
      const t = await repo.getById(trip._local_id);
      setTrip(t);
      setShowPayModal(false);
      Alert.alert("Éxito", "Viaje marcado como Paz y Salvo");
    } catch (e) {
      Alert.alert("Error", "No se pudo registrar el pago");
    }
  };

  const getCategoryIcon = (code: string) => {
    switch (code) {
      case "COMBUSTIBLE":
        return "⛽";
      case "PEAJE":
        return "🛣️";
      case "DESCARGUE":
        return "📦";
      default:
        return "🔧";
    }
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Viaje #{trip.trip_number}</Text>
        <Text style={s.subtitle}>
          {trip.origin} → {trip.destination} · {trip.date}
        </Text>
      </View>

      <Section title="FLETE NETO">
        <Row
          label="Flete total"
          value={`$${trip.gross_freight.toLocaleString("es-CO")}`}
        />
        <Row
          label="Valor neto"
          value={`$${trip.net_freight.toLocaleString("es-CO")}`}
          bold
        />
      </Section>

      <Section title="ANTICIPO (70%)">
        <Row
          label="Recibido"
          value={`$${trip.advance.toLocaleString("es-CO")}`}
        />
      </Section>

      <Section title="GASTOS DEL VIAJE">
        <Row
          label="Total gastos"
          value={`$${expensesTotal.toLocaleString("es-CO")}`}
        />
        <Row
          label="Disponible"
          value={`$${available.toLocaleString("es-CO")}`}
          bold
        />

        <Link href={`/trips/${id}/add-expense`} asChild>
          <Pressable style={s.addExpenseButton}>
            <Text style={s.addExpenseText}>+ AGREGAR GASTO</Text>
          </Pressable>
        </Link>

        {expenses.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            {expenses.map((exp) => (
              <View key={exp._local_id} style={s.expenseItem}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text style={{ fontSize: 18 }}>
                    {getCategoryIcon(exp.category_code)}
                  </Text>
                  <View>
                    <Text style={s.expenseDesc}>
                      {exp.description || exp.category_code}
                    </Text>
                    <Text style={s.expenseDate}>
                      {exp.date} {exp.mileage ? `· Km: ${exp.mileage}` : ""}
                    </Text>
                  </View>
                </View>
                <Text style={s.expenseAmount}>
                  -${Number(exp.amount).toLocaleString("es-CO")}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: "#9ca3af", fontStyle: "italic", marginTop: 8 }}>
            Sin gastos registrados aún.
          </Text>
        )}
      </Section>

      <Section title="CUMPLIDO (30%)">
        <Row label="Valor" value={`$${trip.balance.toLocaleString("es-CO")}`} />
        <Row
          label="Estado"
          value={
            trip.balance_status === "paid" ? "🟢 Paz y salvo" : "🔴 Pendiente"
          }
          bold
        />
      </Section>

      {trip.status === "in_progress" && (
        <Pressable style={s.buttonOrange} onPress={onFinish}>
          <Text style={s.buttonText}>FINALIZAR VIAJE</Text>
        </Pressable>
      )}

      {trip.status === "finished" && trip.balance_status === "pending" && (
        <Pressable style={s.buttonGreen} onPress={onMarkPaid}>
          <Text style={s.buttonText}>MARCAR COMO PAZ Y SALVO</Text>
        </Pressable>
      )}

      <View style={{ height: 40 }} />
      {/* MODAL DE PAGO */}
      <Modal visible={showPayModal} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Registrar Pago del Cumplido</Text>

            <Text style={s.label}>FECHA DE PAGO</Text>
            <TextInput
              style={s.input}
              value={payDate}
              onChangeText={setPayDate}
            />

            <Text style={s.label}>VALOR RECIBIDO ($)</Text>
            <TextInput
              style={s.input}
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
            />

            <Text style={s.label}>MÉTODO DE PAGO</Text>
            <View style={s.methodRow}>
              {["Efectivo", "Transferencia", "Cheque"].map((m) => (
                <Pressable
                  key={m}
                  style={[s.methodBtn, payMethod === m && s.methodBtnActive]}
                  onPress={() => setPayMethod(m)}
                >
                  <Text
                    style={payMethod === m ? s.methodTextActive : s.methodText}
                  >
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.label}>OBSERVACIONES (Opcional)</Text>
            <TextInput
              style={[s.input, { height: 60, textAlignVertical: "top" }]}
              value={payNotes}
              onChangeText={setPayNotes}
              multiline
            />

            <View style={s.modalActions}>
              <Pressable
                style={s.cancelBtn}
                onPress={() => setShowPayModal(false)}
              >
                <Text style={s.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={s.confirmBtn} onPress={handleConfirmPay}>
                <Text style={s.confirmText}>Confirmar Pago</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, bold && s.boldText]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  subtitle: { color: "#6b7280", marginTop: 4 },
  section: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6b7280",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  rowLabel: { color: "#4b5563" },
  rowValue: { color: "#111827", fontWeight: "500" },
  boldText: { fontWeight: "bold", fontSize: 16 },
  addExpenseButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  addExpenseText: { color: "white", fontWeight: "bold", fontSize: 14 },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  expenseDesc: { color: "#111827", fontWeight: "600" },
  expenseDate: { color: "#6b7280", fontSize: 12 },
  expenseAmount: { color: "#dc2626", fontWeight: "bold" },
  buttonOrange: {
    backgroundColor: "#ea580c",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    margin: 16,
    marginTop: 24,
  },
  buttonGreen: {
    backgroundColor: "#059669",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    margin: 16,
    marginTop: 24,
  },
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
  methodRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  methodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
  },
  methodBtnActive: { backgroundColor: "#2563eb" },
  methodText: { color: "#4b5563", fontWeight: "600", fontSize: 12 },
  methodTextActive: { color: "white", fontWeight: "bold", fontSize: 12 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#e5e7eb",
  },
  cancelText: { color: "#374151", fontWeight: "bold" },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#059669",
  },
  confirmText: { color: "white", fontWeight: "bold" },
  label: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
    marginTop: 12,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
});
