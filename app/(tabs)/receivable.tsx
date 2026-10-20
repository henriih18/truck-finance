import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";
import { useTrips } from "../../src/hooks/useTrips";
import { useTripsRepo } from "../../src/hooks/useTripsRepo";
import { useTheme } from "../../src/theme/ThemeContext";
import { SyncIndicator } from "../../src/ui/SyncIndicator";
import {
  Screen,
  ScreenHeader,
  Card,
  RouteArrow,
  StatusPill,
  EmptyState,
  spacing,
} from "../../src/ui/components";

export default function Receivable() {
  const { colors } = useTheme();
  const allTrips = useTrips();
  const repo = useTripsRepo();

  const receivableTrips = allTrips.filter(
    (t) => t.status === "finished" && t.balance_status === "pending",
  );

  const totalReceivable = receivableTrips.reduce(
    (sum, t) => sum + t.balance,
    0,
  );

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
      "Registrar pago",
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
          },
        },
      ],
    );
  };

  if (!repo) {
    return (
      <Screen>
        <ScreenHeader title="Por cobrar" />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title="Por cobrar"
        subtitle="Cumplidos pendientes de pago"
        right={<SyncIndicator />}
      />

      {/* HERO: total pendiente */}
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <View
          style={{
            backgroundColor: colors.danger,
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
            💰 Total pendiente
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
            ${totalReceivable.toLocaleString("es-CO")}
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: 13,
              marginTop: 6,
            }}
          >
            {receivableTrips.length} viaje(s) por cobrar
          </Text>
        </View>
      </View>

      <FlatList
        data={receivableTrips}
        keyExtractor={(t) => t._local_id}
        contentContainerStyle={{ padding: 16, paddingTop: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const days = getDaysPending(item._updated_at);
          const urgency =
            days >= 30 ? "danger" : days >= 15 ? "warning" : "neutral";
          return (
            <Card>
              {/* Header: trip number + days pill */}
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
                    #{item.trip_number}
                  </Text>
                </View>
                <StatusPill variant={urgency as any}>
                  {days >= 30 ? "⚠️ " : ""}
                  {days} día{days === 1 ? "" : "s"} pendiente
                </StatusPill>
              </View>

              {/* Ruta */}
              <RouteArrow origin={item.origin} destination={item.destination} />

              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                👤 {item.client}
              </Text>

              {/* Cumplido destacado */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 16,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 11,
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Cumplido (30%)
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 22,
                      fontWeight: "900",
                      marginTop: 2,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    ${item.balance.toLocaleString("es-CO")}
                  </Text>
                </View>
              </View>

              {/* Acciones */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
                <Link href={`/trips/${item._local_id}`} asChild>
                  <Pressable
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 12,
                        alignItems: "center",
                        backgroundColor: colors.surfaceMuted,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      Ver detalle
                    </Text>
                  </Pressable>
                </Link>
                <Pressable
                  style={({ pressed }) => [
                    {
                      flex: 1.5,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: colors.primary,
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 6,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                  onPress={() =>
                    handleMarkPaid(
                      item._local_id,
                      item.trip_number,
                      item.balance,
                    )
                  }
                >
                  <Text
                    style={{
                      color: colors.textOnPrimary,
                      fontWeight: "800",
                      fontSize: 13,
                    }}
                  >
                    ✓ Marcar pagado
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="🎉"
            title="¡Todo al día!"
            subtitle="No tienes viajes pendientes por cobrar."
          />
        }
      />
    </Screen>
  );
}
