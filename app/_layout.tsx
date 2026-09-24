import { useEffect, useState } from "react";
import { Stack, useSegments, useRouter } from "expo-router";
import { View, Text, ActivityIndicator, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initializeDatabase } from "../src/db/init";
import { useAuthStore } from "../src/stores/auth.store";
import { initializeSync } from "../src/sync/init";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const { session, loading: authLoading } = useAuthStore();

  const segments = useSegments();
  const router = useRouter();

  // 1. Inicializar BD y Sync una sola vez
  useEffect(() => {
    (async () => {
      try {
        console.log("[APP] Inicializando base de datos...");
        await initializeDatabase();
        console.log("[APP] BD lista, inicializando sync...");
        await initializeSync();
        console.log("[APP] Todo listo");
        setReady(true);
      } catch (e: any) {
        console.error("[APP] Error:", e);
        setReady(true); // Para no bloquear la app
      }
    })();
  }, []);

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