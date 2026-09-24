import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { syncStore } from '../sync/sync.store';
import { useSyncExternalStore } from 'react';
import { getDatabase } from '../db/connection';
import { supabase } from '../supabase/client';
import { SyncService } from '../sync/sync.service';

const subscribe = (cb: () => void) => syncStore.subscribe(cb);
const getSnapshot = () => syncStore.getState();

export function SyncIndicator() {
  const { online, syncing, pendingCount } = useSyncExternalStore(subscribe, getSnapshot);

  let color = '#dc2626';
  let label = 'Sin conexión';

  if (online) {
    if (syncing) {
      color = '#eab308';
      label = 'Sincronizando...';
    } else if (pendingCount > 0) {
      color = '#eab308';
      label = `${pendingCount} pendientes`;
    } else {
      color = '#16a34a';
      label = 'Sincronizado';
    }
  }

  const handlePress = async () => {
    if (!online) {
      Alert.alert('Sin conexión', 'Conéctate a internet para sincronizar.');
      return;
    }
    try {
      const db = await getDatabase();
      const syncSvc = new SyncService(db, supabase);
      await syncSvc.syncAll();
      Alert.alert('Éxito', 'Sincronización completada');
    } catch (e) {
      Alert.alert('Error', 'No se pudo sincronizar');
    }
  };

  return (
    <Pressable onPress={handlePress} style={s.container}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={s.text}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, color: '#374151', fontWeight: '500' },
});