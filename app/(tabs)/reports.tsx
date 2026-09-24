import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Share } from 'react-native';
import { useTrips } from '../../src/hooks/useTrips';
import { useGeneralExpenses } from '../../src/hooks/useGeneralExpenses';

type Period = 'today' | 'week' | 'month' | 'year' | 'all';

export default function Reports() {
  const trips = useTrips();
  const generalExpenses = useGeneralExpenses();
  const [period, setPeriod] = useState<Period>('month');

  // Filtrar viajes y gastos según el período seleccionado
  const filteredData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - (now.getDay() * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    let startDate = 0;
    if (period === 'today') startDate = startOfToday;
    else if (period === 'week') startDate = startOfWeek;
    else if (period === 'month') startDate = startOfMonth;
    else if (period === 'year') startDate = startOfYear;

    const filteredTrips = trips.filter((t) => {
      if (period === 'all') return true;
      return new Date(t.date).getTime() >= startDate;
    });

    const filteredExpenses = generalExpenses.filter((e) => {
      if (period === 'all') return true;
      return new Date(e.date).getTime() >= startDate;
    });

    return { filteredTrips, filteredExpenses };
  }, [trips, generalExpenses, period]);

  // Calcular totales
  const totals = useMemo(() => {
    const totalGross = filteredData.filteredTrips.reduce((sum, t) => sum + t.gross_freight, 0);
    const totalNet = filteredData.filteredTrips.reduce((sum, t) => sum + t.net_freight, 0);
    const totalAdvance = filteredData.filteredTrips.reduce((sum, t) => sum + t.advance, 0);
    const totalBalancePending = filteredData.filteredTrips
      .filter((t) => t.status === 'finished' && t.balance_status === 'pending')
      .reduce((sum, t) => sum + t.balance, 0);
    
    // Gastos de viaje + Gastos generales
    const tripExpensesTotal = filteredData.filteredTrips.reduce((sum, t) => {
      // Nota: En una app real, sumaríamos los gastos individuales de cada viaje. 
      // Aquí usamos una estimación basada en el descargue o podemos sumar los generales.
      return sum; 
    }, 0);
    
    const generalExpensesTotal = filteredData.filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = tripExpensesTotal + generalExpensesTotal;
    
    // Ganancia estimada = Flete Neto - Gastos Totales
    const estimatedProfit = totalNet - totalExpenses;

    return {
      totalGross,
      totalNet,
      totalAdvance,
      totalBalancePending,
      totalExpenses,
      estimatedProfit,
    };
  }, [filteredData]);

  // Función para exportar a CSV
  const handleExportCSV = async () => {
    try {
      const headers = ['Fecha', 'Cliente', 'Origen', 'Destino', 'Flete Total', 'Flete Neto', 'Anticipo', 'Cumplido', 'Estado'];
      const rows = filteredData.filteredTrips.map((t) => [
        t.date,
        t.client,
        t.origin,
        t.destination,
        t.gross_freight,
        t.net_freight,
        t.advance,
        t.balance,
        t.balance_status === 'paid' ? 'Pagado' : 'Pendiente',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      await Share.share({
        message: `Reporte de Viajes - ${period.toUpperCase()}\n\n${csvContent}`,
        title: 'Reporte_TruckFinance.csv',
      });
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar el reporte');
    }
  };

  const formatMoney = (amount: number) => `$${amount.toLocaleString('es-CO')}`;

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Reportes</Text>
      </View>

      {/* Selector de Período */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.periodScroll}>
        <PeriodButton label="Hoy" active={period === 'today'} onPress={() => setPeriod('today')} />
        <PeriodButton label="Semana" active={period === 'week'} onPress={() => setPeriod('week')} />
        <PeriodButton label="Mes" active={period === 'month'} onPress={() => setPeriod('month')} />
        <PeriodButton label="Año" active={period === 'year'} onPress={() => setPeriod('year')} />
        <PeriodButton label="Todo" active={period === 'all'} onPress={() => setPeriod('all')} />
      </ScrollView>

      {/* Tarjetas de Resumen */}
      <View style={s.summaryGrid}>
        <SummaryCard label="Flete Neto" value={formatMoney(totals.totalNet)} color="#2563eb" />
        <SummaryCard label="Gastos Totales" value={formatMoney(totals.totalExpenses)} color="#dc2626" />
        <SummaryCard label="Ganancia Est." value={formatMoney(totals.estimatedProfit)} color="#059669" />
        <SummaryCard label="Por Cobrar" value={formatMoney(totals.totalBalancePending)} color="#d97706" />
      </View>

      {/* Botón de Exportar */}
      <Pressable style={s.exportButton} onPress={handleExportCSV}>
        <Text style={s.exportButtonText}>📥 Exportar a CSV / Excel</Text>
      </Pressable>

      {/* Lista de Viajes del Período */}
      <View style={s.listHeader}>
        <Text style={s.listTitle}>Viajes en este período ({filteredData.filteredTrips.length})</Text>
      </View>

      {filteredData.filteredTrips.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>📊</Text>
          <Text style={s.emptyText}>Sin datos para este período</Text>
        </View>
      ) : (
        filteredData.filteredTrips.map((t) => (
          <View key={t._local_id} style={s.tripItem}>
            <View style={s.tripHeader}>
              <Text style={s.tripDate}>{t.date}</Text>
              <Text style={t.balance_status === 'paid' ? s.statusPaid : s.statusPending}>
                {t.balance_status === 'paid' ? 'Pagado' : 'Pendiente'}
              </Text>
            </View>
            <Text style={s.tripClient}>{t.client}</Text>
            <Text style={s.tripRoute}>{t.origin} → {t.destination}</Text>
            <View style={s.tripFooter}>
              <Text style={s.tripNet}>Neto: {formatMoney(t.net_freight)}</Text>
              <Text style={s.tripBalance}>Cumplido: {formatMoney(t.balance)}</Text>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function PeriodButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[s.periodBtn, active && s.periodBtnActive]} onPress={onPress}>
      <Text style={[s.periodText, active && s.periodTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[s.summaryCard, { borderLeftColor: color }]}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryValue, { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  periodScroll: { paddingVertical: 12, paddingHorizontal: 16 },
  periodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  periodBtnActive: { backgroundColor: '#2563eb' },
  periodText: { color: '#4b5563', fontWeight: '600' },
  periodTextActive: { color: 'white' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  summaryCard: {
    width: '47%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  summaryLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  exportButton: {
    backgroundColor: '#059669',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  listHeader: { paddingHorizontal: 16, marginBottom: 8 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  tripItem: {
    backgroundColor: '#f9fafb',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  tripDate: { fontSize: 12, color: '#6b7280' },
  statusPaid: { fontSize: 12, color: '#059669', fontWeight: '600' },
  statusPending: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  tripClient: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  tripRoute: { fontSize: 13, color: '#4b5563', marginTop: 2 },
  tripFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  tripNet: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  tripBalance: { fontSize: 13, color: '#059669', fontWeight: '600' },
  emptyState: { alignItems: 'center', marginTop: 40, padding: 16 },
  emptyText: { fontSize: 16, color: '#6b7280' },
});