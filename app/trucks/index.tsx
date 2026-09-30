import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTrucks } from '../../src/hooks/useTrucks';
import { useAuthStore } from '../../src/stores/auth.store';
import type { TruckRow } from '../../src/db/repositories/trucks.repo';

export default function TrucksScreen() {
  const router = useRouter();
  const { trucks, loading, create, update, remove } = useTrucks();
  const user = useAuthStore((s) => s.user);

  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<TruckRow | null>(null);

  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [notes, setNotes] = useState('');

  const openNew = () => {
    setEditing(null);
    setPlate(''); setBrand(''); setModel(''); setYear(''); setMileage(''); setNotes('');
    setModalVisible(true);
  };

  const openEdit = (t: TruckRow) => {
    setEditing(t);
    setPlate(t.plate); setBrand(t.brand ?? ''); setModel(t.model ?? '');
    setYear(t.year ? String(t.year) : '');
    setMileage(t.mileage ? String(t.mileage) : '');
    setNotes(t.notes ?? '');
    setModalVisible(true);
  };

  const save = async () => {
    if (!plate.trim()) {
      Alert.alert('Falta la placa', 'La placa es obligatoria.');
      return;
    }
    try {
      const payload = {
        plate: plate.trim().toUpperCase(),
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        year: year ? Number(year) : undefined,
        mileage: mileage ? Number(mileage) : undefined,
        notes: notes.trim() || undefined,
      };
      if (editing) {
        await update(editing._local_id, payload);
      } else {
        await create({
          userId: user?.id ?? 'local-user',
          ...payload,
          mileage: payload.mileage ?? 0,
        });
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar');
    }
  };

  const confirmDelete = (t: TruckRow) => {
    Alert.alert(
      'Eliminar camión',
      `¿Eliminar el camión ${t.plate}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try { await remove(t._local_id); }
            catch (e: any) { Alert.alert('Error', e?.message); }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>← Volver</Text>
        </Pressable>
        <Text style={s.title}>Mis Camiones</Text>
        <View style={{ width: 70 }} />
      </View>

      {trucks.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🚛</Text>
          <Text style={s.emptyTitle}>No tienes camiones registrados</Text>
          <Text style={s.emptySub}>Agrega tu primer camión para asociarlo a los viajes.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {trucks.map((t) => (
            <Pressable
              key={t._local_id}
              style={s.card}
              onPress={() => openEdit(t)}
              onLongPress={() => confirmDelete(t)}
            >
              <View style={s.cardHeader}>
                <Text style={s.plate}>{t.plate}</Text>
                <Text style={s.mileageBadge}>
                  {t.mileage ? `${t.mileage.toLocaleString('es-CO')} km` : 'Sin km'}
                </Text>
              </View>
              <Text style={s.cardSub}>
                {[t.brand, t.model, t.year].filter(Boolean).join(' · ') || 'Sin detalles'}
              </Text>
              {t.notes ? <Text style={s.cardNotes}>{t.notes}</Text> : null}
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable style={s.fab} onPress={openNew}>
        <Text style={s.fabText}>+ Nuevo camión</Text>
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <ScrollView>
              <Text style={s.modalTitle}>
                {editing ? 'Editar camión' : 'Nuevo camión'}
              </Text>

              <Text style={s.label}>PLACA *</Text>
              <TextInput
                style={s.input}
                value={plate}
                onChangeText={(t) => setPlate(t.toUpperCase())}
                placeholder="Ej: ABC123"
                autoCapitalize="characters"
              />

              <Text style={s.label}>MARCA</Text>
              <TextInput style={s.input} value={brand} onChangeText={setBrand} placeholder="Ej: Freightliner" />

              <Text style={s.label}>MODELO</Text>
              <TextInput style={s.input} value={model} onChangeText={setModel} placeholder="Ej: Cascadia" />

              <Text style={s.label}>AÑO</Text>
              <TextInput style={s.input} value={year} onChangeText={setYear} keyboardType="numeric" placeholder="Ej: 2020" />

              <Text style={s.label}>KILOMETRAJE</Text>
              <TextInput style={s.input} value={mileage} onChangeText={setMileage} keyboardType="numeric" placeholder="0" />

              <Text style={s.label}>OBSERVACIONES</Text>
              <TextInput
                style={[s.input, { minHeight: 60 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Notas internas..."
                multiline
              />

              <View style={s.modalActions}>
                <Pressable
                  style={[s.modalBtn, s.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={s.cancelText}>Cancelar</Text>
                </Pressable>
                <Pressable style={[s.modalBtn, s.saveBtn]} onPress={save}>
                  <Text style={s.saveText}>Guardar</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  backBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  backText: { color: '#059669', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plate: { fontSize: 20, fontWeight: 'bold', color: '#111827', letterSpacing: 1 },
  mileageBadge: { fontSize: 12, color: '#059669', fontWeight: '600', backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  cardSub: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  cardNotes: { fontSize: 12, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fabText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  label: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 10, letterSpacing: 0.5 },
  input: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4, fontSize: 16, color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#f3f4f6' },
  cancelText: { color: '#374151', fontWeight: '600' },
  saveBtn: { backgroundColor: '#059669' },
  saveText: { color: 'white', fontWeight: 'bold' },
});
