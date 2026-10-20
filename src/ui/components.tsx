/**
 * Sistema de diseño para truck-finance.
 *
 * Componentes reutilizables y temáticos (respetan light/dark automáticamente).
 * Use estos en vez de duplicar StyleSheet en cada pantalla.
 */
import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type PressableProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";

/* ============================================================
 *  Tokens (espaciado, radios, sombras)
 * ============================================================ */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  hero: { fontSize: 28, fontWeight: "800" } as TextStyle,
  h1: { fontSize: 22, fontWeight: "800" } as TextStyle,
  h2: { fontSize: 18, fontWeight: "700" } as TextStyle,
  title: { fontSize: 16, fontWeight: "700" } as TextStyle,
  body: { fontSize: 14, fontWeight: "400" } as TextStyle,
  bodyStrong: { fontSize: 14, fontWeight: "600" } as TextStyle,
  caption: { fontSize: 11, fontWeight: "600" } as TextStyle,
  micro: { fontSize: 10, fontWeight: "700" } as TextStyle,
} as const;

/* ============================================================
 *  Screen: wrapper con fondo temático + safe area top
 * ============================================================ */
export function Screen({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView
      edges={["top"]}
      style={[{ flex: 1, backgroundColor: colors.background }, style]}
    >
      {children}
    </SafeAreaView>
  );
}

/* ============================================================
 *  ScreenHeader: título grande + slot derecho (sync, botón +)
 * ============================================================ */
export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: spacing.md,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[typography.hero, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text
              style={[typography.body, { color: colors.textMuted, marginTop: 2 }]}
            >
              {subtitle}
            </Text>
          )}
        </View>
        {right && <View style={{ flexDirection: "row", gap: 8 }}>{right}</View>}
      </View>
    </View>
  );
}

/* ============================================================
 *  Card: superficie temática con borde + sombra sutil
 * ============================================================ */
export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    // sombra sutil (en dark no se ve, pero el borde mantiene la separación)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          style,
          pressed && { opacity: 0.85 },
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[cardStyle, style]}>{children}</View>;
}

/* ============================================================
 *  SectionTitle: rótulo pequeño encima de un grupo de Cards
 * ============================================================ */
export function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        typography.micro,
        {
          color: colors.textMuted,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginTop: spacing.md,
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.xs,
        },
      ]}
    >
      {children}
    </Text>
  );
}

/* ============================================================
 *  StatusPill: etiqueta de estado con color de fondo tinted
 * ============================================================ */
export type PillVariant = "success" | "warning" | "danger" | "info" | "neutral";

