import { useEffect, useState } from 'react';
import { getDatabase } from '../db/connection';
import { SettingsRepository, type SettingsRow } from '../db/repositories/settings.repo';
import { useAuthStore } from '../stores/auth.store';
import type { Settings } from '../finance/calculator';

// 1. Traductor: Convierte de BD (snake_case) a Calculadora (camelCase)
function rowToSettings(row: SettingsRow): Settings {
  return {
    sourceRetPct: row.source_ret_pct,
    icaRetPct: row.ica_ret_pct,
    tieMode: (row.tie_mode === 'deduct' ? 'deduct' : 'charge_per_moto') as 'deduct' | 'charge_per_moto',
    tieFixed: row.tie_fixed,
    tiePerMoto: row.tie_per_moto,
    advancePct: row.advance_pct,
    unloadPerMoto: row.unload_per_moto,
    tenPctEnabled: row.ten_pct_enabled === 1,
    tenPctLabel: row.ten_pct_label,
    tenPctBase: (row.ten_pct_base === 'gross_freight' ? 'gross_freight' : 'net_freight') as 'gross_freight' | 'net_freight',
    tenPctKind: (row.ten_pct_kind === 'discount' ? 'discount' : 'expense') as 'discount' | 'expense',
    tenPctAffects: (row.ten_pct_affects === 'freight' ? 'freight' : 'advance') as 'freight' | 'advance',
    tenPctValue: row.ten_pct_value,
  };
}

// 2. Traductor inverso: Convierte de Calculadora (camelCase) a BD (snake_case)
function settingsToInput(settings: Partial<Settings>) {
  const input: any = {};
  if (settings.sourceRetPct !== undefined) input.source_ret_pct = settings.sourceRetPct;
  if (settings.icaRetPct !== undefined) input.ica_ret_pct = settings.icaRetPct;
  if (settings.tieMode !== undefined) input.tie_mode = settings.tieMode === 'deduct' ? 'deduct' : 'charge_per_moto';
  if (settings.tieFixed !== undefined) input.tie_fixed = settings.tieFixed;
  if (settings.tiePerMoto !== undefined) input.tie_per_moto = settings.tiePerMoto;
  if (settings.advancePct !== undefined) input.advance_pct = settings.advancePct;
  if (settings.unloadPerMoto !== undefined) input.unload_per_moto = settings.unloadPerMoto;
  if (settings.tenPctEnabled !== undefined) input.ten_pct_enabled = settings.tenPctEnabled;
  if (settings.tenPctLabel !== undefined) input.ten_pct_label = settings.tenPctLabel;
  if (settings.tenPctBase !== undefined) input.ten_pct_base = settings.tenPctBase;
  if (settings.tenPctKind !== undefined) input.ten_pct_kind = settings.tenPctKind;
  if (settings.tenPctAffects !== undefined) input.ten_pct_affects = settings.tenPctAffects;
  if (settings.tenPctValue !== undefined) input.ten_pct_value = settings.tenPctValue;
  return input;
}

// Valor por defecto seguro para evitar errores mientras carga la BD
const DEFAULT_SETTINGS: Settings = {
  sourceRetPct: 1,
  icaRetPct: 1,
  tieMode: 'deduct',
  tieFixed: 130000,
  tiePerMoto: 4000,
  advancePct: 70,
  unloadPerMoto: 3500,
  tenPctEnabled: false,
  tenPctLabel: 'Concepto 10%',
  tenPctBase: 'net_freight',
  tenPctKind: 'discount',
  tenPctAffects: 'freight',
  tenPctValue: 10,
};

// 3. Hook para LEER la configuración (SIEMPRE devuelve camelCase)
export function useSettings(): Settings {
  const [settings, setSettings] = useState<Settings | null>(null);
  const userId = useAuthStore.getState().user?.id;

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      try {
        const db = await getDatabase();
        const repo = new SettingsRepository(db);
        const row = await repo.getOrCreate(userId);
        setSettings(rowToSettings(row));
      } catch (e) {
        console.error('Error cargando settings:', e);
      }
    };

    load();
  }, [userId]);

  return settings ?? DEFAULT_SETTINGS;
}

// 4. Hook para ACTUALIZAR la configuración (Recibe camelCase, guarda snake_case)
export function useUpdateSettings() {
  const userId = useAuthStore.getState().user?.id;

  return async (inputSettings: Partial<Settings>) => {
    if (!userId) throw new Error('No user');
    const db = await getDatabase();
    const repo = new SettingsRepository(db);
    
    // Convertir de camelCase a snake_case antes de guardar en la BD
    const dbInput = settingsToInput(inputSettings);
    
    const updatedRow = await repo.update(userId, dbInput);
    return rowToSettings(updatedRow);
  };
}