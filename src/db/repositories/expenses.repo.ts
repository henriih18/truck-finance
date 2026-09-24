import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../../utils/id';

export type NewExpense = {
  userId: string;
  tripId?: string;
  categoryCode: string;
  description?: string;
  amount: number;
  date: string;
  mileage?: number;
  receiptLocal?: string;
  notes?: string;
};

export type ExpenseRow = {
  _local_id: string;
  _server_id: string | null;
  _sync_status: string;
  _dirty: number;
  _deleted: number;
  _created_at: string;
  _updated_at: string;
  user_id: string;
  trip_id: string | null;
  category_code: string;
  description: string | null;
  amount: number;
  date: string;
  mileage: number | null;
  receipt_url: string | null;
  receipt_local: string | null;
  notes: string | null;
};

export class ExpensesRepository {
  constructor(private db: SQLiteDatabase) {}

  async create(input: NewExpense): Promise<ExpenseRow> {
    const now = new Date().toISOString();
    const localId = generateId();

    await this.db.runAsync(
      `INSERT INTO local_expenses (
        _local_id, _server_id, _sync_status, _dirty, _deleted, _created_at, _updated_at,
        user_id, trip_id, category_code, description, amount, date, mileage,
        receipt_url, receipt_local, notes
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        localId, null, 'pending', 1, 0, now, now,
        input.userId, input.tripId ?? null, input.categoryCode,
        input.description ?? null, input.amount, input.date,
        input.mileage ?? null, null, input.receiptLocal ?? null, input.notes ?? null,
      ],
    );

    return this.getById(localId) as Promise<ExpenseRow>;
  }

  async getById(localId: string): Promise<ExpenseRow | null> {
    return this.db.getFirstAsync<ExpenseRow>(
      `SELECT * FROM local_expenses WHERE _local_id = ? AND _deleted = 0`,
      [localId],
    );
  }

  async listByTrip(tripId: string): Promise<ExpenseRow[]> {
    return this.db.getAllAsync<ExpenseRow>(
      `SELECT * FROM local_expenses WHERE trip_id = ? AND _deleted = 0 ORDER BY date DESC`,
      [tripId],
    );
  }

  async getTotalByTrip(tripId: string): Promise<number> {
    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM local_expenses WHERE trip_id = ? AND _deleted = 0`,
      [tripId],
    );
    return result?.total ?? 0;
  }

  async listGeneral(): Promise<ExpenseRow[]> {
    return this.db.getAllAsync<ExpenseRow>(
      `SELECT * FROM local_expenses WHERE trip_id IS NULL AND _deleted = 0 ORDER BY date DESC`,
    );
  }
}