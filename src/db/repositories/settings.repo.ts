import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../../utils/id';

export type SettingsRow = {
  _local_id: string;
  _server_id: string | null;
  _sync_status: string;
  _dirty: number;
  _deleted: number;
  _created_at: string;
  _updated_at: string;
  user_id: string;
  source_ret_pct: number;
  ica_ret_pct: number;
  tie_mode: string;
  tie_fixed: number;
  tie_per_moto: number;
  advance_pct: number;
  unload_per_moto: number;
  ten_pct_enabled: number;
  ten_pct_label: string;
  ten_pct_base: string;
  ten_pct_kind: string;
  ten_pct_affects: string;
  ten_pct_value: number;
};

export type SettingsInput = {
  userId: string;
  source_ret_pct?: number;
  ica_ret_pct?: number;
  tie_mode?: string;
  tie_fixed?: number;
  tie_per_moto?: number;
  advance_pct?: number;
  unload_per_moto?: number;
  ten_pct_enabled?: boolean;
  ten_pct_label?: string;
  ten_pct_base?: string;
  ten_pct_kind?: string;
  ten_pct_affects?: string;
  ten_pct_value?: number;
};

export class SettingsRepository {
  constructor(private db: SQLiteDatabase) {}

  async getOrCreate(userId: string): Promise<SettingsRow> {
    const existing = await this.db.getFirstAsync<SettingsRow>(
      `SELECT * FROM local_settings WHERE user_id = ? AND _deleted = 0`,
      [userId]
    );

    if (existing) return existing;

    // Crear settings por defecto
    const now = new Date().toISOString();
    const localId = generateId();

    await this.db.runAsync(
      `INSERT INTO local_settings (
        _local_id, _server_id, _sync_status, _dirty, _deleted, _created_at, _updated_at,
        user_id, source_ret_pct, ica_ret_pct, tie_mode, tie_fixed, tie_per_moto,
        advance_pct, unload_per_moto, ten_pct_enabled, ten_pct_label, ten_pct_base,
        ten_pct_kind, ten_pct_affects, ten_pct_value
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        localId, null, 'pending', 1, 0, now, now,
        userId, 1.0, 1.0, 'deduct', 130000, 4000,
        70.0, 3500, 0, 'Concepto 10%', 'net_freight',
        'discount', 'freight', 10.0,
      ]
    );

    return (await this.db.getFirstAsync<SettingsRow>(
      `SELECT * FROM local_settings WHERE _local_id = ?`,
      [localId]
    ))!;
  }

  async update(userId: string, input: Partial<SettingsInput>): Promise<SettingsRow> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];

    if (input.source_ret_pct !== undefined) {
      fields.push('source_ret_pct = ?');
      values.push(input.source_ret_pct);
    }
    if (input.ica_ret_pct !== undefined) {
      fields.push('ica_ret_pct = ?');
      values.push(input.ica_ret_pct);
    }
    if (input.tie_mode !== undefined) {
      fields.push('tie_mode = ?');
      values.push(input.tie_mode);
    }
    if (input.tie_fixed !== undefined) {
      fields.push('tie_fixed = ?');
      values.push(input.tie_fixed);
    }
    if (input.tie_per_moto !== undefined) {
      fields.push('tie_per_moto = ?');
      values.push(input.tie_per_moto);
    }
    if (input.advance_pct !== undefined) {
      fields.push('advance_pct = ?');
      values.push(input.advance_pct);
    }
    if (input.unload_per_moto !== undefined) {
      fields.push('unload_per_moto = ?');
      values.push(input.unload_per_moto);
    }
    if (input.ten_pct_enabled !== undefined) {
      fields.push('ten_pct_enabled = ?');
      values.push(input.ten_pct_enabled ? 1 : 0);
    }
    if (input.ten_pct_label !== undefined) {
      fields.push('ten_pct_label = ?');
      values.push(input.ten_pct_label);
    }
    if (input.ten_pct_base !== undefined) {
      fields.push('ten_pct_base = ?');
      values.push(input.ten_pct_base);
    }
    if (input.ten_pct_kind !== undefined) {
      fields.push('ten_pct_kind = ?');
      values.push(input.ten_pct_kind);
    }
    if (input.ten_pct_affects !== undefined) {
      fields.push('ten_pct_affects = ?');
      values.push(input.ten_pct_affects);
    }
    if (input.ten_pct_value !== undefined) {
      fields.push('ten_pct_value = ?');
      values.push(input.ten_pct_value);
    }

    fields.push('_updated_at = ?');
    values.push(now);
    fields.push('_dirty = 1');

    values.push(userId);

    await this.db.runAsync(
      `UPDATE local_settings SET ${fields.join(', ')} WHERE user_id = ? AND _deleted = 0`,
      values
    );

    return (await this.db.getFirstAsync<SettingsRow>(
      `SELECT * FROM local_settings WHERE user_id = ? AND _deleted = 0`,
      [userId]
    ))!;
  }
}