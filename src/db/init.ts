import { getDatabase } from './connection';
import { MIGRATIONS } from './schema';

export async function initializeDatabase(): Promise<void> {
  try {
    console.log('[DB] Iniciando base de datos...');
    const db = await getDatabase();

    // Ejecutar cada migración del schema
    for (let i = 0; i < MIGRATIONS.length; i++) {
      const migration = MIGRATIONS[i];
      console.log(`[DB] Ejecutando migración ${i + 1}/${MIGRATIONS.length}...`);
      
      try {
        await db.execAsync(migration);
        console.log(`[DB] Migración ${i + 1} completada`);
      } catch (error) {
        console.error(`[DB] Error en migración ${i + 1}:`, error);
        console.error(`[DB] SQL: ${migration}`);
        throw error;
      }
    }

    console.log('[DB] Todas las migraciones completadas exitosamente');
    
    // Verificar que las tablas existan
    const tables = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'local_%'"
    );
    console.log('[DB] Tablas creadas:', tables.map(t => t.name).join(', '));
    
  } catch (error) {
    console.error('[DB] Error inicializando base de datos:', error);
    throw error;
  }
}