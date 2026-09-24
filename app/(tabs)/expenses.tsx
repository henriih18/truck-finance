import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { useGeneralExpenses } from '../../src/hooks/useGeneralExpenses';

export default function GeneralExpenses() {
  const expenses = useGeneralExpenses();

  const getCategoryIcon = (code: string) => {
    const icons: Record<string, string> = {
      MANTENIMIENTO: '🔧', ACEITE: '🛢️', LLANTAS: '🛞', REPARACION: '🛠️',
      IMPUESTOS: '📄', SEGUROS: '🛡️', LAVADO: '🚿', OTRO: '📦'
    };
    return icons[code] || '📦';
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Gastos del Camión</Text>
        <Link href="/expenses/add" asChild>
          <Pressable style={s.addButton}>
            <Text style={s.addText}>+ Nuevo</Text>
          </Pressable>
        </Link>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item._local_id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.rowBetween}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>{getCategoryIcon(item.category_code)}</Text>
                <View>
                  <Text style={s.category}>{item.category_code}</Text>
                  <Text style={s.description}>{item.description}</Text>
                </View>
              </View>
              <Text style={s.amount}>-${Number(item.amount).toLocaleString('es-CO')}</Text>
            </View>
            <Text style={s.date}>
              {item.date} {item.mileage ? `· Km: ${item.mileage}` : ''}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>🚚</Text>
            <Text style={s.emptyText}>Sin gastos generales</Text>
            <Text style={s.emptySub}>Registra mantenimiento, aceite, llantas, etc.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  addButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addText: { color: 'white', fontWeight: 'bold' },
  card: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  category: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  description: { fontSize: 15, color: '#111827', fontWeight: '600', marginTop: 2 },
  amount: { fontSize: 16, color: '#dc2626', fontWeight: 'bold' },
  date: { fontSize: 12, color: '#6b7280', marginTop: 8 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  emptySub: { color: '#6b7280', marginTop: 4, textAlign: 'center' },
});