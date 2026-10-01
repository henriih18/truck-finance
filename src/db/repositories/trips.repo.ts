import type { SQLiteDatabase } from "expo-sqlite";
import {
  calculateTripFinancials,
  type Settings,
  type TripInput,
} from "../../finance/calculator";
import { generateId } from "../../utils/id";
import { PaymentsRepository } from "./payments.repo";
import { ExpensesRepository } from "./expenses.repo";
import { TrucksRepository } from "./trucks.repo";

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
  // Per-viaje overrides (opcionales; si no se pasan, se usan los de settings)
  tieFixed?: number;
  tiePerMoto?: number;
  advancePct?: number;
  unloadPerMoto?: number;
  notes?: string;
  initialMileage?: number;
};

export type TripRow = {
  _local_id: string;
  _server_id: string | null;
  _sync_status: string;
  _dirty: number;
  _deleted: number;
  _created_at: string;
  _updated_at: string;
  user_id: string;
  truck_id: string | null;
  trip_number: string;
  date: string;
  client: string;
  origin: string;
  destination: string;
  cargo_type: string | null;
  moto_qty: number;
  gross_freight: number;
  net_freight: number;
  advance: number;
  balance: number;
  status: "in_progress" | "finished";
  balance_status: "pending" | "paid";
  balance_paid_at: string | null;
  balance_amount: number | null;
  balance_method: string | null;
  balance_notes: string | null;
  notes: string | null;
  initial_mileage: number | null;
  final_mileage: number | null;
  tie_deducted: number | null;
  tie_fixed: number | null;
  tie_per_moto: number | null;
  advance_pct: number | null;
  unload_per_moto: number | null;
};

export class TripsRepository {
  constructor(private db: SQLiteDatabase) {}

  async create(input: NewTrip, settings: Settings): Promise<TripRow> {
    // Construir "effective settings": override por-viaje sobre los defaults
    // globales. Si el input trae el campo, se usa; si no, se usa settings.
    const effectiveSettings: Settings = {
      ...settings,
      tieMode: input.tieDeducted ? "deduct" : "charge_per_moto",
      tieFixed: input.tieFixed ?? settings.tieFixed,
      tiePerMoto: input.tiePerMoto ?? settings.tiePerMoto,
      advancePct: input.advancePct ?? settings.advancePct,
      unloadPerMoto: input.unloadPerMoto ?? settings.unloadPerMoto,
    };

    const ti: TripInput = {
      grossFreight: input.grossFreight,
      motoQty: input.motoQty,
      tieDeducted: input.tieDeducted,
    };
    const f = calculateTripFinancials(effectiveSettings, ti);

    const now = new Date().toISOString();
    const localId = generateId();

    // Valores efectivos a persistir en el viaje (para tener su "snapshot"
    // aunque luego cambien los defaults globales).
    const tieDeductedVal = input.tieDeducted ? 1 : 0;
    const tieFixedVal = input.tieFixed ?? settings.tieFixed;
    const tiePerMotoVal = input.tiePerMoto ?? settings.tiePerMoto;
    const advancePctVal = input.advancePct ?? settings.advancePct;
    const unloadPerMotoVal = input.unloadPerMoto ?? settings.unloadPerMoto;

    await this.db.runAsync(
      `INSERT INTO local_trips (
        _local_id, _server_id, _sync_status, _dirty, _deleted, _created_at, _updated_at,
        user_id, truck_id, trip_number, date, client, origin, destination, cargo_type,
        moto_qty, gross_freight, net_freight, advance, balance, status, balance_status,
        balance_paid_at, balance_amount, balance_method, balance_notes, notes,
        initial_mileage, final_mileage,
        tie_deducted, tie_fixed, tie_per_moto, advance_pct, unload_per_moto
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        localId,
        null,
        "pending",
        1,
        0,
        now,
        now,
        input.userId,
        input.truckId ?? null,
        input.tripNumber,
        input.date,
        input.client,
        input.origin,
        input.destination,
        input.cargoType ?? null,
        input.motoQty,
        f.grossFreight,
        f.netFreight,
        f.advance,
        f.balance,
        "in_progress",
        "pending",
        null,
        null,
        null,
        null,
        input.notes ?? null,
        input.initialMileage ?? null,
        null,
        tieDeductedVal,
        tieFixedVal,
        tiePerMotoVal,
        advancePctVal,
        unloadPerMotoVal,
      ],
    );

    for (const d of f.discounts) {
      const dId = generateId();
      await this.db.runAsync(
        `INSERT INTO local_trip_discounts (
          _local_id, _server_id, _sync_status, _dirty, _deleted, _created_at, _updated_at,
          trip_id, code, label, amount
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          dId,
          null,
          "pending",
          1,
          0,
          now,
          now,
          localId,
          d.code,
          d.label,
          d.amount,
        ],
      );
    }

