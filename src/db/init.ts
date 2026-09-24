import { getDatabase } from './connection';
import { MIGRATIONS } from './schema';

export async function initializeDatabase() {
  const db = await getDatabase();
  
  for (const migration of MIGRATIONS) {
    await db.execAsync(migration);
  }
  
  console.log('[DB] Inicializada correctamente');
}