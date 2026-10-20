import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { useTrips } from "../../src/hooks/useTrips";
import { useTheme } from "../../src/theme/ThemeContext";
import { SyncIndicator } from "../../src/ui/SyncIndicator";
import {
  Screen,
  ScreenHeader,
  Card,
  StatusPill,
  RouteArrow,
  EmptyState,
  PrimaryButton,
  spacing,
  typography,
} from "../../src/ui/components";

export default function TripsList() {
  const { colors } = useTheme();
  const trips = useTrips();

  return (
    <Screen>
      <ScreenHeader
        title="Viajes"
        subtitle={`${trips.length} viaje${trips.length === 1 ? "" : "s"} registrado${
          trips.length === 1 ? "" : "s"
        }`}
        right={
          <>
            <SyncIndicator />
            <Link href="/trips/new" asChild>
              <Pressable
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.primary,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.textOnPrimary,
                    fontWeight: "800",
                    fontSize: 13,
                  }}
                >
                  + Nuevo
                </Text>
              </Pressable>
            </Link>
          </>
        }
      />

      <FlatList
        data={trips}
        keyExtractor={(t) => t._local_id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => (
          <Link href={`/trips/${item._local_id}`} asChild>
            <Pressable
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <Card>
                {/* Header: #viaje + status pill */}
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
                  <StatusPill
                    variant={
                      item.balance_status === "paid"
                        ? "success"
                        : item.status === "finished"
                          ? "warning"
                          : "info"
                    }
                  >
                    {item.balance_status === "paid"
                      ? "✓ Paz y salvo"
                      : item.status === "finished"
                        ? "Pendiente"
                        : "En curso"}
                  </StatusPill>
                </View>

                {/* Ruta */}
                <RouteArrow
                  origin={item.origin}
                  destination={item.destination}
                />

                {/* Meta info */}
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  🚛 {item.moto_qty} motos · 📅 {item.date}
                </Text>

                {/* Stats: 3 columnas */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <MiniStat
                    label="Flete"
                    value={`$${item.gross_freight.toLocaleString("es-CO")}`}
                  />
                  <MiniStat
                    label="Neto"
                    value={`$${item.net_freight.toLocaleString("es-CO")}`}
                  />
                  <MiniStat
                    label="Cumplido"
                    value={`$${item.balance.toLocaleString("es-CO")}`}
                    highlight={item.balance_status === "pending"}
                  />
                </View>
              </Card>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🚚"
            title="Sin viajes aún"
            subtitle="Crea tu primer viaje para empezar a llevar el control financiero."
            cta={
              <Link href="/trips/new" asChild>
                <PrimaryButton label="Crear viaje" icon="+" />
              </Link>
            }
          />
        }
      />
    </Screen>
  );
}

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: 10,
          color: colors.textMuted,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: "800",
          color: highlight ? colors.danger : colors.text,
          marginTop: 2,
          fontVariant: ["tabular-nums"],
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
