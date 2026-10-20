import { View, Text, FlatList, Pressable } from "react-native";
import { Link } from "expo-router";
import { useGeneralExpenses } from "../../src/hooks/useGeneralExpenses";
import { useExpenseCategories } from "../../src/hooks/useExpenseCategories";
import { useTheme } from "../../src/theme/ThemeContext";
import { SyncIndicator } from "../../src/ui/SyncIndicator";
import {
  Screen,
  ScreenHeader,
  Card,
  EmptyState,
  PrimaryButton,
} from "../../src/ui/components";

// Mapa de iconos por código (fallback para gastos viejos sin category_id)
const CATEGORY_ICONS: Record<string, string> = {
  MANTENIMIENTO: "🔧",
  ACEITE: "🛢️",
  LLANTAS: "🛞",
  REPARACION: "🛠️",
  IMPUESTOS: "📄",
  SEGUROS: "🛡️",
  LAVADO: "🚿",
  OTRO: "📦",
  COMBUSTIBLE: "⛽",
  PEAJE: "🛣️",
  DESCARGUE: "📦",
  OTRO_VIAJE: "🔧",
};

export default function GeneralExpenses() {
  const { colors } = useTheme();
  const expenses = useGeneralExpenses();
  const { categories } = useExpenseCategories();

  // Mapa code → label
  const labelByCode = new Map<string, string>();
  for (const c of categories) labelByCode.set(c.code, c.label);

  const getCategoryIcon = (code: string) => CATEGORY_ICONS[code] || "📦";
  const getCategoryLabel = (code: string) => labelByCode.get(code) ?? code;

  return (
    <Screen>
      <ScreenHeader
        title="Gastos"
        subtitle="Gastos generales del camión (no asociados a un viaje)"
        right={
          <>
            <SyncIndicator />
            <Link href="/expenses/add" asChild>
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
        data={expenses}
        keyExtractor={(item) => item._local_id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Card>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              {/* Avatar icon */}
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: colors.surfaceMuted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 22 }}>
                  {getCategoryIcon(item.category_code)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 11,
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {getCategoryLabel(item.category_code)}
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 15,
                    fontWeight: "700",
                    marginTop: 2,
                  }}
                  numberOfLines={2}
                >
                  {item.description || getCategoryLabel(item.category_code)}
                </Text>
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 12,
                    marginTop: 2,
                  }}
                >
                  📅 {item.date}
                  {item.mileage
                    ? ` · 🛣️ ${item.mileage.toLocaleString()} km`
                    : ""}
                </Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    color: colors.danger,
                    fontSize: 16,
                    fontWeight: "800",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  −${Number(item.amount).toLocaleString("es-CO")}
                </Text>
                {item.receipt_url || item.receipt_local ? (
                  <Text
                    style={{
                      color: colors.textMuted,
                      fontSize: 10,
                      marginTop: 2,
                    }}
                  >
                    📷 recibo
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🧾"
            title="Sin gastos generales"
            subtitle="Registra mantenimiento, aceite, llantas, etc."
            cta={
              <Link href="/expenses/add" asChild>
                <PrimaryButton label="Agregar gasto" icon="+" />
              </Link>
            }
          />
        }
      />
    </Screen>
  );
}