export function StatusPill({
  variant = "neutral",
  children,
}: {
  variant?: PillVariant;
  children: string;
}) {
  const { colors } = useTheme();
  const palette: Record<PillVariant, { fg: string; bg: string }> = {
    success: { fg: colors.success, bg: colors.primaryMuted },
    warning: { fg: colors.warning, bg: "rgba(234, 179, 8, 0.12)" },
    danger: { fg: colors.danger, bg: "rgba(220, 38, 38, 0.12)" },
    info: { fg: colors.info, bg: "rgba(14, 165, 233, 0.12)" },
    neutral: { fg: colors.textSecondary, bg: colors.surfaceMuted },
  };
  const p = palette[variant];
  return (
    <View
      style={{
        backgroundColor: p.bg,
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <Text style={[typography.caption, { color: p.fg }]}>{children}</Text>
    </View>
  );
}

/* ============================================================
 *  Stat: par label / valor en una columna
 * ============================================================ */
export function Stat({
  label,
  value,
  valueColor,
  icon,
}: {
  label: string;
  value: string;
  valueColor?: string;
  icon?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={[
          typography.micro,
          {
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          },
        ]}
      >
        {icon ? `${icon} ` : ""}
        {label}
      </Text>
      <Text
        style={[
          typography.bodyStrong,
          { color: valueColor ?? colors.text, marginTop: 2, fontSize: 15 },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

/* ============================================================
 *  Money: monto formateado con color opcional (positivo/negativo)
 * ============================================================ */
export function Money({
  amount,
  signed = false,
  size = "md",
}: {
  amount: number;
  signed?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const { colors } = useTheme();
  const isNeg = amount < 0;
  const prefix = signed ? (isNeg ? "−" : "+") : "";
  const formatted = `${prefix}$${Math.abs(amount).toLocaleString("es-CO")}`;
  const fontSize = size === "lg" ? 22 : size === "sm" ? 13 : 16;
  const color = isNeg ? colors.danger : colors.text;
  return (
    <Text style={{ fontSize, fontWeight: "800", color, fontVariant: ["tabular-nums"] }}>
      {formatted}
    </Text>
  );
}

/* ============================================================
 *  PrimaryButton: botón grande (acción principal de una pantalla)
 * ============================================================ */
type PrimaryButtonProps = PressableProps & {
  label: string;
  icon?: string;
  variant?: "primary" | "danger" | "ghost";
  loading?: boolean;
};

export function PrimaryButton({
  label,
  icon,
  variant = "primary",
  loading,
  disabled,
  style,
  ...rest
}: PrimaryButtonProps) {
  const { colors } = useTheme();
  const bg =
    variant === "danger"
      ? colors.danger
      : variant === "ghost"
        ? "transparent"
        : colors.primary;
  const fg = variant === "ghost" ? colors.primary : colors.textOnPrimary;
  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: disabled || loading ? colors.surfaceMuted : bg,
          borderRadius: radius.lg,
          paddingVertical: 16,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          marginTop: spacing.lg,
          marginBottom: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
      {...rest}
    >
      <Text style={{ fontSize: 16, fontWeight: "800", color: fg }}>
        {icon ? `${icon} ` : ""}
        {loading ? "Cargando..." : label}
      </Text>
    </Pressable>
  );
}

/* ============================================================
 *  IconButton: botón cuadrado pequeño (para header +, etc.)
 * ============================================================ */
export function IconButton({
  icon,
  onPress,
  variant = "primary",
}: {
  icon: string;
  onPress: () => void;
  variant?: "primary" | "ghost";
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          backgroundColor:
            variant === "primary" ? colors.primary : colors.surfaceMuted,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: radius.md,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: variant === "primary" ? colors.textOnPrimary : colors.text,
          fontWeight: "800",
          fontSize: 13,
        }}
      >
        {icon}
      </Text>
    </Pressable>
  );
}

/* ============================================================
 *  EmptyState: ilustración + título + subtítulo + CTA opcional
 * ============================================================ */
export function EmptyState({
  icon,
  title,
  subtitle,
  cta,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  cta?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.xxl,
      }}
    >
      <Text style={{ fontSize: 56, marginBottom: spacing.md }}>{icon}</Text>
      <Text style={[typography.h2, { color: colors.text, textAlign: "center" }]}>
        {title}
      </Text>
      {subtitle && (
        <Text
          style={[
            typography.body,
            { color: colors.textMuted, textAlign: "center", marginTop: 6 },
          ]}
        >
          {subtitle}
        </Text>
      )}
      {cta && <View style={{ marginTop: spacing.lg }}>{cta}</View>}
    </View>
  );
}

/* ============================================================
 *  Divider: separador horizontal sutil
 * ============================================================ */
export function Divider() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.sm,
      }}
    />
  );
}

/* ============================================================
 *  RouteArrow: origen → destino con tipografía clara
 * ============================================================ */
export function RouteArrow({
  origin,
  destination,
}: {
  origin: string;
  destination: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text
        style={[typography.bodyStrong, { color: colors.text, flexShrink: 1 }]}
        numberOfLines={1}
      >
        {origin}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>→</Text>
      <Text
        style={[typography.bodyStrong, { color: colors.text, flexShrink: 1 }]}
        numberOfLines={1}
      >
        {destination}
      </Text>
    </View>
  );
}
