import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTrips } from '../../src/hooks/useTrips';
import { SyncIndicator } from '../../src/ui/SyncIndicator';

export default function Dashboard() {
  const trips = useTrips();

  const finished = trips.filter((t) => t.status === 'finished');
  const totalBalance = finished
    .filter((t) => t.balance_status === 'pending')
    .reduce((a, t) => a + t.balance, 0);
  const totalNet = trips.reduce((a, t) => a + t.net_freight, 0);
  const totalAdvance = trips.reduce((a, t) => a + t.advance, 0);

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Dashboard</Text>
        <SyncIndicator />
      </View>

      <View style={s.content}>
        {/* Tarjeta principal: Por Cobrar */}
        <View style={s.cardPorCobrar}>
          <Text style={s.cardLabel}>💰 POR COBRAR</Text>
          <Text style={s.cardValue}>${totalBalance.toLocaleString('es-CO')}</Text>
          <Text style={s.cardSub}>
            {finished.filter((t) => t.balance_status === 'pending').length} viajes pendientes
          </Text>
        </View>

        {/* Estadísticas */}
        <View style={s.statsRow}>
          <StatCard label="Viajes" value={trips.length.toString()} />
          <StatCard label="Fletes netos" value={`$${totalNet.toLocaleString('es-CO')}`} />
        </View>

        <View style={s.statsRow}>
          <StatCard label="Anticipos" value={`$${totalAdvance.toLocaleString('es-CO')}`} />
          <StatCard label="Cumplidos pagados" value="$0" />
        </View>

        {/* Botón nuevo viaje */}
        <Link href="/trips/new" asChild>
          <Pressable style={s.button}>
            <Text style={s.buttonText}>+ NUEVO VIAJE</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  content: { padding: 16 },
  cardPorCobrar: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  cardValue: { color: 'white', fontSize: 36, fontWeight: 'bold', marginTop: 8 },
  cardSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
  },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  statValue: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginTop: 4 },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});