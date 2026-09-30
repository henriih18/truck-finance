import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter, Link } from "expo-router";
import { useTripsRepo } from "../../src/hooks/useTripsRepo";
import type { TripRow } from "../../src/db/repositories/trips.repo";
import { ExpensesRepository } from "../../src/db/repositories/expenses.repo";
import {
  DiscountsRepository,
  type DiscountRow,
} from "../../src/db/repositories/discounts.repo";
import { calculateMileageMetrics } from "../../src/finance/metrics";
import { getDatabase } from "../../src/db/connection";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";

type ExpenseRow = {
  _local_id: string;
  category_code: string;
  description: string | null;
  amount: number;
  date: string;
  mileage: number | null;
};

const CATEGORIES: Record<string, { label: string; icon: string }> = {
  COMBUSTIBLE: { label: "Combustible", icon: "⛽" },
  PEAJE: { label: "Peajes", icon: "🛣️" },
  DESCARGUE: { label: "Descargue", icon: "📦" },
  OTROS: { label: "Otros", icon: "🔧" },
};

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const repo = useTripsRepo();
  const [trip, setTrip] = useState<TripRow | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [discounts, setDiscounts] = useState<DiscountRow[]>([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Efectivo");
  const [payNotes, setPayNotes] = useState("");
  // Modal de finalización (pide kilometraje final)
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finalMileage, setFinalMileage] = useState("");

  useEffect(() => {
    if (!id || !repo) return;

    const loadData = async () => {
      try {
        const t = await repo.getById(id);
        setTrip(t);

        const db = await getDatabase();
        const expRepo = new ExpensesRepository(db);
        const discRepo = new DiscountsRepository(db);

        const [expList, discList] = await Promise.all([
          expRepo.listByTrip(id),
          discRepo.listByTrip(id),
        ]);
        setExpenses(expList as ExpenseRow[]);
        setDiscounts(discList);
      } catch (e) {
        console.error("Error cargando viaje:", e);
      }
    };

    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [id, repo]);

  if (!repo || !trip) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={{ marginTop: 10, color: "#6b7280" }}>
          Cargando datos del viaje...
        </Text>
      </View>
    );
  }

  // Cálculos financieros
  const totalDiscounts = discounts
    .filter((d) => d.amount > 0)
    .reduce((a, d) => a + d.amount, 0);
  const totalCharges = discounts
    .filter((d) => d.amount < 0)
    .reduce((a, d) => a + Math.abs(d.amount), 0);
  const expensesTotal = expenses.reduce((a, e) => a + e.amount, 0);
  const available = trip.advance - expensesTotal;

  // Desglose de gastos por categoría
  const expensesByCategory = Object.keys(CATEGORIES)
    .map((code) => {
      const total = expenses
        .filter((e) => e.category_code === code)
        .reduce((a, e) => a + e.amount, 0);
      return { code, ...CATEGORIES[code], total };
    })
    .filter((c) => c.total > 0);

  // Gasto solo de combustible (para KPIs de kilometraje)
  const fuelExpenseTotal = expenses
    .filter((e) => e.category_code === "COMBUSTIBLE")
    .reduce((a, e) => a + e.amount, 0);

  // Métricas de kilometraje
  const mileageMetrics = calculateMileageMetrics({
    initialMileage: trip.initial_mileage,
    finalMileage: trip.final_mileage,
    fuelExpense: fuelExpenseTotal,
    totalExpenses: expensesTotal,
  });

  const onFinish = async () => {
    Alert.alert("Finalizar viaje", "¿Confirmas que el viaje ha terminado?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Finalizar",
        onPress: () => {
          // Pre-llenar kilometraje final sugerido (si hay inicial, sumar estimación)
          setFinalMileage(
            trip.initial_mileage != null ? String(trip.initial_mileage) : "",
          );
          setShowFinishModal(true);
        },
      },
    ]);
  };

  const handleConfirmFinish = async () => {
    if (!repo || !trip) return;
    const km = finalMileage ? Number(finalMileage) : undefined;
    try {
      await repo.finish(trip._local_id, km);
      const t = await repo.getById(trip._local_id);
      setTrip(t);
      setShowFinishModal(false);
      Alert.alert(
        "✅ Viaje finalizado",
        km ? `Kilometraje final: ${km.toLocaleString("es-CO")} km` : undefined,
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "No se pudo finalizar el viaje");
    }
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

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Viaje #{trip.trip_number}</Text>
        <Text style={s.subtitle}>
          {trip.origin} → {trip.destination} · {trip.date}
        </Text>
        {trip.client ? (
          <Text style={s.client}>Cliente: {trip.client}</Text>
        ) : null}
        {trip.moto_qty > 0 ? (
          <Text style={s.motoQty}>🛵 {trip.moto_qty} motos</Text>
        ) : null}
      </View>

      {/* SECCIÓN FLETE */}
      <Section title="FLETE">
        <Row
          label="Flete total"
          value={`$${trip.gross_freight.toLocaleString("es-CO")}`}
          bold
        />
      </Section>

      {/* SECCIÓN DESCUENTOS */}
      <Section title="DESCUENTOS">
        {discounts.length === 0 ? (
          <Text style={s.emptyText}>Sin descuentos aplicados.</Text>
        ) : (
          <>
            {discounts.map((d) => {
              const isDiscount = d.amount > 0;
              return (
                <Row
                  key={d._local_id}
                  label={d.label}
                  value={`${isDiscount ? "-" : "+"}$${Math.abs(d.amount).toLocaleString("es-CO")}`}
                  valueColor={isDiscount ? "#dc2626" : "#059669"}
                />
              );
            })}
            {totalCharges > 0 && (
              <>
                <Divider />
                <Row
                  label="Total descuentos"
                  value={`-$${totalDiscounts.toLocaleString("es-CO")}`}
                  valueColor="#dc2626"
                />
                <Row
                  label="Total cargos extra"
                  value={`+$${totalCharges.toLocaleString("es-CO")}`}
                  valueColor="#059669"
                />
              </>
            )}
          </>
        )}
      </Section>

      {/* SECCIÓN FLETE NETO */}
      <Section title="FLETE NETO" highlight>
        <Row
          label="Flete neto"
          value={`$${trip.net_freight.toLocaleString("es-CO")}`}
          bold
          big
        />
      </Section>

      {/* SECCIÓN ANTICIPO */}
      <Section title="ANTICIPO (70%)">
        <Row
          label="Anticipo recibido"
          value={`$${trip.advance.toLocaleString("es-CO")}`}
          bold
        />
      </Section>

      {/* SECCIÓN GASTOS */}
      <Section title="GASTOS DEL VIAJE">
        {expensesByCategory.length > 0 ? (
          <>
            {expensesByCategory.map((cat) => (
              <Row
                key={cat.code}
                label={`${cat.icon} ${cat.label}`}
                value={`$${cat.total.toLocaleString("es-CO")}`}
              />
            ))}
            <Divider />
          </>
        ) : (
          <Text style={s.emptyText}>Sin gastos registrados aún.</Text>
        )}

        <Row
          label="Total gastos"
          value={`$${expensesTotal.toLocaleString("es-CO")}`}
          valueColor="#dc2626"
        />
        <Row
          label="Disponible del anticipo"
          value={`$${available.toLocaleString("es-CO")}`}
          bold
          valueColor={available >= 0 ? "#059669" : "#dc2626"}
        />

        <Link href={`/trips/${id}/add-expense`} asChild>
          <Pressable style={s.addExpenseButton}>
            <Text style={s.addExpenseText}>+ AGREGAR GASTO</Text>
          </Pressable>
        </Link>

        {expenses.length > 0 && (
          <View style={s.expensesList}>
            <Text style={s.expensesListTitle}>DETALLE</Text>
            {expenses.map((exp) => {
              const cat = CATEGORIES[exp.category_code] ?? {
                label: exp.category_code,
                icon: "🔧",
              };
              return (
                <View key={exp._local_id} style={s.expenseItem}>
                  <View style={s.expenseLeft}>
                    <Text style={s.expenseIcon}>{cat.icon}</Text>
                    <View>
                      <Text style={s.expenseDesc}>
                        {exp.description || cat.label}
                      </Text>
                      <Text style={s.expenseDate}>
                        {exp.date}{" "}
                        {exp.mileage
                          ? `· Km: ${exp.mileage.toLocaleString("es-CO")}`
                          : ""}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.expenseAmount}>
                    -${Number(exp.amount).toLocaleString("es-CO")}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Section>

      {/* SECCIÓN CUMPLIDO */}
      <Section title="CUMPLIDO (30%)">
        <Row
          label="Valor"
          value={`$${trip.balance.toLocaleString("es-CO")}`}
          bold
        />
        <Row
          label="Estado"
          value={
            trip.balance_status === "paid" ? "🟢 Paz y salvo" : "🔴 Pendiente"
          }
        />
        {trip.balance_status === "paid" && trip.balance_paid_at && (
          <>
            <Divider />
            <Row label="Pagado el" value={trip.balance_paid_at.slice(0, 10)} />
            {trip.balance_amount != null && (
              <Row
                label="Valor recibido"
                value={`$${trip.balance_amount.toLocaleString("es-CO")}`}
              />
            )}
            {trip.balance_method && (
              <Row label="Método" value={trip.balance_method} />
            )}
            {trip.balance_notes && (
              <Row label="Observaciones" value={trip.balance_notes} />
            )}
          </>
        )}
      </Section>

      {/* SECCIÓN KILOMETRAJE (solo si hay datos de kilometraje) */}
      {(trip.initial_mileage != null || trip.final_mileage != null) && (
        <Section title="KILOMETRAJE">
          {trip.initial_mileage != null && (
            <Row
              label="Km inicial"
              value={`${trip.initial_mileage.toLocaleString("es-CO")} km`}
            />
          )}
          {trip.final_mileage != null && (
            <Row
              label="Km final"
              value={`${trip.final_mileage.toLocaleString("es-CO")} km`}
            />
          )}
          {mileageMetrics.distance != null && (
            <>
              <Divider />
              <Row
                label="Km recorridos"
                value={`${mileageMetrics.distance.toLocaleString("es-CO")} km`}
                bold
              />
            </>
          )}
          {mileageMetrics.distance != null && mileageMetrics.distance > 0 && (
            <>
              {mileageMetrics.fuelCostPerKm != null && (
                <Row
                  label="Combustible / km"
                  value={`$${mileageMetrics.fuelCostPerKm.toLocaleString("es-CO")}`}
                  valueColor="#dc2626"
                />
              )}
              {mileageMetrics.costPerKm != null && (
                <Row
                  label="Costo total / km"
                  value={`$${mileageMetrics.costPerKm.toLocaleString("es-CO")}`}
                  valueColor="#dc2626"
                />
              )}
              {fuelExpenseTotal > 0 && (
                <Row
                  label="Gasto en combustible"
                  value={`$${fuelExpenseTotal.toLocaleString("es-CO")}`}
                />
              )}
            </>
          )}
          {trip.status === "in_progress" && trip.initial_mileage == null && (
            <Text style={s.emptyText}>
              ℹ️ No se registró kilometraje inicial. Se podrá ingresar el final
              al finalizar el viaje.
            </Text>
          )}
        </Section>
      )}

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

      {/* MODAL DE FINALIZACIÓN (pide kilometraje final) */}
      <Modal visible={showFinishModal} animationType="slide" transparent={true}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Finalizar viaje</Text>
            <Text style={s.modalSub}>
              Registra el kilometraje final del camión (opcional).
              {trip.initial_mileage != null
                ? `\nKm inicial: ${trip.initial_mileage.toLocaleString("es-CO")} km`
                : ""}
            </Text>

            <Text style={s.label}>KILOMETRAJE FINAL</Text>
            <TextInput
              style={s.input}
              value={finalMileage}
              onChangeText={setFinalMileage}
              keyboardType="numeric"
              placeholder="Ej: 150000"
            />

            <View style={s.modalActions}>
              <Pressable
                style={s.cancelBtn}
                onPress={() => setShowFinishModal(false)}
              >
                <Text style={s.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={s.confirmBtn} onPress={handleConfirmFinish}>
                <Text style={s.confirmText}>Finalizar</Text>
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
  highlight,
}: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <View style={[s.section, highlight && s.sectionHighlight]}>
      <Text style={[s.sectionTitle, highlight && s.sectionTitleHighlight]}>
        {title}
      </Text>
      <View style={{ marginTop: 8 }}>{children}</View>
    </View>
  );
}

function Row({
  label,
  value,
  bold,
  big,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  big?: boolean;
  valueColor?: string;
}) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, bold && s.boldText]}>{label}</Text>
      <Text
        style={[
          s.rowValue,
          bold && s.boldText,
          big && s.bigText,
          valueColor ? { color: valueColor } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
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
  client: { color: "#374151", marginTop: 4, fontSize: 13 },
  motoQty: { color: "#059669", marginTop: 4, fontSize: 13, fontWeight: "600" },
  section: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
  },
  sectionHighlight: {
    backgroundColor: "#d1fae5",
    borderWidth: 1,
    borderColor: "#059669",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6b7280",
    letterSpacing: 0.5,
  },
  sectionTitleHighlight: {
    color: "#065f46",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    alignItems: "center",
  },
  rowLabel: { color: "#4b5563", fontSize: 14 },
  rowValue: { color: "#111827", fontWeight: "500", fontSize: 14 },
  boldText: { fontWeight: "bold" },
  bigText: { fontSize: 18 },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 },
  emptyText: {
    color: "#9ca3af",
    fontStyle: "italic",
    paddingVertical: 8,
  },
  addExpenseButton: {
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 12,
  },
  addExpenseText: { color: "white", fontWeight: "bold", fontSize: 14 },
  expensesList: { marginTop: 16 },
  expensesListTitle: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  expenseLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  expenseIcon: { fontSize: 20 },
  expenseDesc: { color: "#111827", fontWeight: "600", fontSize: 14 },
  expenseDate: { color: "#6b7280", fontSize: 12 },
  expenseAmount: { color: "#dc2626", fontWeight: "bold", fontSize: 14 },
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
    marginBottom: 8,
    textAlign: "center",
  },
  modalSub: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
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
  methodBtnActive: { backgroundColor: "#059669" },
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
