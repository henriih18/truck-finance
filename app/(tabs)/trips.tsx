import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useTrips } from '../../src/hooks/useTrips';

export default function TripsList() {
  const trips = useTrips();

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Viajes</Text>
        <Link href="/trips/new" asChild>
          <Pressable style={s.addButton}>
            <Text style={s.addText}>+ Nuevo</Text>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(t) => t._local_id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <Link href={`/trips/${item._local_id}`} asChild>
            <Pressable style={s.card}>
              <View style={s.rowBetween}>
                <Text style={s.tripTitle}>Viaje #{item.tripNumber}</Text>
                <Text
                  style={
                    item.balance_status === 'paid' ? s.statusPaid : s.statusPending
                  }
                >
                  {item.balance_status === 'paid' ? '🟢 Paz y salvo' : '🔴 Pendiente'}
                </Text>
              </View>
              <Text style={s.route}>
                {item.origin} → {item.destination}
              </Text>
              <Text style={s.route}>{item.motoQty} motos · {item.date}</Text>
              <View style={[s.rowBetween, { marginTop: 12 }]}>
                <Info label="Flete" value={`$${item.grossFreight.toLocaleString('es-CO')}`} />
                <Info label="Neto" value={`$${item.net_freight.toLocaleString('es-CO')}`} />
                <Info label="Cumplido" value={`$${item.balance.toLocaleString('es-CO')}`} />
              </View>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40, color: '#6b7280' }}>
            Sin viajes aún.
          </Text>
        }
      />
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addText: { color: 'white', fontWeight: 'bold' },
  card: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  tripTitle: { fontWeight: 'bold', fontSize: 16, color: '#111827' },
  statusPaid: { color: '#059669', fontWeight: '600' },
  statusPending: { color: '#dc2626', fontWeight: '600' },
  route: { color: '#4b5563', marginTop: 4 },
  infoLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
});