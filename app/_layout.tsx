import { useEffect, useState } from "react";
import { Stack, useSegments, useRouter } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initializeDatabase } from "../src/db/init";
import { useAuthStore } from "../src/stores/auth.store";
import { initializeSync } from "../src/sync/init";
import {
  View,
  Text,
  ActivityIndicator,
  StatusBar,
  Pressable,
} from "react-native";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { session, loading: authLoading } = useAuthStore();

  const segments = useSegments();
  const router = useRouter();

  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // 1. Inicializar BD y Sync una sola vez
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initializeDatabase();
        await initializeSync();
        if (!cancelled) setReady(true);
      } catch (e: any) {
        console.error("[APP] Error de inicialización:", e);
        if (!cancelled) setInitError(e?.message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const retry = () => {
    setInitError(null);
    setReady(false);
    setRetryCount((c) => c + 1);
  };

  // 2. Manejar redirecciones de autenticación
  useEffect(() => {
    if (!ready || authLoading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!session && !inAuthGroup) {
      router.replace("/auth/login");
    } else if (session && inAuthGroup) {
      router.replace("/");
    }
  }, [session, authLoading, ready, segments, router]);

  if (initError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "white",
          padding: 24,
        }}
      >
        <Text style={{ fontSize: 40, marginBottom: 16 }}>⚠️</Text>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "#dc2626",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          No se pudo inicializar la app
        </Text>
        <Text
          style={{
            color: "#6b7280",
            textAlign: "center",
            marginBottom: 8,
            lineHeight: 20,
          }}
        >
          Error al crear la base de datos local:
        </Text>
        <Text
          style={{
            color: "#111827",
            fontFamily: "monospace",
            textAlign: "center",
            marginBottom: 24,
            fontSize: 12,
          }}
        >
          {initError}
        </Text>
        <Pressable
          onPress={retry}
          style={{
            backgroundColor: "#2563eb",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  // 3. Pantalla de carga
  if (!ready || authLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "white",
        }}
      >
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, color: "#6b7280" }}>
          Cargando Truck Finance...
        </Text>
      </View>
    );
  }

  // 4. Renderizar el Stack
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="trips/new"
          options={{ title: "Nuevo viaje", presentation: "modal" }}
        />
        <Stack.Screen
          name="trips/[id]"
          options={{ title: "Detalle del viaje" }}
        />
        <Stack.Screen
          name="trips/[id]/add-expense"
          options={{ title: "Agregar gasto", presentation: "modal" }}
        />
        <Stack.Screen
          name="expenses/add"
          options={{ title: "Nuevo gasto general", presentation: "modal" }}
        />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
