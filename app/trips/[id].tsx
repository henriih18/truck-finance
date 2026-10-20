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
import { useTheme } from "../../src/theme/ThemeContext";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import {
  Screen,
  Card,
  SectionTitle,
  StatusPill,
  PrimaryButton,
  Divider,
  RouteArrow,
  spacing,
  typography,
} from "../../src/ui/components";

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
  const { colors } = useTheme();
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
      <Screen>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textMuted }}>
            Cargando datos del viaje...
          </Text>
        </View>
      </Screen>
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

  const expensesByCategory = Object.keys(CATEGORIES)
    .map((code) => {
      const total = expenses
        .filter((e) => e.category_code === code)
        .reduce((a, e) => a + e.amount, 0);
      return { code, ...CATEGORIES[code], total };
    })
    .filter((c) => c.total > 0);

  const fuelExpenseTotal = expenses
    .filter((e) => e.category_code === "COMBUSTIBLE")
    .reduce((a, e) => a + e.amount, 0);

  const mileageMetrics = calculateMileageMetrics({
    initialMileage: trip.initial_mileage,
    finalMileage: trip.final_mileage,
    fuelExpense: fuelExpenseTotal,
    totalExpenses: expensesTotal,
  });

  const onFinish = () => {
    Alert.alert("Finalizar viaje", "¿Confirmas que el viaje ha terminado?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Finalizar",
        onPress: () => {
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
    <Screen>
      {/* HERO Header con número de viaje + estado */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 6,
          }}
        >
          <View
            style={{
              backgroundColor: colors.primaryMuted,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                color: colors.primary,
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 1,
              }}
            >
              #{trip.trip_number}
            </Text>
          </View>
          <StatusPill
            variant={
              trip.balance_status === "paid"
                ? "success"
                : trip.status === "finished"
                  ? "warning"
                  : "info"
            }
          >
            {trip.balance_status === "paid"
              ? "✓ Paz y salvo"
              : trip.status === "finished"
                ? "Pendiente"
                : "En curso"}
          </StatusPill>
        </View>

        <RouteArrow origin={trip.origin} destination={trip.destination} />

        <View
          style={{
            flexDirection: "row",
            gap: 12,
            marginTop: 8,
            flexWrap: "wrap",
          }}
        >
          {trip.client ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              👤 {trip.client}
            </Text>
          ) : null}
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            📅 {trip.date}
          </Text>
          {trip.moto_qty > 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              🛵 {trip.moto_qty} motos
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 80 }}
      >
        {/* FLETE TOTAL */}
        <SectionTitle>Flete</SectionTitle>
        <Card>
          <DetailRow
            label="Flete total"
            value={`$${trip.gross_freight.toLocaleString("es-CO")}`}
            big
          />
        </Card>

        {/* DESCUENTOS */}
        <SectionTitle>Descuentos del flete</SectionTitle>
        <Card>
          {discounts.length === 0 ? (
            <Text
              style={{
                color: colors.textMuted,
                fontStyle: "italic",
                paddingVertical: 8,
              }}
            >
              Sin descuentos aplicados.
            </Text>
          ) : (
            <>
              {discounts.map((d) => {
                const isDiscount = d.amount > 0;
                return (
                  <DetailRow
                    key={d._local_id}
                    label={d.label}
                    value={`${isDiscount ? "−" : "+"}$${Math.abs(d.amount).toLocaleString("es-CO")}`}
                    valueColor={isDiscount ? colors.danger : colors.success}
                  />
                );
              })}
              {totalCharges > 0 && (
                <>
                  <Divider />
                  <DetailRow
                    label="Total descuentos"
                    value={`−$${totalDiscounts.toLocaleString("es-CO")}`}
                    valueColor={colors.danger}
                  />
                  <DetailRow
                    label="Total cargos extra"
                    value={`+$${totalCharges.toLocaleString("es-CO")}`}
                    valueColor={colors.success}
                  />
                </>
              )}
            </>
          )}
        </Card>

        {/* FLETE NETO - HERO */}
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 16,
            padding: 20,
            marginTop: spacing.sm,
            marginBottom: spacing.md,
          }}
        >
          <Text
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Flete neto
          </Text>
          <Text
            style={{
              color: "white",
              fontSize: 28,
              fontWeight: "900",
              marginTop: 4,
              fontVariant: ["tabular-nums"],
            }}
          >
            ${trip.net_freight.toLocaleString("es-CO")}
          </Text>
        </View>

        {/* ANTICIPO */}
        <SectionTitle>Anticipo</SectionTitle>
        <Card>
          <DetailRow
            label="Anticipo recibido"
            value={`$${trip.advance.toLocaleString("es-CO")}`}
            big
            valueColor={colors.success}
          />
        </Card>

        {/* GASTOS DEL VIAJE */}
        <SectionTitle>Gastos del viaje</SectionTitle>
        <Card>
          {expensesByCategory.length > 0 ? (
            <>
              {expensesByCategory.map((cat) => (
                <DetailRow
                  key={cat.code}
                  label={`${cat.icon} ${cat.label}`}
                  value={`$${cat.total.toLocaleString("es-CO")}`}
                />
              ))}
              <Divider />
            </>
          ) : (
            <Text
              style={{
                color: colors.textMuted,
                fontStyle: "italic",
                paddingVertical: 8,
              }}
            >
              Sin gastos registrados aún.
            </Text>
          )}

          <DetailRow
            label="Total gastos"
            value={`$${expensesTotal.toLocaleString("es-CO")}`}
            valueColor={colors.danger}
          />
          <DetailRow
            label="Disponible del anticipo"
            value={`$${available.toLocaleString("es-CO")}`}
            big
            valueColor={available >= 0 ? colors.success : colors.danger}
          />

          <Link href={`/trips/${id}/add-expense`} asChild>
            <Pressable
              style={({ pressed }) => [
                {
                  backgroundColor: colors.primary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  marginTop: 12,
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: colors.textOnPrimary,
                  fontWeight: "800",
                  fontSize: 14,
                }}
              >
                + Agregar gasto
              </Text>
            </Pressable>
          </Link>

          {expenses.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textMuted,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Detalle
              </Text>
              {expenses.map((exp) => {
                const cat = CATEGORIES[exp.category_code] ?? {
                  label: exp.category_code,
                  icon: "🔧",
                };
                return (
                  <View
                    key={exp._local_id}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        flex: 1,
                      }}
                    >
                      <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.text,
                            fontWeight: "600",
                            fontSize: 14,
                          }}
                          numberOfLines={1}
                        >
                          {exp.description || cat.label}
                        </Text>
                        <Text
                          style={{
                            color: colors.textMuted,
                            fontSize: 12,
                          }}
                        >
                          {exp.date}
                          {exp.mileage
                            ? ` · Km: ${exp.mileage.toLocaleString("es-CO")}`
                            : ""}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        color: colors.danger,
                        fontWeight: "800",
                        fontSize: 14,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      −${Number(exp.amount).toLocaleString("es-CO")}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </Card>

        {/* CUMPLIDO */}
        <SectionTitle>Cumplido (30%)</SectionTitle>
        <Card>
          <DetailRow
            label="Valor"
            value={`$${trip.balance.toLocaleString("es-CO")}`}
            big
          />
          <DetailRow
            label="Estado"
            value={
              trip.balance_status === "paid" ? "✓ Paz y salvo" : "🔴 Pendiente"
            }
            valueColor={
              trip.balance_status === "paid" ? colors.success : colors.danger
            }
          />
          {trip.balance_status === "paid" && trip.balance_paid_at && (
            <>
              <Divider />
              <DetailRow
                label="Pagado el"
                value={trip.balance_paid_at.slice(0, 10)}
              />
              {trip.balance_amount != null && (
                <DetailRow
                  label="Valor recibido"
                  value={`$${trip.balance_amount.toLocaleString("es-CO")}`}
                />
              )}
              {trip.balance_method && (
                <DetailRow label="Método" value={trip.balance_method} />
              )}
              {trip.balance_notes && (
                <DetailRow label="Observaciones" value={trip.balance_notes} />
              )}
            </>
          )}
        </Card>

        {/* KILOMETRAJE */}
        {(trip.initial_mileage != null || trip.final_mileage != null) && (
          <>
            <SectionTitle>Kilometraje</SectionTitle>
            <Card>
              {trip.initial_mileage != null && (
                <DetailRow
                  label="Km inicial"
                  value={`${trip.initial_mileage.toLocaleString("es-CO")} km`}
                />
              )}
              {trip.final_mileage != null && (
                <DetailRow
                  label="Km final"
                  value={`${trip.final_mileage.toLocaleString("es-CO")} km`}
                />
              )}
              {mileageMetrics.distance != null && (
                <>
                  <Divider />
                  <DetailRow
                    label="Km recorridos"
                    value={`${mileageMetrics.distance.toLocaleString("es-CO")} km`}
                    big
                  />
                </>
              )}
              {mileageMetrics.distance != null &&
                mileageMetrics.distance > 0 && (
                  <>
                    {mileageMetrics.fuelCostPerKm != null && (
                      <DetailRow
                        label="Combustible / km"
                        value={`$${mileageMetrics.fuelCostPerKm.toLocaleString("es-CO")}`}
                        valueColor={colors.danger}
                      />
                    )}
                    {mileageMetrics.costPerKm != null && (
                      <DetailRow
                        label="Costo total / km"
                        value={`$${mileageMetrics.costPerKm.toLocaleString("es-CO")}`}
                        valueColor={colors.danger}
                      />
                    )}
                    {fuelExpenseTotal > 0 && (
                      <DetailRow
                        label="Gasto en combustible"
                        value={`$${fuelExpenseTotal.toLocaleString("es-CO")}`}
                      />
                    )}
                  </>
                )}
              {trip.status === "in_progress" &&
                trip.initial_mileage == null && (
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontStyle: "italic",
                      paddingVertical: 8,
                    }}
                  >
                    ℹ️ No se registró kilometraje inicial. Se podrá ingresar el
                    final al finalizar el viaje.
                  </Text>
                )}
            </Card>
          </>
        )}

        {/* BOTONES DE ACCIÓN */}
        {trip.status === "in_progress" && (
          <PrimaryButton
            label="FINALIZAR VIAJE"
            icon="✓"
            onPress={onFinish}
            style={{ backgroundColor: "#ea580c" }}
          />
        )}
        {trip.status === "finished" && trip.balance_status === "pending" && (
          <PrimaryButton
            label="MARCAR COMO PAZ Y SALVO"
            icon="💰"
            onPress={onMarkPaid}
          />
        )}
      </ScrollView>

      {/* MODAL DE PAGO */}
      <Modal visible={showPayModal} animationType="slide" transparent>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 20,
          }}
          onPress={() => setShowPayModal(false)}
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
                {
                  color: colors.text,
                  textAlign: "center",
                  marginBottom: 16,
                },
              ]}
            >
              Registrar pago del cumplido
            </Text>

            <Field
              label="Fecha de pago"
              value={payDate}
              onChangeText={setPayDate}
            />

            <Field
              label="Valor recibido ($)"
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
            />

            <Text
              style={{
                fontSize: 11,
                color: colors.textMuted,
                fontWeight: "700",
                marginTop: 12,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Método de pago
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              {["Efectivo", "Transferencia", "Cheque"].map((m) => (
                <Pressable
                  key={m}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
                      backgroundColor:
                        payMethod === m ? colors.primary : colors.surfaceMuted,
                      borderWidth: 1,
                      borderColor:
                        payMethod === m ? colors.primary : colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() => setPayMethod(m)}
                >
                  <Text
                    style={{
                      color:
                        payMethod === m
                          ? colors.textOnPrimary
                          : colors.textSecondary,
                      fontWeight: "700",
                      fontSize: 12,
                    }}
                  >
                    {m}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Field
              label="Observaciones (opcional)"
              value={payNotes}
              onChangeText={setPayNotes}
              multiline
            />

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 20,
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: colors.surfaceMuted,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => setShowPayModal(false)}
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
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={handleConfirmPay}
              >
                <Text
                  style={{
                    color: colors.textOnPrimary,
                    fontWeight: "800",
                  }}
                >
                  Confirmar pago
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* MODAL DE FINALIZACIÓN */}
      <Modal visible={showFinishModal} animationType="slide" transparent>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            padding: 20,
          }}
          onPress={() => setShowFinishModal(false)}
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
                {
                  color: colors.text,
                  textAlign: "center",
                  marginBottom: 8,
                },
              ]}
            >
              Finalizar viaje
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.textMuted,
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Registra el kilometraje final del camión (opcional).
              {trip.initial_mileage != null
                ? `\nKm inicial: ${trip.initial_mileage.toLocaleString("es-CO")} km`
                : ""}
            </Text>

            <Field
              label="Kilometraje final"
              value={finalMileage}
              onChangeText={setFinalMileage}
              keyboardType="numeric"
              placeholder="Ej: 150000"
            />

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 20,
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: colors.surfaceMuted,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={() => setShowFinishModal(false)}
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
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: "#ea580c",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                onPress={handleConfirmFinish}
              >
                <Text
                  style={{
                    color: "white",
                    fontWeight: "800",
                  }}
                >
                  Finalizar
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}

/* ============================================================
 *  DetailRow: label + value con jerarquía
 * ============================================================ */
function DetailRow({
  label,
  value,
  big,
  valueColor,
}: {
  label: string;
  value: string;
  big?: boolean;
  valueColor?: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: valueColor ?? colors.text,
          fontWeight: big ? "800" : "600",
          fontSize: big ? 18 : 14,
          fontVariant: ["tabular-nums"],
          marginLeft: 12,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

/* ============================================================
 *  Field: label + input (para los modals)
 * ============================================================ */
function Field({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: "default" | "numeric";
  placeholder?: string;
  multiline?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View>
      <Text
        style={{
          fontSize: 11,
          color: colors.textMuted,
          fontWeight: "700",
          marginTop: 12,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <TextInput
        style={{
          backgroundColor: colors.surfaceMuted,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginTop: 4,
          fontSize: 16,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: multiline ? 70 : 44,
          textAlignVertical: multiline ? "top" : "center",
        }}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
      />
    </View>
  );
}
