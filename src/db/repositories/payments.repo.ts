import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../../utils/id';

/**
 * Tipos de pago soportados:
 *  - 'advance'   → Anticipo (el 70% del flete neto que se recibe al iniciar)
 *  - 'balance'   → Cumplido (el 30% restante, recibido al finalizar el viaje)
 *  - 'extra'     → Otros pagos relacionados con el viaje
 */
export type PaymentKind = 'advance' | 'balance' | 'extra';

export type NewPayment = {
  userId: string;
  tripId: string;
  kind: PaymentKind;
  amount: number;
  date: string;
  method?: string;
  notes?: string;
};

export type PaymentRow = {
  _local_id: string;
  _server_id: string | null;
  _sync_status: string;
  _dirty: number;
  _deleted: number;
  _created_at: string;
  _updated_at: string;
  user_id: string;
  trip_id: string;
  kind: string;
  amount: number;
  date: string;
  method: string | null;
  notes: string | null;
};

export type PaymentInput = Partial<Omit<NewPayment, 'userId' | 'tripId'>>;

export class PaymentsRepository {
  constructor(private db: SQLiteDatabase) {}

  async create(input: NewPayment): Promise<PaymentRow> {
    const now = new Date().toISOString();
    const localId = generateId();

    await this.db.runAsync(
      `INSERT INTO local_payments (
        _local_id, _server_id, _sync_status, _dirty, _deleted, _created_at, _updated_at,
        user_id, trip_id, kind, amount, date, method, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        localId, null, 'pending', 1, 0, now, now,
        input.userId, input.tripId, input.kind, input.amount, input.date,
        input.method ?? null, input.notes ?? null,
      ],
    );

    return this.getById(localId) as Promise<PaymentRow>;
  }

  async getById(localId: string): Promise<PaymentRow | null> {
    return this.db.getFirstAsync<PaymentRow>(
      `SELECT * FROM local_payments WHERE _local_id = ? AND _deleted = 0`,
      [localId],
    );
  }

  async listByTrip(tripId: string): Promise<PaymentRow[]> {
    return this.db.getAllAsync<PaymentRow>(
      `SELECT * FROM local_payments WHERE trip_id = ? AND _deleted = 0 ORDER BY date DESC`,
      [tripId],
    );
  }

  async listAdvanceByTrip(tripId: string): Promise<PaymentRow[]> {
    return this.db.getAllAsync<PaymentRow>(
      `SELECT * FROM local_payments WHERE trip_id = ? AND kind = 'advance' AND _deleted = 0 ORDER BY date DESC`,
      [tripId],
    );
  }

  async listBalanceByTrip(tripId: string): Promise<PaymentRow[]> {
    return this.db.getAllAsync<PaymentRow>(
      `SELECT * FROM local_payments WHERE trip_id = ? AND kind = 'balance' AND _deleted = 0 ORDER BY date DESC`,
      [tripId],
    );
  }

  async getTotalByTrip(tripId: string): Promise<number> {
    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM local_payments WHERE trip_id = ? AND _deleted = 0`,
      [tripId],
    );
    return result?.total ?? 0;
  }

  async getTotalAdvanceByTrip(tripId: string): Promise<number> {
    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM local_payments WHERE trip_id = ? AND kind = 'advance' AND _deleted = 0`,
      [tripId],
    );
    return result?.total ?? 0;
  }

  async getTotalBalanceByTrip(tripId: string): Promise<number> {
    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM local_payments WHERE trip_id = ? AND kind = 'balance' AND _deleted = 0`,
      [tripId],
    );
    return result?.total ?? 0;
  }

  async update(localId: string, input: PaymentInput): Promise<PaymentRow | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (input.kind !== undefined) {
      fields.push('kind = ?');
      values.push(input.kind);
    }
    if (input.amount !== undefined) {
      fields.push('amount = ?');
      values.push(input.amount);
    }
    if (input.date !== undefined) {
      fields.push('date = ?');
      values.push(input.date);
    }
    if (input.method !== undefined) {
      fields.push('method = ?');
      values.push(input.method);
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
      `UPDATE local_payments SET ${fields.join(', ')} WHERE _local_id = ? AND _deleted = 0`,
      values,
    );

    return this.getById(localId);
  }

  async softDelete(localId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_payments SET _deleted = 1, _dirty = 1, _sync_status = 'pending', _updated_at = ? WHERE _local_id = ?`,
      [now, localId],
    );
  }
}
