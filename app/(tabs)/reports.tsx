import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Share,
  Modal,
  TextInput,
} from "react-native";
import { useTrips } from "../../src/hooks/useTrips";
import { useGeneralExpenses } from "../../src/hooks/useGeneralExpenses";
import { getDatabase } from "../../src/db/connection";
import { ExpensesRepository } from "../../src/db/repositories/expenses.repo";
import { PaymentsRepository } from "../../src/db/repositories/payments.repo";
import { SyncIndicator } from "../../src/ui/SyncIndicator";

type Period = "today" | "week" | "month" | "year" | "all" | "custom";

export default function Reports() {
  const trips = useTrips();
  const generalExpenses = useGeneralExpenses();
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [tripExpensesTotal, setTripExpensesTotal] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);

  const today = new Date().toISOString().slice(0, 10);

  // Filtrar por período
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const startOfWeek = startOfToday - now.getDay() * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

    if (period === "today")
      return { startDate: startOfToday, endDate: endOfToday };
    if (period === "week")
      return { startDate: startOfWeek, endDate: endOfToday };
    if (period === "month")
      return { startDate: startOfMonth, endDate: endOfToday };
    if (period === "year")
      return { startDate: startOfYear, endDate: endOfToday };
    if (period === "custom") {
      const s = customStart ? new Date(customStart + "T00:00:00").getTime() : 0;
      const e = customEnd
        ? new Date(customEnd + "T23:59:59").getTime()
        : Date.now();
      return { startDate: s, endDate: e };
    }
    return { startDate: 0, endDate: Date.now() };
  }, [period, customStart, customEnd]);

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const tTime = new Date(t.date).getTime();
      return tTime >= startDate && tTime <= endDate;
    });
  }, [trips, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return generalExpenses.filter((e) => {
      const eTime = new Date(e.date).getTime();
      return eTime >= startDate && eTime <= endDate;
    });
  }, [generalExpenses, startDate, endDate]);

  // Cargar gastos reales de los viajes filtrados + pagos recibidos
  useEffect(() => {
    const load = async () => {
      try {
        const db = await getDatabase();
        const expRepo = new ExpensesRepository(db);
        const payRepo = new PaymentsRepository(db);

        let exp = 0;
        let received = 0;
        for (const t of filteredTrips) {
          exp += await expRepo.getTotalByTrip(t._local_id);
          received += await payRepo.getTotalByTrip(t._local_id);
        }
        setTripExpensesTotal(exp);
        setTotalReceived(received);
      } catch (e) {
        console.error("[Reports] error:", e);
      }
    };
    if (filteredTrips.length > 0) load();
    else {
      setTripExpensesTotal(0);
      setTotalReceived(0);
    }
  }, [filteredTrips]);

  // Totales
  const totals = useMemo(() => {
    const totalGross = filteredTrips.reduce((s, t) => s + t.gross_freight, 0);
    const totalNet = filteredTrips.reduce((s, t) => s + t.net_freight, 0);
    const totalAdvance = filteredTrips.reduce((s, t) => s + t.advance, 0);
    const finished = filteredTrips.filter((t) => t.status === "finished");
    const totalBalancePending = finished
      .filter((t) => t.balance_status === "pending")
      .reduce((s, t) => s + t.balance, 0);
    const totalBalancePaid = finished
      .filter((t) => t.balance_status === "paid")
      .reduce((s, t) => s + (t.balance_amount ?? t.balance), 0);
    const generalExpensesTotal = filteredExpenses.reduce(
      (s, e) => s + e.amount,
      0,
    );
    const totalExpenses = tripExpensesTotal + generalExpensesTotal;
    const estimatedProfit = totalNet - totalExpenses;

    return {
      totalGross,
      totalNet,
      totalAdvance,
      totalBalancePending,
      totalBalancePaid,
      generalExpensesTotal,
      tripExpensesTotal,
      totalExpenses,
      totalReceived,
      estimatedProfit,
    };
  }, [filteredTrips, filteredExpenses, tripExpensesTotal, totalReceived]);

  const formatMoney = (n: number) => `$${n.toLocaleString("es-CO")}`;

  // ===== Exportación a CSV (vía Share.share) =====
  const handleExportCSV = async () => {
    try {
      if (filteredTrips.length === 0) {
        Alert.alert(
          "Sin datos",
          "No hay viajes para exportar en este período.",
        );
        return;
      }

      const headers = [
        "Fecha",
        "Cliente",
        "Origen",
        "Destino",
        "Motos",
        "Flete Total",
        "Flete Neto",
        "Anticipo",
        "Cumplido",
        "Estado Viaje",
        "Estado Cumplido",
        "Pagado",
      ];
      const rows = filteredTrips.map((t) => [
        t.date,
        `"${t.client}"`,
        `"${t.origin}"`,
        `"${t.destination}"`,
        t.moto_qty,
        t.gross_freight,
        t.net_freight,
        t.advance,
        t.balance,
        t.status,
        t.balance_status === "paid" ? "Pagado" : "Pendiente",
        t.balance_amount ?? "",
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((r) => r.join(",")),
        "",
        "RESUMEN",
        `Flete Total,${totals.totalGross}`,
        `Flete Neto,${totals.totalNet}`,
        `Anticipos,${totals.totalAdvance}`,
        `Gastos de Viaje,${totals.tripExpensesTotal}`,
        `Gastos Generales,${totals.generalExpensesTotal}`,
        `Gastos Totales,${totals.totalExpenses}`,
        `Recibido,${totals.totalReceived}`,
        `Por Cobrar,${totals.totalBalancePending}`,
        `Ganancia,${totals.estimatedProfit}`,
      ].join("\n");

      // Usar Share.share (disponible en iOS/Android sin dependencias extra)
      await Share.share({
        message: csv,
        title: `Reporte_CSV_${period}_${today}`,
      });
    } catch (error: any) {
      console.error("Export CSV error:", error);
      Alert.alert("Error", "No se pudo exportar: " + (error?.message ?? ""));
    }
  };

  // ===== Exportación a texto formateado (estilo "PDF" — formato legible) =====
  const handleExportSummary = async () => {
    try {
      if (filteredTrips.length === 0) {
        Alert.alert("Sin datos", "No hay viajes para exportar.");
        return;
      }

      const periodLabel =
        period === "custom"
          ? `${customStart || "..."} a ${customEnd || "..."}`
          : period.toUpperCase();

      const txt = [
        `═══════════════════════════════════════`,
        `   REPORTE TRUCK FINANCE`,
        `   Período: ${periodLabel}`,
        `   Generado: ${new Date().toLocaleString("es-CO")}`,
        `═══════════════════════════════════════`,
        ``,
        `📍 RESUMEN FINANCIERO`,
        `─────────────────────────────────────`,
        `Viajes: ${filteredTrips.length}`,
        `Flete total:        ${formatMoney(totals.totalGross)}`,
        `Flete neto:         ${formatMoney(totals.totalNet)}`,
        `Anticipos:          ${formatMoney(totals.totalAdvance)}`,
        `Gastos de viaje:    ${formatMoney(totals.tripExpensesTotal)}`,
        `Gastos generales:   ${formatMoney(totals.generalExpensesTotal)}`,
        `GASTOS TOTALES:     ${formatMoney(totals.totalExpenses)}`,
        `Recibido:           ${formatMoney(totals.totalReceived)}`,
        `Por cobrar:         ${formatMoney(totals.totalBalancePending)}`,
        `Cumplidos pagados:  ${formatMoney(totals.totalBalancePaid)}`,
        ``,
        `💰 GANANCIA:        ${formatMoney(totals.estimatedProfit)}`,
        ``,
        `═══════════════════════════════════════`,
        `🚚 DETALLE DE VIAJES`,
        `═══════════════════════════════════════`,
        ...filteredTrips.map((t, i) =>
          [
            ``,
            `Viaje #${i + 1} — ${t.date}`,
            `  Cliente: ${t.client}`,
            `  Ruta: ${t.origin} → ${t.destination}`,
            `  Motos: ${t.moto_qty}`,
            `  Flete total: ${formatMoney(t.gross_freight)}`,
            `  Flete neto:  ${formatMoney(t.net_freight)}`,
            `  Anticipo:    ${formatMoney(t.advance)}`,
            `  Cumplido:    ${formatMoney(t.balance)}`,
            `  Estado:      ${t.balance_status === "paid" ? "🟢 Pagado" : "🔴 Pendiente"}`,
          ].join("\n"),
        ),
        ``,
        `═══════════════════════════════════════`,
      ].join("\n");

      await Share.share({
        message: txt,
        title: `Reporte_Resumen_${period}_${today}`,
      });
    } catch (error: any) {
      console.error("Export summary error:", error);
      Alert.alert("Error", "No se pudo exportar: " + (error?.message ?? ""));
    }
  };

  const openCustom = () => {
    setCustomStart(today);
    setCustomEnd(today);
    setCustomModalVisible(true);
  };

  const applyCustom = () => {
    if (!customStart || !customEnd) {
      Alert.alert("Error", "Selecciona ambas fechas.");
      return;
    }
    if (new Date(customStart) > new Date(customEnd)) {
      Alert.alert("Error", "La fecha inicial no puede ser mayor que la final.");
      return;
    }
    setPeriod("custom");
    setCustomModalVisible(false);
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Reportes</Text>
        <SyncIndicator />
      </View>

      {/* Selector de Período */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.periodScroll}
      >
        <PeriodButton
          label="Hoy"
          active={period === "today"}
          onPress={() => setPeriod("today")}
        />
        <PeriodButton
          label="Semana"
          active={period === "week"}
          onPress={() => setPeriod("week")}
        />
        <PeriodButton
          label="Mes"
          active={period === "month"}
          onPress={() => setPeriod("month")}
        />
        <PeriodButton
          label="Año"
          active={period === "year"}
          onPress={() => setPeriod("year")}
        />
        <PeriodButton
          label="Todo"
          active={period === "all"}
          onPress={() => setPeriod("all")}
        />
        <PeriodButton
          label="📅 Personalizado"
          active={period === "custom"}
          onPress={openCustom}
        />
      </ScrollView>

      {period === "custom" && customStart && customEnd && (
        <Text style={s.customRange}>
          📅 {customStart} → {customEnd}
        </Text>
      )}

      {/* Tarjetas de Resumen */}
      <View style={s.summaryGrid}>
        <SummaryCard
          label="Viajes"
          value={String(filteredTrips.length)}
          color="#6b7280"
        />
        <SummaryCard
          label="Flete Total"
          value={formatMoney(totals.totalGross)}
          color="#0ea5e9"
        />
        <SummaryCard
          label="Flete Neto"
          value={formatMoney(totals.totalNet)}
          color="#059669"
        />
        <SummaryCard
          label="Anticipos"
          value={formatMoney(totals.totalAdvance)}
          color="#0ea5e9"
        />
        <SummaryCard
          label="Gastos Viaje"
          value={formatMoney(totals.tripExpensesTotal)}
          color="#dc2626"
        />
        <SummaryCard
          label="Gastos Generales"
          value={formatMoney(totals.generalExpensesTotal)}
          color="#dc2626"
        />
        <SummaryCard
          label="Gastos Totales"
          value={formatMoney(totals.totalExpenses)}
          color="#dc2626"
        />
        <SummaryCard
          label="Recibido"
          value={formatMoney(totals.totalReceived)}
          color="#059669"
        />
        <SummaryCard
          label="Por Cobrar"
          value={formatMoney(totals.totalBalancePending)}
          color="#d97706"
        />
        <SummaryCard
          label="Cumpl. Pagados"
          value={formatMoney(totals.totalBalancePaid)}
          color="#059669"
        />
        <SummaryCard
          label="Ganancia"
          value={formatMoney(totals.estimatedProfit)}
          color={totals.estimatedProfit >= 0 ? "#059669" : "#dc2626"}
        />
      </View>

      {/* Botones de Exportación */}
      <View style={s.exportRow}>
        <Pressable
          style={[s.exportButton, { flex: 1 }]}
          onPress={handleExportCSV}
        >
          <Text style={s.exportButtonText}>📊 CSV</Text>
        </Pressable>
        <Pressable
          style={[s.exportButton, { flex: 1, backgroundColor: "#0ea5e9" }]}
          onPress={handleExportSummary}
        >
          <Text style={s.exportButtonText}>📄 Resumen</Text>
        </Pressable>
      </View>

      {/* Lista de Viajes del Período */}
      <View style={s.listHeader}>
        <Text style={s.listTitle}>
          Viajes ({filteredTrips.length}) · Gastos generales (
          {filteredExpenses.length})
        </Text>
      </View>

      {filteredTrips.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>📊</Text>
          <Text style={s.emptyText}>Sin viajes en este período</Text>
        </View>
      ) : (
        filteredTrips.map((t) => (
          <View key={t._local_id} style={s.tripItem}>
            <View style={s.tripHeader}>
              <Text style={s.tripDate}>{t.date}</Text>
              <Text
                style={
                  t.balance_status === "paid" ? s.statusPaid : s.statusPending
                }
              >
                {t.balance_status === "paid" ? "🟢 Pagado" : "🔴 Pendiente"}
              </Text>
            </View>
            <Text style={s.tripClient}>{t.client}</Text>
            <Text style={s.tripRoute}>
              {t.origin} → {t.destination}
            </Text>
            <Text style={s.tripMoto}>🛵 {t.moto_qty} motos</Text>
            <View style={s.tripFooter}>
              <Text style={s.tripNet}>Neto: {formatMoney(t.net_freight)}</Text>
              <Text style={s.tripBalance}>
                Cumplido: {formatMoney(t.balance)}
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />

      {/* Modal período personalizado */}
      <Modal visible={customModalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <Text style={s.modalTitle}>Período personalizado</Text>

            <Text style={s.label}>FECHA INICIAL (YYYY-MM-DD)</Text>
            <TextInput
              style={s.input}
              value={customStart}
              onChangeText={setCustomStart}
              placeholder="2024-01-01"
            />

            <Text style={s.label}>FECHA FINAL (YYYY-MM-DD)</Text>
            <TextInput
              style={s.input}
              value={customEnd}
              onChangeText={setCustomEnd}
              placeholder="2024-12-31"
            />

            <Text style={s.hint}>Formato: Año-Mes-Día (ej: 2024-01-15)</Text>

            <View style={s.modalActions}>
              <Pressable
                style={[s.modalBtn, s.cancelBtn]}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={s.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[s.modalBtn, s.confirmBtn]}
                onPress={applyCustom}
              >
                <Text style={s.confirmText}>Aplicar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function PeriodButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[s.periodBtn, active && s.periodBtnActive]}
      onPress={onPress}
    >
      <Text style={[s.periodText, active && s.periodTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[s.summaryCard, { borderLeftColor: color }]}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  header: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#111827" },
  periodScroll: { paddingVertical: 12, paddingHorizontal: 16 },
  periodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },
  periodBtnActive: { backgroundColor: "#059669" },
  periodText: { color: "#4b5563", fontWeight: "600" },
  periodTextActive: { color: "white" },
  customRange: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 13,
    color: "#059669",
    fontWeight: "600",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 8,
  },
  summaryCard: {
    width: "48%",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryValue: { fontSize: 16, fontWeight: "bold", marginTop: 4 },
  exportRow: { flexDirection: "row", gap: 8, margin: 16 },
  exportButton: {
    backgroundColor: "#059669",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  exportButtonText: { color: "white", fontSize: 15, fontWeight: "bold" },
  listHeader: { paddingHorizontal: 16, marginBottom: 8 },
  listTitle: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  tripItem: {
    backgroundColor: "#f9fafb",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tripDate: { fontSize: 12, color: "#6b7280" },
  statusPaid: { fontSize: 12, color: "#059669", fontWeight: "600" },
  statusPending: { fontSize: 12, color: "#dc2626", fontWeight: "600" },
  tripClient: { fontSize: 15, fontWeight: "bold", color: "#111827" },
  tripRoute: { fontSize: 13, color: "#4b5563", marginTop: 2 },
  tripMoto: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  tripFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  tripNet: { fontSize: 13, color: "#059669", fontWeight: "600" },
  tripBalance: { fontSize: 13, color: "#d97706", fontWeight: "600" },
  emptyState: { alignItems: "center", marginTop: 40, padding: 16 },
  emptyText: { fontSize: 16, color: "#6b7280" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: { backgroundColor: "white", borderRadius: 16, padding: 20 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
  },
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
  hint: { fontSize: 11, color: "#9ca3af", marginTop: 6, marginLeft: 2 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtn: { backgroundColor: "#f3f4f6" },
  cancelText: { color: "#374151", fontWeight: "600" },
  confirmBtn: { backgroundColor: "#059669" },
  confirmText: { color: "white", fontWeight: "bold" },
});
