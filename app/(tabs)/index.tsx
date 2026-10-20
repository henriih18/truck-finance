import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { Link } from "expo-router";
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
  StatusPill,
  RouteArrow,
} from "../../src/ui/components";

// Cadena enmascarada para ocultar valores cuando el "ojo" está cerrado
const HIDDEN = "•••••••";

export default function Dashboard() {
  const { colors } = useTheme();
  const trips = useTrips();
  const generalExpenses = useGeneralExpenses();
  const [tripExpensesTotal, setTripExpensesTotal] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  // Ojo para ocultar/mostrar valores sensibles del hero
  const [hideValues, setHideValues] = useState(false);

  const finished = trips.filter((t) => t.status === "finished");
  const pendingBalanceTrips = finished.filter(
    (t) => t.balance_status === "pending",
  );
  const paidBalanceTrips = finished.filter((t) => t.balance_status === "paid");

  const totalNet = trips.reduce((a, t) => a + t.net_freight, 0);
  const totalPending = pendingBalanceTrips.reduce((a, t) => a + t.balance, 0);
  const totalPaid = paidBalanceTrips.reduce(
    (a, t) => a + (t.balance_amount ?? t.balance),
    0,
  );
  const generalExpensesTotal = generalExpenses.reduce((a, e) => a + e.amount, 0);

  // Cargar gastos de los viajes + recibido
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

  // GANANCIA NETA = flete neto - gastos del viaje - gastos generales
  const netProfit = totalNet - tripExpensesTotal - generalExpensesTotal;

  // Viajes recientes (3 últimos por fecha)
  const recentTrips = [...trips]
    .sort((a, b) => (b._created_at > a._created_at ? 1 : -1))
    .slice(0, 3);

  return (
    <Screen>
      <ScreenHeader
        title="Dashboard"
        subtitle="Resumen financiero de tu camión"
        right={<SyncIndicator />}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {/* ============ HERO PRINCIPAL: GANANCIA NETA ============ */}
        <View
          style={{
            backgroundColor: netProfit >= 0 ? colors.primary : colors.danger,
            borderRadius: 20,
            padding: 24,
          }}
        >
          {/* Fila superior: label + ojo para ocultar */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
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
              📈 Ganancia neta del camión
            </Text>
            <Pressable
              onPress={() => setHideValues((v) => !v)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                padding: 4,
              })}
            >
              <EyeIcon visible={!hideValues} color="white" />
            </Pressable>
          </View>

          {/* Valor principal (enmascarado si hideValues) */}
          <Text
            style={{
              color: "white",
              fontSize: 38,
              fontWeight: "900",
              marginTop: 8,
              fontVariant: ["tabular-nums"],
            }}
            numberOfLines={1}
          >
            {hideValues
              ? HIDDEN
              : `$${netProfit.toLocaleString("es-CO")}`}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 12,
              marginTop: 6,
            }}
          >
            Flete neto − gastos del viaje − gastos generales
          </Text>

          {/* Desglose visual (enmascarado si hideValues) */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 16,
            }}
          >
            <BreakdownChip
              label="Flete neto"
              value={totalNet}
              color="white"
              bg="rgba(255,255,255,0.2)"
              hidden={hideValues}
            />
            <BreakdownChip
              label="Gastos viaje"
              value={-tripExpensesTotal}
              color="white"
              bg="rgba(255,255,255,0.2)"
              hidden={hideValues}
            />
            <BreakdownChip
              label="Gastos generales"
              value={-generalExpensesTotal}
              color="white"
              bg="rgba(255,255,255,0.2)"
              hidden={hideValues}
            />
          </View>
        </View>

        {/* ============ VIAJES RECIENTES ============ */}
        <SectionTitle>Viajes recientes</SectionTitle>
        {recentTrips.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", paddingVertical: 16 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>🚚</Text>
              <Text
                style={{
                  color: colors.text,
                  fontSize: 16,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                Sin viajes aún
              </Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 4,
                }}
              >
                Crea tu primer viaje para empezar.
              </Text>
            </View>
          </Card>
        ) : (
          recentTrips.map((t) => (
            <Link key={t._local_id} href={`/trips/${t._local_id}`} asChild>
              <Pressable
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <Card style={{ marginBottom: 8 }}>
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
                      variant={
                        t.balance_status === "paid"
                          ? "success"
                          : t.status === "finished"
                            ? "warning"
                            : "info"
                      }
                    >
                      {t.balance_status === "paid"
                        ? "✓ Pagado"
                        : t.status === "finished"
                          ? "Pendiente"
                          : "En curso"}
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
                    📅 {t.date} · 🛵 {t.moto_qty} motos
                  </Text>
                </Card>
              </Pressable>
            </Link>
          ))
        )}

        {trips.length > 3 && (
          <Link href="/(tabs)/trips" asChild>
            <Pressable
              style={({ pressed }) => [
                {
                  paddingVertical: 12,
                  alignItems: "center",
                  marginTop: 4,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                Ver todos los viajes →
              </Text>
            </Pressable>
          </Link>
        )}

        {/* ============ RESUMEN DE CUMPLIDOS ============ */}
        <SectionTitle>Cumplidos (30%)</SectionTitle>
        <Card>
          <CumplidoRow
            dotColor={colors.danger}
            label="Pendientes"
            count={pendingBalanceTrips.length}
            value={`$${totalPending.toLocaleString("es-CO")}`}
          />
          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: 12,
            }}
          />
          <CumplidoRow
            dotColor={colors.success}
            label="Pagados"
            count={paidBalanceTrips.length}
            value={`$${totalPaid.toLocaleString("es-CO")}`}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function CumplidoRow({
  dotColor,
  label,
  count,
  value,
}: {
  dotColor: string;
  label: string;
  count: number;
  value: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          backgroundColor: dotColor,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
          {count}
        </Text>
      </View>
      <Text
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: "800",
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function BreakdownChip({
  label,
  value,
  color,
  bg,
  hidden = false,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
  hidden?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          color,
          fontSize: 11,
          fontWeight: "700",
        }}
      >
        {label}:{" "}
        {hidden
          ? "••••"
          : `${value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString("es-CO")}`}
      </Text>
    </View>
  );
}

/**
 * Ojo minimalista dibujado con Views (sin emoji).
 * - visible=true  → ojo abierto (punto dentro)
 * - visible=false → ojo cerrado (con barra diagonal)
 */
function EyeIcon({
  visible,
  color = "#fff",
  size = 22,
}: {
  visible: boolean;
  color?: string;
  size?: number;
}) {
  const height = size * 0.6;
  return (
    <View
      style={{
        width: size,
        height,
        borderRadius: 999,
        borderWidth: 1.6,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {visible ? (
        <View
          style={{
            width: size * 0.25,
            height: size * 0.25,
            borderRadius: 999,
            backgroundColor: color,
          }}
        />
      ) : (
        <View
          style={{
            position: "absolute",
            width: size * 1.25,
            height: 1.6,
            backgroundColor: color,
            transform: [{ rotate: "25deg" }],
          }}
        />
      )}
    </View>
  );
}
