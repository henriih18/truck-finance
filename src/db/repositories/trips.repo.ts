import type { SQLiteDatabase } from 'expo-sqlite';
import { calculateTripFinancials, type Settings, type TripInput } from '../../finance/calculator';
import { generateId } from '../../utils/id';

export type NewTrip = {
  userId: string;
  truckId?: string;
  tripNumber: string;
  date: string;
  client: string;
  origin: string;
  destination: string;
  cargoType?: string;
  motoQty: number;
  grossFreight: number;
  tieDeducted: boolean;
  notes?: string;
  initialMileage?: number;
};

export type TripRow = NewTrip & {
  _local_id: string;
  _server_id: string | null;
  net_freight: number;
  advance: number;
  balance: number;
  status: 'in_progress' | 'finished';
  balance_status: 'pending' | 'paid';
  balance_paid_at: string | null;
  balance_amount: number | null;
  balance_method: string | null;
  balance_notes: string | null;
  _created_at: string;
  _updated_at: string;
};

export class TripsRepository {
  constructor(private db: SQLiteDatabase) {}

  async create(input: NewTrip, settings: Settings): Promise<TripRow> {
    const ti: TripInput = {
      grossFreight: input.grossFreight,
      motoQty: input.motoQty,
      tieDeducted: input.tieDeducted,
    };
    const f = calculateTripFinancials(settings, ti);

    const now = new Date().toISOString();
    const localId = generateId();

    await this.db.runAsync(
      `INSERT INTO local_trips (
        _local_id, _server_id, _sync_status, _dirty, _deleted, _created_at, _updated_at,
        user_id, truck_id, trip_number, date, client, origin, destination, cargo_type,
        moto_qty, gross_freight, net_freight, advance, balance, status, balance_status,
        balance_paid_at, balance_amount, balance_method, balance_notes, notes,
        initial_mileage, final_mileage
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        localId, null, 'pending', 1, 0, now, now,
        input.userId, input.truckId ?? null, input.tripNumber, input.date,
        input.client, input.origin, input.destination, input.cargoType ?? null,
        input.motoQty, f.grossFreight, f.netFreight, f.advance, f.balance,
        'in_progress', 'pending',
        null, null, null, null, input.notes ?? null, input.initialMileage ?? null, null,
      ],
    );

    for (const d of f.discounts) {
      const dId = generateId();
      await this.db.runAsync(
        `INSERT INTO local_trip_discounts (
          _local_id, _server_id, _sync_status, _dirty, _deleted, _created_at, _updated_at,
          trip_id, code, label, amount
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [dId, null, 'pending', 1, 0, now, now, localId, d.code, d.label, d.amount],
      );
    }

    return this.getById(localId) as Promise<TripRow>;
  }

  async getById(localId: string): Promise<TripRow | null> {
    return this.db.getFirstAsync<TripRow>(
      `SELECT * FROM local_trips WHERE _local_id = ? AND _deleted = 0`,
      [localId],
    );
  }

  async listAll(): Promise<TripRow[]> {
    return this.db.getAllAsync<TripRow>(
      `SELECT * FROM local_trips WHERE _deleted = 0 ORDER BY date DESC, _created_at DESC`,
    );
  }

  async finish(localId: string) {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_trips SET status = 'finished', _dirty = 1, _sync_status = 'pending', _updated_at = ? WHERE _local_id = ?`,
      [now, localId],
    );
  }

  async markBalancePaid(
    localId: string,
    amount: number,
    paidAt: string,
    method?: string,
    notes?: string,
  ) {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_trips SET
         balance_status = 'paid',
         balance_paid_at = ?,
         balance_amount = ?,
         balance_method = ?,
         balance_notes = ?,
         _dirty = 1, _sync_status = 'pending', _updated_at = ?
       WHERE _local_id = ?`,
      [paidAt, amount, method ?? null, notes ?? null, now, localId],
    );
  }
}