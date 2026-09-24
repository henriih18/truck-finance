import { getDatabase } from '../db/connection';
import { supabase } from '../supabase/client';
import { SyncService } from './sync.service';
import { startNetworkMonitor, setSyncService } from './network.monitor';

let syncServiceInstance: SyncService | null = null;

export async function initializeSync() {
  if (syncServiceInstance) {
    console.log('[SYNC] Ya estaba inicializado');
    return syncServiceInstance;
  }

  try {
    const db = await getDatabase();
    syncServiceInstance = new SyncService(db, supabase);
    setSyncService(syncServiceInstance);
    startNetworkMonitor();
    console.log('[SYNC] Servicio de sincronización inicializado correctamente');
    return syncServiceInstance;
  } catch (e: any) {
    console.error('[SYNC] Error inicializando:', e);
    return null;
  }
}

export function getSyncService(): SyncService | null {
  return syncServiceInstance;
}