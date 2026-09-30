import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../../utils/id';

export type NewTruck = {
  userId: string;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  mileage?: number;
  notes?: string;
};

export type TruckRow = {
  _local_id: string;
  _server_id: string | null;
  _sync_status: string;
  _dirty: number;
  _deleted: number;
  _created_at: string;
  _updated_at: string;
  user_id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  notes: string | null;
};

export type TruckInput = Partial<Omit<NewTruck, 'userId'>>;

export class TrucksRepository {
  constructor(private db: SQLiteDatabase) {}

  async create(input: NewTruck): Promise<TruckRow> {
    const now = new Date().toISOString();
    const localId = generateId();

    await this.db.runAsync(
      `INSERT INTO local_trucks (
        _local_id, _server_id, _sync_status, _dirty, _deleted, _created_at, _updated_at,
        user_id, plate, brand, model, year, mileage, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        localId, null, 'pending', 1, 0, now, now,
        input.userId, input.plate, input.brand ?? null, input.model ?? null,
        input.year ?? null, input.mileage ?? 0, input.notes ?? null,
      ],
    );

    return this.getById(localId) as Promise<TruckRow>;
  }

  async getById(localId: string): Promise<TruckRow | null> {
    return this.db.getFirstAsync<TruckRow>(
      `SELECT * FROM local_trucks WHERE _local_id = ? AND _deleted = 0`,
      [localId],
    );
  }

  async listAll(userId: string): Promise<TruckRow[]> {
    return this.db.getAllAsync<TruckRow>(
      `SELECT * FROM local_trucks WHERE user_id = ? AND _deleted = 0 ORDER BY plate ASC`,
      [userId],
    );
  }

  async update(localId: string, input: TruckInput): Promise<TruckRow | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (input.plate !== undefined) {
      fields.push('plate = ?');
      values.push(input.plate);
    }
    if (input.brand !== undefined) {
      fields.push('brand = ?');
      values.push(input.brand);
    }
    if (input.model !== undefined) {
      fields.push('model = ?');
      values.push(input.model);
    }
    if (input.year !== undefined) {
      fields.push('year = ?');
      values.push(input.year);
    }
    if (input.mileage !== undefined) {
      fields.push('mileage = ?');
      values.push(input.mileage);
    }
    if (input.notes !== undefined) {
      fields.push('notes = ?');
      values.push(input.notes);
    }

    if (fields.length === 0) return this.getById(localId);

    fields.push('_updated_at = ?');
    values.push(new Date().toISOString());
    fields.push('_dirty = 1');
    values.push(localId);

    await this.db.runAsync(
      `UPDATE local_trucks SET ${fields.join(', ')} WHERE _local_id = ? AND _deleted = 0`,
      values,
    );

    return this.getById(localId);
  }

  async softDelete(localId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_trucks SET _deleted = 1, _dirty = 1, _sync_status = 'pending', _updated_at = ? WHERE _local_id = ?`,
      [now, localId],
    );
  }

  async updateMileage(localId: string, mileage: number): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_trucks SET mileage = ?, _updated_at = ?, _dirty = 1, _sync_status = 'pending' WHERE _local_id = ?`,
      [mileage, now, localId],
    );
  }
}