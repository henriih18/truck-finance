import type { SupabaseClient } from "@supabase/supabase-js";
import type { SQLiteDatabase } from "expo-sqlite";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { syncStore } from "./sync.store";
import { useAuthStore } from "../stores/auth.store";

type TableMap = {
  local_trips: "trips";
  local_expenses: "expenses";
  local_expense_categories: "expense_categories";
  local_payments: "payments";
  local_trucks: "trucks";
  local_trip_discounts: "trip_discounts";
  local_settings: "settings";
};

// Orden importante: padres antes que hijos (FK)
// settings → trucks → trips → expense_categories → trip_discounts → expenses → payments
const TABLES: (keyof TableMap)[] = [
  "local_settings",
  "local_trucks",
  "local_trips", // ← antes de trip_discounts/expenses/payments
  "local_expense_categories", // ← antes de expenses
  "local_trip_discounts",
  "local_expenses",
  "local_payments",
];

const REMOTE_TABLES: Record<keyof TableMap, string> = {
  local_trips: "trips",
  local_expenses: "expenses",
  local_expense_categories: "expense_categories",
  local_payments: "payments",
  local_trucks: "trucks",
  local_trip_discounts: "trip_discounts",
  local_settings: "settings",
};

// Tablas que no tienen user_id directo (lo resuelven vía FK al parent)
const TABLES_WITHOUT_USER_ID = new Set<keyof TableMap>([
  "local_trip_discounts",
  // local_expense_categories SÍ tiene user_id directo
]);

// Tablas que requieren UPSERT porque tienen un UNIQUE constraint en el server.
// Mapea: tabla local → columnas de conflicto (coma-separadas si es compuesto)
const UPSERT_TABLES: Partial<Record<keyof TableMap, string>> = {
  local_settings: "user_id",
  local_expense_categories: "user_id,code",
};

const ALLOWED_TABLES = new Set(TABLES);

function validateTableName(name: string): keyof TableMap {
  if (!ALLOWED_TABLES.has(name as keyof TableMap)) {
    throw new Error(`Tabla no permitida: ${name}`);
  }
  return name as keyof TableMap;
}

