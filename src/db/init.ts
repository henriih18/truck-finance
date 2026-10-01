import { getDatabase } from "./connection";
import { MIGRATIONS } from "./schema";

/**
 * Verifica si una columna ya existe en una tabla SQLite.
 * Sirve para hacer migraciones ALTER TABLE idempotentes.
 */
async function columnExists(
  db: Awaited<ReturnType<typeof getDatabase>>,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`,
  );
  return rows.some((r) => r.name === column);
}

export async function initializeDatabase(): Promise<void> {
  try {
    console.log("[DB] Iniciando base de datos...");
    const db = await getDatabase();

    // Ejecutar cada migración del schema
    for (let i = 0; i < MIGRATIONS.length; i++) {
      const migration = MIGRATIONS[i];
      console.log(`[DB] Ejecutando migración ${i + 1}/${MIGRATIONS.length}...`);

      // Detectar ALTER TABLE ... ADD COLUMN y verificar idempotencia
      const alterMatch = migration.match(
        /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i,
      );

      if (alterMatch) {
        const [, table, column] = alterMatch;
        const exists = await columnExists(db, table, column);
        if (exists) {
          console.log(
            `[DB] Migración ${i + 1} saltada (columna ${column} ya existe en ${table})`,
          );
          continue;
        }
      }

      try {
        await db.execAsync(migration);
        console.log(`[DB] Migración ${i + 1} completada`);
      } catch (error) {
        // Ignorar errores de "duplicate column" o "table already exists"
        // porque las migraciones son idempotentes con IF NOT EXISTS o con el
        // chequeo previo de columnExists.
        const msg = (error as Error)?.message ?? "";
        if (
          msg.includes("duplicate column") ||
          msg.includes("already exists")
        ) {
          console.log(`[DB] Migración ${i + 1} ya aplicada, saltando`);
          continue;
        }
        console.error(`[DB] Error en migración ${i + 1}:`, error);
        console.error(`[DB] SQL: ${migration}`);
        throw error;
      }
    }

    console.log("[DB] Todas las migraciones completadas exitosamente");

    // Verificar que las tablas existan
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'local_%'",
    );
    console.log("[DB] Tablas creadas:", tables.map((t) => t.name).join(", "));
  } catch (error) {
    console.error("[DB] Error inicializando base de datos:", error);
    throw error;
  }
}
