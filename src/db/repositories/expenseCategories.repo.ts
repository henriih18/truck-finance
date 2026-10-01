import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId } from '../../utils/id';

export type NewExpenseCategory = {
  userId: string;
  code: string;
  label: string;
  isTripExpense?: boolean;
};

export type ExpenseCategoryInput = Partial<
  Omit<NewExpenseCategory, 'userId'>
>;

export type ExpenseCategoryRow = {
  _local_id: string;
  _server_id: string | null;
  _sync_status: string;
  _dirty: number;
  _deleted: number;
  _created_at: string;
  _updated_at: string;
  user_id: string;
  code: string;
  label: string;
  is_trip_expense: number; // SQLite no tiene booleano: 0/1
};

export class ExpenseCategoriesRepository {
  constructor(private db: SQLiteDatabase) {}

  async create(input: NewExpenseCategory): Promise<ExpenseCategoryRow> {
    const now = new Date().toISOString();
    const localId = generateId();

    await this.db.runAsync(
      `INSERT INTO local_expense_categories (
        _local_id, _server_id, _sync_status, _dirty, _deleted,
        _created_at, _updated_at,
        user_id, code, label, is_trip_expense
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        localId, null, 'pending', 1, 0,
        now, now,
        input.userId, input.code, input.label,
        input.isTripExpense === false ? 0 : 1,
      ],
    );

    return this.getById(localId) as Promise<ExpenseCategoryRow>;
  }

  async getById(localId: string): Promise<ExpenseCategoryRow | null> {
    return this.db.getFirstAsync<ExpenseCategoryRow>(
      `SELECT * FROM local_expense_categories WHERE _local_id = ? AND _deleted = 0`,
      [localId],
    );
  }

  async getByCode(
    userId: string,
    code: string,
  ): Promise<ExpenseCategoryRow | null> {
    return this.db.getFirstAsync<ExpenseCategoryRow>(
      `SELECT * FROM local_expense_categories
       WHERE user_id = ? AND code = ? AND _deleted = 0 LIMIT 1`,
      [userId, code],
    );
  }

  async listAll(userId: string): Promise<ExpenseCategoryRow[]> {
    return this.db.getAllAsync<ExpenseCategoryRow>(
      `SELECT * FROM local_expense_categories
       WHERE user_id = ? AND _deleted = 0
       ORDER BY is_trip_expense DESC, code ASC`,
      [userId],
    );
  }

  async listTripExpenses(userId: string): Promise<ExpenseCategoryRow[]> {
    return this.db.getAllAsync<ExpenseCategoryRow>(
      `SELECT * FROM local_expense_categories
       WHERE user_id = ? AND _deleted = 0 AND is_trip_expense = 1
       ORDER BY code ASC`,
      [userId],
    );
  }

  async listGeneralExpenses(userId: string): Promise<ExpenseCategoryRow[]> {
    return this.db.getAllAsync<ExpenseCategoryRow>(
      `SELECT * FROM local_expense_categories
       WHERE user_id = ? AND _deleted = 0 AND is_trip_expense = 0
       ORDER BY code ASC`,
      [userId],
    );
  }

  async update(
    localId: string,
    input: ExpenseCategoryInput,
  ): Promise<ExpenseCategoryRow | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (input.code !== undefined) {
      fields.push('code = ?');
      values.push(input.code);
    }
    if (input.label !== undefined) {
      fields.push('label = ?');
      values.push(input.label);
    }
    if (input.isTripExpense !== undefined) {
      fields.push('is_trip_expense = ?');
      values.push(input.isTripExpense ? 1 : 0);
    }

    if (fields.length === 0) return this.getById(localId);

    fields.push('_updated_at = ?');
    values.push(new Date().toISOString());
    fields.push('_dirty = 1');
    values.push(localId);

    await this.db.runAsync(
      `UPDATE local_expense_categories SET ${fields.join(', ')}
       WHERE _local_id = ? AND _deleted = 0`,
      values,
    );

    return this.getById(localId);
  }

  async softDelete(localId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.runAsync(
      `UPDATE local_expense_categories
       SET _deleted = 1, _dirty = 1, _sync_status = 'pending', _updated_at = ?
       WHERE _local_id = ?`,
      [now, localId],
    );
  }

  /**
   * Seed inicial: si el usuario no tiene categorías, crea las predeterminadas.
   * Es seguro llamarlo en cada login; usa INSERT OR IGNORE.
   */
    /**
    * Seed inicial: si el usuario no tiene categorías, crea las predeterminadas.
    * Es seguro llamarlo en cada login; usa INSERT OR IGNORE.
+   *
+   * Usa códigos en español que ya existían en las pantallas (add.tsx y
+   * add-expense.tsx) para mantener compatibilidad con gastos previos que
+   * no tienen category_id. "OTRO" es de uso general; para viajes se usa
+   * "OTRO_VIAJE" (label "Otro") porque el SQL impone unique(user_id, code).
    */
   async seedDefaultsIfEmpty(userId: string): Promise<void> {
     const existing = await this.listAll(userId);
     if (existing.length > 0) return;

     const defaults: NewExpenseCategory[] = [
      
      
      // Categorías de viaje (aparecen en add-expense.tsx)
      { userId, code: 'COMBUSTIBLE', label: 'Combustible', isTripExpense: true },
      { userId, code: 'PEAJE', label: 'Peaje', isTripExpense: true },
      { userId, code: 'DESCARGUE', label: 'Descargue', isTripExpense: true },
      { userId, code: 'OTRO_VIAJE', label: 'Otro', isTripExpense: true },
      // Categorías generales (aparecen en add.tsx)
      { userId, code: 'MANTENIMIENTO', label: 'Mantenimiento', isTripExpense: false },
      { userId, code: 'ACEITE', label: 'Aceite', isTripExpense: false },
      { userId, code: 'LLANTAS', label: 'Llantas', isTripExpense: false },
      { userId, code: 'REPARACION', label: 'Reparación', isTripExpense: false },
      { userId, code: 'IMPUESTOS', label: 'Impuestos', isTripExpense: false },
      { userId, code: 'SEGUROS', label: 'Seguros', isTripExpense: false },
      { userId, code: 'LAVADO', label: 'Lavado', isTripExpense: false },
      { userId, code: 'OTRO', label: 'Otro', isTripExpense: false },
     ];

     for (const d of defaults) {
       await this.create(d);
     }
   }
}