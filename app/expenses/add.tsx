import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ExpensesRepository } from '../../src/db/repositories/expenses.repo';
import { getDatabase } from '../../src/db/connection';
import { useAuthStore } from '../../src/stores/auth.store';

type Category = 'MANTENIMIENTO' | 'ACEITE' | 'LLANTAS' | 'REPARACION' | 'IMPUESTOS' | 'SEGUROS' | 'LAVADO' | 'OTRO';

export default function AddGeneralExpense() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>('MANTENIMIENTO');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [mileage, setMileage] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

    const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a la cámara para tomar fotos de los recibos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setReceiptUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert('Error', 'Ingresa un valor válido para el gasto.');
      return;
    }

    setLoading(true);
    try {
      const db = await getDatabase();
      const expensesRepo = new ExpensesRepository(db);
      
      await expensesRepo.create({
        userId: useAuthStore.getState().user?.id || 'local-user',
        tripId: undefined, // NULL = gasto general
        categoryCode: category,
        description: description || category,
        amount: Number(amount),
        date: new Date().toISOString().slice(0, 10),
        mileage: mileage ? Number(mileage) : undefined,
        receiptLocal: receiptUri || undefined,
      });

      Alert.alert('Éxito', 'Gasto general registrado correctamente');
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo guardar el gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.container}>
      <Text style={s.title}>Gasto General del Camión</Text>

      <Text style={s.label}>CATEGORÍA</Text>
      <View style={s.categoryRow}>
        {(['MANTENIMIENTO', 'ACEITE', 'LLANTAS', 'REPARACION', 'IMPUESTOS', 'SEGUROS', 'LAVADO', 'OTRO'] as Category[]).map((cat) => (
          <Pressable
            key={cat}
            style={[s.catButton, category === cat && s.catButtonActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[s.catText, category === cat && s.catTextActive]}>{cat}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.label}>VALOR ($)</Text>
      <TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" />

      <Text style={s.label}>DESCRIPCIÓN (Opcional)</Text>
      <TextInput style={s.input} value={description} onChangeText={setDescription} placeholder="Ej: Cambio de aceite 15W40" />

      <Text style={s.label}>KILOMETRAJE ACTUAL (Opcional)</Text>
      <TextInput style={s.input} value={mileage} onChangeText={setMileage} keyboardType="numeric" placeholder="Ej: 150400" />

            <Text style={s.label}>FOTO DEL RECIBO</Text>
      <View style={s.photoRow}>
        <Pressable style={s.photoButton} onPress={takePhoto}>
          <Text style={s.photoButtonText}> Tomar Foto</Text>
        </Pressable>
        <Pressable style={s.photoButton} onPress={pickImage}>
          <Text style={s.photoButtonText}>🖼️ Galería</Text>
        </Pressable>
      </View>
      {receiptUri && (
        <View style={s.photoPreview}>
          <Text style={{ color: '#059669', fontWeight: '600' }}>✅ Foto seleccionada</Text>
        </View>
      )}

      <Pressable style={[s.button, loading && s.buttonDisabled]} onPress={handleSave} disabled={loading}>
        <Text style={s.buttonText}>{loading ? 'Guardando...' : 'GUARDAR GASTO'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  label: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginTop: 16, letterSpacing: 0.5 },
  input: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, marginTop: 4, fontSize: 16, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  catButton: { minWidth: '30%', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  catButtonActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  catText: { color: '#374151', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  catTextActive: { color: 'white' },
  photoButton: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', backgroundColor: '#e0e7ff', borderWidth: 1, borderColor: '#c7d2fe', marginTop: 4 },
  photoButtonText: { color: '#3730a3', fontWeight: '600' },
  photoPreview: { marginTop: 12, padding: 12, backgroundColor: '#ecfdf5', borderRadius: 8, alignItems: 'center' },
  button: { backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 32, marginBottom: 16 },
  buttonDisabled: { backgroundColor: '#93c5fd' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});