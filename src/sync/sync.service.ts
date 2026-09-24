import type { SupabaseClient } from "@supabase/supabase-js";
import type { SQLiteDatabase } from "expo-sqlite";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { syncStore } from "./sync.store";
import { useAuthStore } from "../stores/auth.store";

type TableMap = {
  local_trips: "trips";
  local_expenses: "expenses";
  local_payments: "payments";
  local_trucks: "trucks";
  local_trip_discounts: "trip_discounts";
  local_settings: "settings";
};

const TABLES: (keyof TableMap)[] = [
  "local_settings",
  "local_trucks",
  "local_trips",
  "local_trip_discounts",
  "local_expenses",
  "local_payments",
];

const REMOTE_TABLES: Record<keyof TableMap, string> = {
  local_trips: "trips",
  local_expenses: "expenses",
  local_payments: "payments",
  local_trucks: "trucks",
  local_trip_discounts: "trip_discounts",
  local_settings: "settings",
};

// Tablas que tienen restricción UNIQUE en user_id (requieren UPSERT)
const UPSERT_TABLES = new Set(["local_settings"]);

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

        // No agregar user_id a trip_discounts
        if (safeTable !== "local_trip_discounts") {
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

            const base64 = await LegacyFileSystem.readAsStringAsync(
              row.receipt_local,
              {
                encoding: LegacyFileSystem.EncodingType.Base64,
              },
            );

            const byteCharacters = atob(base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: `image/${fileExt}` });

            const { error: uploadError } = await this.supa.storage
              .from("receipts")
              .upload(filePath, blob, { contentType: `image/${fileExt}` });

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

        // Resolver trip_id local a server_id
        if (
          safeTable === "local_expenses" &&
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
              "[SYNC] Viaje padre no sincronizado aún. Omitiendo gasto.",
            );
            continue;
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
            if (UPSERT_TABLES.has(safeTable)) {
              // Para settings: usar upsert (INSERT ... ON CONFLICT DO UPDATE)
              const { data, error } = await this.supa
                .from(remoteTable)
                .upsert(payload, { onConflict: "user_id" })
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
          console.error(`[sync] push error en ${safeTable}:`, err);
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

  private async insertLocal(table: string, remote: any) {
    // Filtrar columnas que no existen en local o que necesitan mapeo especial
    const skipCols = new Set([
      "id",
      "user_id",
      "trip_id",
      "truck_id",
      "deleted_at",
    ]);
    const cols = Object.keys(remote).filter((c) => !skipCols.has(c));

    // Mapear columnas de Supabase a columnas locales
    const locals = cols.map((c) => {
      if (c === "created_at") return "_created_at";
      if (c === "updated_at") return "_updated_at";
      return c.replace(/([A-Z])/g, "_$1").toLowerCase();
    });

    const values = cols.map((c) => remote[c]);
    const placeholders = cols.map(() => "?").join(",");

    const extraCols = [
      "_local_id",
      "_server_id",
      "_sync_status",
      "_dirty",
      "_deleted",
      "_created_at",
      "_updated_at",
    ];
    const localId = `local-${remote.id || Math.random().toString(36).substring(2, 15)}`;
    const extraVals = [localId, remote.id, "synced", 0, 0];

    const allCols = [...extraCols, ...locals];
    const allPlaceholders = [...extraCols.map(() => "?"), ...placeholders];

    await this.db.runAsync(
      `INSERT INTO ${table} (${allCols.join(",")}) VALUES (${allPlaceholders.join(",")})`,
      [...extraVals, ...values],
    );
  }

  private async updateLocal(table: string, localId: string, remote: any) {
    const skipCols = new Set([
      "id",
      "user_id",
      "trip_id",
      "truck_id",
      "deleted_at",
    ]);
    const cols = Object.keys(remote).filter((c) => !skipCols.has(c));

    // Mapear columnas de Supabase a columnas locales
    const sets = cols
      .map((c) => {
        const localCol =
          c === "created_at"
            ? "_created_at"
            : c === "updated_at"
              ? "_updated_at"
              : c.replace(/([A-Z])/g, "_$1").toLowerCase();
        return `${localCol} = ?`;
      })
      .join(",");

    const values = cols.map((c) => remote[c]);

    await this.db.runAsync(
      `UPDATE ${table} SET ${sets}, _server_id = ?, _dirty = 0, _sync_status = 'synced' WHERE _local_id = ?`,
      [...values, remote.id, localId],
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