    // Persistir gastos automáticos generados por el calculador:
    //  - Descargue (siempre, si hay motos)
    //  - Concepto 10% cuando tenPctKind === 'expense'
    // Estos se insertan en local_expenses con el trip_id del viaje recién creado,
    // para que aparezcan en el detalle del viaje y se descuenten del anticipo disponible.
    if (f.autoExpenses.length > 0) {
      const expRepo = new ExpensesRepository(this.db);
      for (const auto of f.autoExpenses) {
        if (auto.amount <= 0) continue; // skip si es 0 (p.ej. 0 motos)
        await expRepo.create({
          userId: input.userId,
          tripId: localId,
          categoryCode: auto.categoryCode,
          description: auto.description,
          amount: auto.amount,
          date: input.date,
          notes: `Generado automáticamente (${auto.code})`,
        });
      }
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

  /**
   * Finaliza el viaje.
   * - Si se pasa finalMileage, actualiza final_mileage del viaje.
   * - Si el viaje tiene truck_id, actualiza el kilometraje del camión
   *   al final_mileage (o lo que se pase) para que el próximo viaje
   *   lo sugiera como inicial automáticamente.
   */
  async finish(localId: string, finalMileage?: number) {
    const now = new Date().toISOString();

    if (finalMileage != null && !Number.isNaN(finalMileage)) {
      await this.db.runAsync(
        `UPDATE local_trips
         SET status = 'finished',
             final_mileage = ?,
             _dirty = 1,
             _sync_status = 'pending',
             _updated_at = ?
         WHERE _local_id = ?`,
        [finalMileage, now, localId],
      );
    } else {
      await this.db.runAsync(
        `UPDATE local_trips SET status = 'finished', _dirty = 1, _sync_status = 'pending', _updated_at = ? WHERE _local_id = ?`,
        [now, localId],
      );
    }

    // Actualizar kilometraje del camión si el viaje tiene uno asignado
    const trip = await this.getById(localId);
    if (trip?.truck_id && finalMileage != null && !Number.isNaN(finalMileage)) {
      const trucks = new TrucksRepository(this.db);
      await trucks.updateMileage(trip.truck_id, finalMileage);
    }
  }

  /* async markBalancePaid(
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
  } */

  async markBalancePaid(
    localId: string,
    amount: number,
    date: string,
    method?: string,
    notes?: string,
  ): Promise<void> {
    const now = new Date().toISOString();

    // 1. Actualizar el viaje: balance_status='paid' + datos del pago.
    await this.db.runAsync(
      `UPDATE local_trips
       SET balance_status = 'paid',
           balance_paid_at = ?,
           balance_amount = ?,
           balance_method = ?,
           balance_notes = ?,
           _updated_at = ?,
           _dirty = 1,
           _sync_status = 'pending'
       WHERE _local_id = ?`,
      [date, amount, method ?? null, notes ?? null, now, localId],
    );

    // 2. Insertar el pago en local_payments (kind='balance') para tener
    //    trazabilidad histórica. Antes solo se actualizaba el viaje,
    //    pero esto permite listar pagos por viaje y reportes.
    const trip = await this.getById(localId);
    if (trip) {
      const payments = new PaymentsRepository(this.db);
      await payments.create({
        userId: trip.user_id,
        tripId: localId,
        kind: "balance",
        amount,
        date,
        method,
        notes,
      });
    }
  }
}
