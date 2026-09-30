import { useEffect, useState, useCallback } from 'react';
import { getDatabase } from '../db/connection';
import { TrucksRepository, type TruckRow, type NewTruck, type TruckInput } from '../db/repositories/trucks.repo';
import { useAuthStore } from '../stores/auth.store';

let repoInstance: TrucksRepository | null = null;

export function useTrucks() {
  const [trucks, setTrucks] = useState<TruckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const db = await getDatabase();
      if (!repoInstance) repoInstance = new TrucksRepository(db);
      const list = await repoInstance.listAll(user.id);
      setTrucks(list);
    } catch (e) {
      console.error('[useTrucks] error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (input: NewTruck) => {
    const db = await getDatabase();
    if (!repoInstance) repoInstance = new TrucksRepository(db);
    const row = await repoInstance.create(input);
    await refresh();
    return row;
  }, [refresh]);

  const update = useCallback(async (localId: string, input: TruckInput) => {
    const db = await getDatabase();
    if (!repoInstance) repoInstance = new TrucksRepository(db);
    const row = await repoInstance.update(localId, input);
    await refresh();
    return row;
  }, [refresh]);

  const remove = useCallback(async (localId: string) => {
    const db = await getDatabase();
    if (!repoInstance) repoInstance = new TrucksRepository(db);
    await repoInstance.softDelete(localId);
    await refresh();
  }, [refresh]);

  return { trucks, loading, create, update, remove, refresh };
}
