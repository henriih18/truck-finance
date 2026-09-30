import type { SQLiteDatabase } from 'expo-sqlite';

export type DiscountRow = {
  _local_id: string;
  _server_id: string | null;
  _sync_status: string;
  _dirty: number;
  _deleted: number;
  _created_at: string;
  _updated_at: string;
  trip_id: string;
  code: string;
  label: string;
  amount: number;
};

export class DiscountsRepository {
  constructor(private db: SQLiteDatabase) {}

  async listByTrip(tripId: string): Promise<DiscountRow[]> {
    return this.db.getAllAsync<DiscountRow>(
      `SELECT * FROM local_trip_discounts WHERE trip_id = ? AND _deleted = 0 ORDER BY _created_at ASC`,
      [tripId],
    );
  }

  async getTotalByTrip(tripId: string): Promise<number> {
    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM local_trip_discounts WHERE trip_id = ? AND _deleted = 0`,
      [tripId],
    );
    return result?.total ?? 0;
  }

  async getTotalDiscountsByTrip(tripId: string): Promise<number> {
    // Solo descuentos positivos (restan del flete)
    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM local_trip_discounts WHERE trip_id = ? AND amount > 0 AND _deleted = 0`,
      [tripId],
    );
    return result?.total ?? 0;
  }

  async getTotalChargesByTrip(tripId: string): Promise<number> {
    // Solo cargos negativos (suman al flete, como amarre por moto)
    const result = await this.db.getFirstAsync<{ total: number }>(
      `SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM local_trip_discounts WHERE trip_id = ? AND amount < 0 AND _deleted = 0`,
      [tripId],
    );
    return result?.total ?? 0;
  }
}