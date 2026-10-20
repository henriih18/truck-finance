import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
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
import { useTheme } from "../../src/theme/ThemeContext";
import { SyncIndicator } from "../../src/ui/SyncIndicator";
import {
  Screen,
  ScreenHeader,
  Card,
  SectionTitle,
  EmptyState,
  StatusPill,
  RouteArrow,
  spacing,
  typography,
} from "../../src/ui/components";

type Period = "today" | "week" | "month" | "year" | "all" | "custom";

export default function Reports() {
  const { colors } = useTheme();
  const trips = useTrips();
  const generalExpenses = useGeneralExpenses();
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [tripExpensesTotal, setTripExpensesTotal] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);

  const today = new Date().toISOString().slice(0, 10);

  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const startOfWeek = startOfToday - now.getDay() * 24 * 60 * 60 * 1000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
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
      const s = customStart
        ? new Date(customStart + "T00:00:00").getTime()
        : 0;
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

  const handleExportCSV = async () => {
    try {
      if (filteredTrips.length === 0) {
        Alert.alert("Sin datos", "No hay viajes para exportar en este período.");
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

      await Share.share({
        message: csv,
        title: `Reporte_CSV_${period}_${today}`,
      });
    } catch (error: any) {
      console.error("Export CSV error:", error);
      Alert.alert("Error", "No se pudo exportar: " + (error?.message ?? ""));
    }
  };

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
    <Screen>
      <ScreenHeader
        title="Reportes"
        subtitle="Análisis financiero por período"
        right={<SyncIndicator />}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Selector de período */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
        >
          {[
            { id: "today" as const, label: "Hoy" },
            { id: "week" as const, label: "Semana" },
            { id: "month" as const, label: "Mes" },
            { id: "year" as const, label: "Año" },
            { id: "all" as const, label: "Todo" },
          ].map((p) => (
            <Pressable
              key={p.id}
              style={({ pressed }) => [
                {
                  backgroundColor:
                    period === p.id ? colors.primary : colors.surfaceMuted,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 999,
                  marginRight: 8,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => setPeriod(p.id)}
            >
              <Text
                style={{
                  color:
                    period === p.id
                      ? colors.textOnPrimary
                      : colors.textSecondary,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={({ pressed }) => [
              {
                backgroundColor:
                  period === "custom" ? colors.primary : colors.surfaceMuted,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                marginRight: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={openCustom}
          >
            <Text
              style={{
                color:
                  period === "custom"
                    ? colors.textOnPrimary
                    : colors.textSecondary,
                fontWeight: "700",
                fontSize: 13,
              }}
            >
              📅 Personalizado
            </Text>
          </Pressable>
        </ScrollView>

        {period === "custom" && customStart && customEnd && (
          <Text
            style={{
              paddingHorizontal: 16,
              paddingBottom: 8,
              fontSize: 13,
              color: colors.primary,
              fontWeight: "700",
            }}
          >
            📅 {customStart} → {customEnd}
          </Text>
        )}

        {/* HERO: Ganancia */}
        <View style={{ paddingHorizontal: 16 }}>
          <View
            style={{
              backgroundColor:
                totals.estimatedProfit >= 0 ? colors.primary : colors.danger,
              borderRadius: 20,
              padding: 24,
            }}
          >
            <Text
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              📈 Ganancia del período
            </Text>
            <Text
              style={{
                color: "white",
                fontSize: 36,
                fontWeight: "900",
                marginTop: 6,
                fontVariant: ["tabular-nums"],
              }}
              numberOfLines={1}
            >
              ${totals.estimatedProfit.toLocaleString("es-CO")}
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 13,
                marginTop: 6,
              }}
            >
              {filteredTrips.length} viaje(s) en el período
            </Text>
          </View>
        </View>

        {/* Resumen */}
        <SectionTitle>Resumen financiero</SectionTitle>
        <View
          style={{
            paddingHorizontal: 16,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <StatCard label="Viajes" value={String(filteredTrips.length)} icon="🚛" />
          <StatCard
            label="Flete total"
            value={formatMoney(totals.totalGross)}
            icon="💵"
            variant="info"
          />
          <StatCard
            label="Flete neto"
            value={formatMoney(totals.totalNet)}
            icon="✂️"
            variant="success"
          />
          <StatCard
            label="Anticipos"
            value={formatMoney(totals.totalAdvance)}
            icon="📤"
            variant="info"
          />
          <StatCard
            label="Gastos viaje"
            value={formatMoney(totals.tripExpensesTotal)}
            icon="🧾"
            variant="danger"
          />
          <StatCard
            label="Gastos generales"
            value={formatMoney(totals.generalExpensesTotal)}
            icon="🔧"
            variant="danger"
          />
          <StatCard
            label="Recibido"
            value={formatMoney(totals.totalReceived)}
            icon="📥"
            variant="success"
          />
          <StatCard
            label="Por cobrar"
            value={formatMoney(totals.totalBalancePending)}
            icon="💰"
            variant="warning"
          />
        </View>

        {/* Botones de exportación */}
        <SectionTitle>Exportar</SectionTitle>
        <View style={{ paddingHorizontal: 16, flexDirection: "row", gap: 10 }}>
          <Pressable
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: colors.primary,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleExportCSV}
          >
            <Text style={{ color: colors.textOnPrimary, fontWeight: "800", fontSize: 14 }}>
              📊 CSV
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: colors.info,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 6,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleExportSummary}
          >
            <Text style={{ color: "white", fontWeight: "800", fontSize: 14 }}>
              📄 Resumen
            </Text>
          </Pressable>
        </View>

        {/* Lista de viajes */}
        <SectionTitle>
          Viajes del período ({filteredTrips.length})
        </SectionTitle>
        <View style={{ paddingHorizontal: 16 }}>
          {filteredTrips.length === 0 ? (
            <EmptyState
              icon="📊"
              title="Sin viajes en este período"
              subtitle="Cambia el período o registra un nuevo viaje."
            />
          ) : (
            filteredTrips.map((t) => (
              <Card key={t._local_id} style={{ marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.primaryMuted,
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: 11,
                        fontWeight: "800",
                        letterSpacing: 1,
                      }}
                    >
                      #{t.trip_number}
                    </Text>
                  </View>
                  <StatusPill
                    variant={t.balance_status === "paid" ? "success" : "warning"}
                  >
                    {t.balance_status === "paid" ? "Pagado" : "Pendiente"}
                  </StatusPill>
                </View>

                <RouteArrow origin={t.origin} destination={t.destination} />
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  📅 {t.date} · 👤 {t.client} · 🛵 {t.moto_qty} motos
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <MiniStat
                    label="Neto"
                    value={formatMoney(t.net_freight)}
                    color={colors.success}
                  />
                  <MiniStat
                    label="Cumplido"
                    value={formatMoney(t.balance)}
                    color={colors.warning}
                  />
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal período personalizado */}
      <Modal visible={customModalVisible} animationType="slide" transparent>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 20,
          }}
          onPress={() => setCustomModalVisible(false)}
        >
          <View
            style={{
              backgroundColor: colors.background,
              borderRadius: 20,
              padding: 20,
            }}
          >
            <Text
              style={[
                typography.h2,
                { color: colors.text, textAlign: "center", marginBottom: 16 },
              ]}
            >
              Período personalizado
            </Text>

            <View>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textMuted,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                }}
              >
                Fecha inicial (YYYY-MM-DD)
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
                value={customStart}
                onChangeText={setCustomStart}
                placeholder="2024-01-01"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textMuted,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  marginTop: 12,
                }}
              >
                Fecha final (YYYY-MM-DD)
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
                value={customEnd}
                onChangeText={setCustomEnd}
                placeholder="2024-12-31"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <Text
              style={{
                fontSize: 11,
                color: colors.textMuted,
                marginTop: 6,
                marginLeft: 2,
              }}
            >
              Formato: Año-Mes-Día (ej: 2024-01-15)
            </Text>

            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginTop: 20,
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: colors.surfaceMuted,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => setCustomModalVisible(false)}
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
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={applyCustom}
              >
                <Text
                  style={{
                    color: colors.textOnPrimary,
                    fontWeight: "800",
                  }}
                >
                  Aplicar
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function StatCard({
  label,
  value,
  icon,
  variant = "neutral",
}: {
  label: string;
  value: string;
  icon: string;
  variant?: "success" | "danger" | "info" | "warning" | "neutral";
}) {
  const { colors } = useTheme();
  const fg =
    variant === "success"
      ? colors.success
      : variant === "danger"
        ? colors.danger
        : variant === "info"
          ? colors.info
          : variant === "warning"
            ? colors.warning
            : colors.text;
  return (
    <View style={{ width: "48%", flexGrow: 1 }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 12,
          borderLeftWidth: 4,
          borderLeftColor: fg,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            color: colors.textMuted,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {icon} {label}
        </Text>
        <Text
          style={{
            color: fg,
            fontSize: 16,
            fontWeight: "800",
            marginTop: 4,
            fontVariant: ["tabular-nums"],
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View>
      <Text
        style={{
          fontSize: 10,
          color: "#6b7280",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color,
          fontSize: 14,
          fontWeight: "800",
          marginTop: 2,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}
