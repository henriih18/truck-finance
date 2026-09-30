import { useEffect, useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useTrips } from "../../src/hooks/useTrips";
import { getDatabase } from "../../src/db/connection";
import { ExpensesRepository } from "../../src/db/repositories/expenses.repo";
import { PaymentsRepository } from "../../src/db/repositories/payments.repo";
import { useTheme } from "../../src/theme/ThemeContext";

export default function Dashboard() {
  const { colors } = useTheme();
  const trips = useTrips();
  const [tripExpensesTotal, setTripExpensesTotal] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);

  const finished = trips.filter((t) => t.status === "finished");
  const pendingBalanceTrips = finished.filter(
    (t) => t.balance_status === "pending",
  );
  const paidBalanceTrips = finished.filter((t) => t.balance_status === "paid");

  const totalGross = trips.reduce((a, t) => a + t.gross_freight, 0);
  const totalNet = trips.reduce((a, t) => a + t.net_freight, 0);
  const totalAdvance = trips.reduce((a, t) => a + t.advance, 0);
  const totalPending = pendingBalanceTrips.reduce((a, t) => a + t.balance, 0);
  const totalPaid = paidBalanceTrips.reduce(
    (a, t) => a + (t.balance_amount ?? t.balance),
    0,
  );

  useEffect(() => {
    const load = async () => {
      try {
        const db = await getDatabase();
        const expRepo = new ExpensesRepository(db);
        const payRepo = new PaymentsRepository(db);
        let expenses = 0;
        for (const t of trips)
          expenses += await expRepo.getTotalByTrip(t._local_id);
        setTripExpensesTotal(expenses);
        let received = 0;
        for (const t of trips)
          received += await payRepo.getTotalByTrip(t._local_id);
        setTotalReceived(received);
      } catch (e) {
        console.error("[Dashboard] error:", e);
      }
    };
    if (trips.length > 0) load();
    else {
      setTripExpensesTotal(0);
      setTotalReceived(0);
    }
  }, [trips]);

  const totalProfit = totalNet - tripExpensesTotal;

  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Dashboard</Text>
      </View>

      <View style={s.content}>
        <View style={s.cardPorCobrar}>
          <Text style={s.cardLabel}>💰 POR COBRAR</Text>
          <Text style={s.cardValue}>
            ${totalPending.toLocaleString("es-CO")}
          </Text>
          <Text style={s.cardSub}>
            {pendingBalanceTrips.length} viaje(s) con cumplido pendiente
          </Text>
        </View>

        <Text style={s.sectionTitle}>RESUMEN FINANCIERO</Text>
        <View style={s.statsGrid}>
          <StatCard
            label="Viajes"
            value={trips.length.toString()}
            colors={colors}
            s={s}
          />
          <StatCard
            label="Fletes totales"
            value={`$${totalGross.toLocaleString("es-CO")}`}
            colors={colors}
            s={s}
          />
          <StatCard
            label="Fletes netos"
            value={`$${totalNet.toLocaleString("es-CO")}`}
            colors={colors}
            s={s}
          />
          <StatCard
            label="Anticipos"
            value={`$${totalAdvance.toLocaleString("es-CO")}`}
            colors={colors}
            s={s}
          />
          <StatCard
            label="Gastos (viajes)"
            value={`$${tripExpensesTotal.toLocaleString("es-CO")}`}
            colors={colors}
            s={s}
            accent="red"
          />
          <StatCard
            label="Recibido"
            value={`$${totalReceived.toLocaleString("es-CO")}`}
            colors={colors}
            s={s}
            accent="green"
          />
          <StatCard
            label="Cumpl. pagados"
            value={`$${totalPaid.toLocaleString("es-CO")}`}
            colors={colors}
            s={s}
            accent="green"
          />
          <StatCard
            label="Ganancia"
            value={`$${totalProfit.toLocaleString("es-CO")}`}
            colors={colors}
            s={s}
            accent={totalProfit >= 0 ? "green" : "red"}
          />
        </View>

        <Text style={s.sectionTitle}>CUMPLIDOS</Text>
        <View style={s.cumplidosCard}>
          <View style={s.cumplidoItem}>
            <Text style={s.cumplidoDotRed}>🔴</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cumplidoLabel}>Pendientes</Text>
              <Text style={s.cumplidoCount}>{pendingBalanceTrips.length}</Text>
            </View>
            <Text style={s.cumplidoValue}>
              ${totalPending.toLocaleString("es-CO")}
            </Text>
          </View>
          <View style={s.cumplidoDivider} />
          <View style={s.cumplidoItem}>
            <Text style={s.cumplidoDotGreen}>🟢</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cumplidoLabel}>Pagados</Text>
              <Text style={s.cumplidoCount}>{paidBalanceTrips.length}</Text>
            </View>
            <Text style={s.cumplidoValue}>
              ${totalPaid.toLocaleString("es-CO")}
            </Text>
          </View>
        </View>

        <Link href="/trips/new" asChild>
          <Pressable style={s.button}>
            <Text style={s.buttonText}>+ NUEVO VIAJE</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  accent,
  colors,
  s,
}: {
  label: string;
  value: string;
  accent?: "green" | "red";
  colors: ReturnType<typeof useTheme>["colors"];
  s: ReturnType<typeof makeStyles>;
}) {
  const color =
    accent === "green"
      ? colors.success
      : accent === "red"
        ? colors.danger
        : colors.text;
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      padding: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: { fontSize: 24, fontWeight: "bold", color: c.text },
    content: { padding: 16 },
    cardPorCobrar: {
      backgroundColor: c.accentBg,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    cardLabel: {
      color: "rgba(255,255,255,0.85)",
      fontSize: 13,
      fontWeight: "600",
    },
    cardValue: {
      color: "white",
      fontSize: 36,
      fontWeight: "bold",
      marginTop: 8,
    },
    cardSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 8 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: c.textMuted,
      letterSpacing: 0.5,
      marginTop: 8,
      marginBottom: 8,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 16,
    },
    statCard: {
      flexBasis: "48%",
      flexGrow: 1,
      backgroundColor: c.surfaceMuted,
      borderRadius: 12,
      padding: 12,
    },
    statLabel: { fontSize: 11, color: c.textMuted, fontWeight: "600" },
    statValue: {
      fontSize: 15,
      fontWeight: "bold",
      color: c.text,
      marginTop: 4,
    },
    cumplidosCard: {
      backgroundColor: c.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    cumplidoItem: { flexDirection: "row", alignItems: "center", gap: 8 },
    cumplidoDotRed: { fontSize: 16 },
    cumplidoDotGreen: { fontSize: 16 },
    cumplidoLabel: { fontSize: 12, color: c.textMuted, fontWeight: "600" },
    cumplidoCount: { fontSize: 20, fontWeight: "bold", color: c.text },
    cumplidoValue: { fontSize: 15, fontWeight: "bold", color: c.text },
    cumplidoDivider: {
      height: 1,
      backgroundColor: c.border,
      marginVertical: 12,
    },
    button: {
      backgroundColor: c.primary,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
    },
    buttonText: { color: c.textOnPrimary, fontSize: 16, fontWeight: "bold" },
  });
}