function localToRemoteRow(row: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(row)) {
    if (k.startsWith("_")) continue;
    out[k] = row[k];
  }
  return out;
}

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export class SyncService {
  constructor(
    private db: SQLiteDatabase,
    private supa: SupabaseClient,
  ) {}

  private remoteColumnCache = new Map<string, boolean>();

  private async remoteHasColumn(
    remoteTable: string,
    column: string,
  ): Promise<boolean> {
    const key = `${remoteTable}.${column}`;
    if (this.remoteColumnCache.has(key))
      return this.remoteColumnCache.get(key)!;

    let has = false;
    try {
      const { error } = await this.supa
        .from(remoteTable)
        .select(column)
        .limit(0);
      has = !error;
    } catch {
      has = false;
    }
    this.remoteColumnCache.set(key, has);
    return has;
  }

  async syncAll() {
    const user = useAuthStore.getState().user;
    if (!user) return;

    if (syncStore.getState().syncing) return;
    syncStore.setState({ syncing: true });

    try {
      await this.push();
      await this.pull();
      syncStore.setState({ lastSyncAt: new Date() });
      await this.refreshPendingCount();
    } catch (e) {
      console.error("[sync] error:", e);
    } finally {
      syncStore.setState({ syncing: false });
    }
  }

  private async push() {
    for (const localTable of TABLES) {
      const safeTable = validateTableName(localTable);
      const remoteTable = REMOTE_TABLES[safeTable];

      const dirty = await this.db.getAllAsync<any>(
        `SELECT * FROM ${safeTable} WHERE _dirty = 1 ORDER BY _updated_at ASC`,
      );

      for (const row of dirty) {
        const payload = localToRemoteRow(row);

        // Agregar user_id a las tablas que lo tienen directo.
        // trip_discounts no tiene user_id, se resuelve por su FK a trips.
        if (!TABLES_WITHOUT_USER_ID.has(safeTable)) {
          payload.user_id = useAuthStore.getState().user?.id;
        }

        // Subida de fotos
        if (
          safeTable === "local_expenses" &&
          row.receipt_local &&
          !row.receipt_url
        ) {
          try {
            console.log("[SYNC] Subiendo foto...", row.receipt_local);
            const fileExt = row.receipt_local.split(".").pop() || "jpg";
            const fileName = `${row._local_id}-${Date.now()}.${fileExt}`;
            const filePath = `${payload.user_id}/${fileName}`;

            // FIX: en React Native, `new Blob([Uint8Array])` NO está soportado
            // (da "Creating blobs from 'ArrayBuffer' and 'ArrayBufferView'
            // are not supported"). En su lugar, leemos el archivo como
            // ArrayBuffer y se lo pasamos directamente a Supabase, que sí
            // acepta ArrayBuffer/ArrayBufferView en su método upload().
            const fileInfo = await LegacyFileSystem.getInfoAsync(
              row.receipt_local,
            );
            if (!fileInfo.exists) {
              throw new Error(`El archivo no existe: ${row.receipt_local}`);
            }

            // Leer como ArrayBuffer (binario puro)
            const arrayBuffer = await LegacyFileSystem.readAsStringAsync(
              row.receipt_local,
              {
                encoding: LegacyFileSystem.EncodingType.Base64,
              },
            ).then((b64) => {
              // Convertir base64 → ArrayBuffer
              const binary = atob(b64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              return bytes.buffer; // ArrayBuffer
            });

            const { error: uploadError } = await this.supa.storage
              .from("receipts")
              .upload(filePath, arrayBuffer, {
                contentType: `image/${fileExt}`,
                upsert: false,
              });

            if (uploadError) throw uploadError;

            const { data: urlData } = this.supa.storage
              .from("receipts")
              .getPublicUrl(filePath);
            payload.receipt_url = urlData.publicUrl;
            console.log("[SYNC] Foto subida:", payload.receipt_url);
          } catch (err: any) {
            console.error("[SYNC] Error subiendo foto:", err);
            continue;
          }
        }

        // Resolver trip_id local (_local_id) a server_id (UUID).
        // Aplica a trip_discounts, expenses y payments: todas las tablas
        // con FK trip_id apuntando al UUID del server.
        if (
          (safeTable === "local_trip_discounts" ||
            safeTable === "local_expenses" ||
            safeTable === "local_payments") &&
          row.trip_id &&
          !isUuid(row.trip_id)
        ) {
          const parentTrip = await this.db.getFirstAsync<{
            _server_id: string | null;
          }>(`SELECT _server_id FROM local_trips WHERE _local_id = ?`, [
            row.trip_id,
          ]);

          if (parentTrip && parentTrip._server_id) {
            payload.trip_id = parentTrip._server_id;
          } else {
            console.log(
              `[SYNC] Viaje padre ${row.trip_id} no sincronizado aún. Omitiendo ${safeTable}.`,
            );
            continue;
          }
        }

        // DIAGNÓSTICO RLS en trip_discounts: antes de hacer INSERT,
        // verificar si el viaje padre realmente existe y pertenece al
        // usuario en el servidor. Si no, saltar con mensaje claro en
        // vez de esperar al error 42501.
        if (
          safeTable === "local_trip_discounts" &&
          payload.trip_id &&
          !row._deleted
        ) {
          const { data: tripOnServer, error: tripQryErr } = await this.supa
            .from("trips")
            .select("id, user_id, deleted_at")
            .eq("id", payload.trip_id)
            .maybeSingle();

          if (tripQryErr) {
            console.warn(
              `[SYNC] No se pudo verificar viaje padre ${payload.trip_id} en servidor:`,
              tripQryErr.message,
            );
          } else if (!tripOnServer) {
            console.warn(
              `[SYNC] Viaje padre ${payload.trip_id} NO existe en servidor ` +
                `(local_id=${row.trip_id}, fila=${row._local_id}). ` +
                `Saltando discount. Posible data inconsistency.`,
            );
            continue;
          } else {
            const uid = useAuthStore.getState().user?.id;
            if (tripOnServer.user_id !== uid) {
              console.warn(
                `[SYNC] Viaje padre ${payload.trip_id} pertenece a ` +
                  `user_id=${tripOnServer.user_id} (auth.uid=${uid}). ` +
                  `Saltando discount.`,
              );
              continue;
            }
            if (tripOnServer.deleted_at) {
              console.warn(
                `[SYNC] Viaje padre ${payload.trip_id} está soft-deleted ` +
                  `(${tripOnServer.deleted_at}). Saltando discount.`,
              );
              continue;
            }
            console.log(
              `[SYNC] Viaje padre ${payload.trip_id} OK en servidor. ` +
                `Procediendo con INSERT en trip_discounts.`,
            );
          }
        }

        // Resolver truck_id local (_local_id) a server_id (UUID) en trips
        if (
          safeTable === "local_trips" &&
          row.truck_id &&
          !isUuid(row.truck_id)
        ) {
          const parentTruck = await this.db.getFirstAsync<{
            _server_id: string | null;
          }>(`SELECT _server_id FROM local_trucks WHERE _local_id = ?`, [
            row.truck_id,
          ]);

          if (parentTruck && parentTruck._server_id) {
            payload.truck_id = parentTruck._server_id;
          } else {
            console.log(
              `[SYNC] Truck ${row.truck_id} no sincronizado aún. Enviando truck_id=NULL.`,
            );
            payload.truck_id = null;
          }
        }

        // Resolver category_id local (_local_id) a server_id (UUID) en expenses
        if (
          safeTable === "local_expenses" &&
          row.category_id &&
          !isUuid(row.category_id)
        ) {
          const parentCategory = await this.db.getFirstAsync<{
            _server_id: string | null;
          }>(
            `SELECT _server_id FROM local_expense_categories WHERE _local_id = ?`,
            [row.category_id],
          );

          if (parentCategory && parentCategory._server_id) {
            payload.category_id = parentCategory._server_id;
          } else {
            console.log(
              `[SYNC] Categoría ${row.category_id} no sincronizada aún. Enviando category_id=NULL.`,
            );
            payload.category_id = null;
          }
        }

        let ok = false;
        try {
          if (row._deleted) {
            if (row._server_id) {
              const hasDeletedAt = await this.remoteHasColumn(
                remoteTable,
                "deleted_at",
              );
              if (hasDeletedAt) {
                await this.supa
                  .from(remoteTable)
                  .update({ deleted_at: new Date().toISOString() })
                  .eq("id", row._server_id);
              } else {
                await this.supa
                  .from(remoteTable)
                  .delete()
                  .eq("id", row._server_id);
              }
            }
            await this.db.runAsync(
              `DELETE FROM ${safeTable} WHERE _local_id = ?`,
              [row._local_id],
            );
            ok = true;
          } else if (row._server_id) {
            // UPDATE si ya tiene server_id
            const { error } = await this.supa
              .from(remoteTable)
              .update(payload)
              .eq("id", row._server_id);
            if (error) throw error;
            ok = true;
          } else {
            // INSERT nuevo
            if (safeTable in UPSERT_TABLES) {
              // Para tablas con UNIQUE constraint (settings, expense_categories):
              // usar upsert (INSERT ... ON CONFLICT DO UPDATE) con el onConflict
              // correspondiente a esa constraint.
              const onConflict = UPSERT_TABLES[safeTable]!;
              const { data, error } = await this.supa
                .from(remoteTable)
                .upsert(payload, { onConflict })
                .select("id")
                .single();
              if (error) throw error;
              if (data?.id) {
                await this.db.runAsync(
                  `UPDATE ${safeTable} SET _server_id = ? WHERE _local_id = ?`,
                  [data.id, row._local_id],
                );
              }
            } else {
              const { data, error } = await this.supa
                .from(remoteTable)
                .insert(payload)
                .select("id")
                .single();
              if (error) throw error;
              await this.db.runAsync(
                `UPDATE ${safeTable} SET _server_id = ? WHERE _local_id = ?`,
                [data.id, row._local_id],
              );
            }
            ok = true;
          }

          if (ok) {
            await this.db.runAsync(
              `UPDATE ${safeTable} SET _dirty = 0, _sync_status = 'synced' WHERE _local_id = ?`,
              [row._local_id],
            );
          }
        } catch (err: any) {
          // Clasificar el tipo de error para log más claro.
          const code = err?.code;
          const msg: string = err?.message ?? "";
          const isFkViolation =
            code === "23503" || msg.includes("violates foreign key constraint");
          const isRlsViolation =
            code === "42501" ||
            msg.includes("row-level security policy") ||
            msg.includes("new row violates row-level");

          if (isFkViolation) {
            // La FK referenciada no existe en el servidor (probablemente
            // _server_id obsoleto tras resetear el schema). Dejamos la fila
            // dirty para reintentar el próximo ciclo; no hacemos operaciones
            // extra en la DB local para evitar "database is locked".
            console.warn(
              `[SYNC] FK violada en ${safeTable} (fila ${row._local_id}). ` +
                `Dejando dirty para próximo ciclo. Detalle: ${msg}`,
            );
          } else if (isRlsViolation) {
            // RLS falla normalmente porque el padre (trip) aún no existe
            // en el servidor o fue soft-deleted. Reintentar el próximo ciclo.
            console.warn(
              `[SYNC] RLS bloqueó push en ${safeTable} (fila ${row._local_id}). ` +
                `Posiblemente el viaje padre aún no se ha sincronizado. ` +
                `Reintentando en próximo ciclo. Detalle: ${msg}`,
            );
          } else {
            console.error(`[sync] push error en ${safeTable}:`, err);
          }
        }
      }
    }
  }

  private async pull() {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const cursorRow = await this.db.getFirstAsync<
      { value: string } | undefined
    >(`SELECT value FROM sync_state WHERE key = 'server_cursor'`);
    const cursor = cursorRow?.value ?? "1970-01-01T00:00:00Z";

    for (const localTable of TABLES) {
      const safeTable = validateTableName(localTable);
      const remoteTable = REMOTE_TABLES[safeTable];

      const hasDeletedAt = await this.remoteHasColumn(
        remoteTable,
        "deleted_at",
      );
      const hasUserId = await this.remoteHasColumn(remoteTable, "user_id");

      let query = this.supa
        .from(remoteTable)
        .select("*")
        .gt("updated_at", cursor);

      if (hasUserId) query = query.eq("user_id", user.id);
      if (hasDeletedAt) query = query.is("deleted_at", null);

      const { data, error } = await query;

      if (error || !data) continue;

      for (const remote of data) {
        const existing = await this.db.getFirstAsync<any>(
          `SELECT * FROM ${safeTable} WHERE _server_id = ?`,
          [remote.id],
        );

        if (!existing) {
          await this.insertLocal(safeTable, remote);
        } else if (!existing._dirty) {
          await this.updateLocal(safeTable, existing._local_id, remote);
        } else {
          const remoteTs = new Date(remote.updated_at).getTime();
          const localTs = new Date(existing._updated_at).getTime();
          if (remoteTs >= localTs) {
            await this.updateLocal(safeTable, existing._local_id, remote);
            await this.db.runAsync(
              `UPDATE ${safeTable} SET _dirty = 0, _sync_status = 'synced' WHERE _local_id = ?`,
              [existing._local_id],
            );
          }
        }
      }
    }

    const now = new Date().toISOString();
    await this.db.runAsync(
      `INSERT INTO sync_state(key, value) VALUES ('server_cursor', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [now],
    );
  }

  // ===== Helpers de resolución de IDs =====
  // Pull: server UUID → _local_id local
  private async resolveTripLocalId(
    serverTripId: string,
  ): Promise<string | null> {
    const r = await this.db.getFirstAsync<{ _local_id: string }>(
      `SELECT _local_id FROM local_trips WHERE _server_id = ?`,
      [serverTripId],
    );
    return r?._local_id ?? null;
  }

  private async resolveTruckLocalId(
    serverTruckId: string,
  ): Promise<string | null> {
    const r = await this.db.getFirstAsync<{ _local_id: string }>(
      `SELECT _local_id FROM local_trucks WHERE _server_id = ?`,
      [serverTruckId],
    );
    return r?._local_id ?? null;
  }

  private async resolveCategoryLocalId(
    serverCategoryId: string,
  ): Promise<string | null> {
    const r = await this.db.getFirstAsync<{ _local_id: string }>(
      `SELECT _local_id FROM local_expense_categories WHERE _server_id = ?`,
      [serverCategoryId],
    );
    return r?._local_id ?? null;
  }
  // ===== Fin helpers =====

  private async insertLocal(table: string, remote: any) {
    const now = new Date().toISOString();
    const localId = `local-${remote.id || Math.random().toString(36).substring(2, 15)}`;

    // Construir lista de {col, val} garantizando que N columnas ↔ N placeholders ↔ N valores.
    const colVals: { col: string; val: any }[] = [
      { col: "_local_id", val: localId },
      { col: "_server_id", val: remote.id },
      { col: "_sync_status", val: "synced" },
      { col: "_dirty", val: 0 },
      { col: "_deleted", val: 0 },
      { col: "_created_at", val: remote.created_at ?? now },
      { col: "_updated_at", val: remote.updated_at ?? now },
    ];

    const skipCols = new Set(["id", "deleted_at", "created_at", "updated_at"]);

    // user_id: el server lo manda; lo guardamos igual localmente
    if (remote.user_id !== undefined && remote.user_id !== null) {
      colVals.push({ col: "user_id", val: remote.user_id });
      skipCols.add("user_id");
    } else {
      skipCols.add("user_id"); // trip_discounts no tiene user_id
    }

    // truck_id: mapear UUID server → _local_id local
    if (remote.truck_id !== undefined && remote.truck_id !== null) {
      const localTruckId = await this.resolveTruckLocalId(remote.truck_id);
      colVals.push({ col: "truck_id", val: localTruckId ?? null });
      skipCols.add("truck_id");
    } else {
      skipCols.add("truck_id");
    }

    // trip_id: mapear UUID server → _local_id local
    if (remote.trip_id !== undefined && remote.trip_id !== null) {
      const localTripId = await this.resolveTripLocalId(remote.trip_id);
      colVals.push({ col: "trip_id", val: localTripId ?? null });
      skipCols.add("trip_id");
    } else {
      skipCols.add("trip_id");
    }

    // category_id: mapear UUID server → _local_id local (solo en expenses)
    if (remote.category_id !== undefined && remote.category_id !== null) {
      const localCategoryId = await this.resolveCategoryLocalId(
        remote.category_id,
      );
      colVals.push({ col: "category_id", val: localCategoryId ?? null });
      skipCols.add("category_id");
    } else {
      skipCols.add("category_id");
    }

    // Resto de columnas: mapeo camelCase → snake_case
    for (const c of Object.keys(remote)) {
      if (skipCols.has(c)) continue;
      const localCol = c.replace(/([A-Z])/g, "_$1").toLowerCase();
      colVals.push({ col: localCol, val: remote[c] });
    }

    const cols = colVals.map((cv) => cv.col);
    const placeholders = colVals.map(() => "?");
    const vals = colVals.map((cv) => cv.val);

    await this.db.runAsync(
      `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders.join(",")})`,
      vals,
    );
  }

  private async updateLocal(table: string, localId: string, remote: any) {
    // Construir pares (columnaLocal = ?) con sus valores, en orden.
    const setPairs: { col: string; val: any }[] = [];

    const skipCols = new Set(["id", "deleted_at", "created_at", "updated_at"]);

    // user_id
    if (remote.user_id !== undefined && remote.user_id !== null) {
      setPairs.push({ col: "user_id", val: remote.user_id });
      skipCols.add("user_id");
    } else {
      skipCols.add("user_id");
    }

    // truck_id (server UUID → _local_id)
    if (remote.truck_id !== undefined && remote.truck_id !== null) {
      const localTruckId = await this.resolveTruckLocalId(remote.truck_id);
      setPairs.push({ col: "truck_id", val: localTruckId ?? null });
      skipCols.add("truck_id");
    } else {
      skipCols.add("truck_id");
    }

    // trip_id (server UUID → _local_id)
    if (remote.trip_id !== undefined && remote.trip_id !== null) {
      const localTripId = await this.resolveTripLocalId(remote.trip_id);
      setPairs.push({ col: "trip_id", val: localTripId ?? null });
      skipCols.add("trip_id");
    } else {
      skipCols.add("trip_id");
    }

    // category_id (server UUID → _local_id) — solo aplica a expenses
    if (remote.category_id !== undefined && remote.category_id !== null) {
      const localCategoryId = await this.resolveCategoryLocalId(
        remote.category_id,
      );
      setPairs.push({ col: "category_id", val: localCategoryId ?? null });
      skipCols.add("category_id");
    } else {
      skipCols.add("category_id");
    }

    // Resto de columnas con mapeo camelCase → snake_case
    for (const c of Object.keys(remote)) {
      if (skipCols.has(c)) continue;
      const localCol = c.replace(/([A-Z])/g, "_$1").toLowerCase();
      setPairs.push({ col: localCol, val: remote[c] });
    }

    // Columnas internas: forzar sync
    setPairs.push({ col: "_server_id", val: remote.id });
    setPairs.push({ col: "_dirty", val: 0 });
    setPairs.push({ col: "_sync_status", val: "synced" });
    setPairs.push({
      col: "_updated_at",
      val: remote.updated_at ?? new Date().toISOString(),
    });

    const setClause = setPairs.map((p) => `${p.col} = ?`).join(", ");
    const setVals = setPairs.map((p) => p.val);

    await this.db.runAsync(
      `UPDATE ${table} SET ${setClause} WHERE _local_id = ?`,
      [...setVals, localId],
    );
  }

  async refreshPendingCount() {
    let total = 0;
    for (const t of TABLES) {
      const safeTable = validateTableName(t);
      const r = await this.db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) as n FROM ${safeTable} WHERE _dirty = 1`,
      );
      total += r?.n ?? 0;
    }
    syncStore.setState({ pendingCount: total });
  }
}
