import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    // Abrir la base de datos en el directorio de documentos del dispositivo
    const db = await SQLite.openDatabaseAsync('truck_finance.db');
    dbInstance = db;
    console.log('[DB] Conexión establecida');
    return db;
  } catch (error) {
    console.error('[DB] Error abriendo la base de datos:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
    console.log('[DB] Conexión cerrada');
  }
}