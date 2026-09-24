import { Tabs } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, StyleSheet } from 'react-native';

export default function TabsLayout() {
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#6b7280',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#e5e7eb',
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 8,
            height: 65,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginBottom: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏠</Text>,
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: 'Viajes',
            tabBarIcon: () => <Text style={{ fontSize: 22 }}>🚚</Text>,
          }}
        />
        <Tabs.Screen
          name="receivable"
          options={{
            title: 'Por cobrar',
            tabBarIcon: () => <Text style={{ fontSize: 22 }}>💰</Text>,
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Gastos',
            tabBarIcon: () => <Text style={{ fontSize: 22 }}>🧾</Text>,
          }}
        />
                <Tabs.Screen
          name="reports"
          options={{
            title: 'Reportes',
            tabBarIcon: () => <Text style={{ fontSize: 22 }}>📊</Text>,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Config',
            tabBarIcon: () => <Text style={{ fontSize: 22 }}>️⚙️</Text>,
          }}
        />

      </Tabs>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});