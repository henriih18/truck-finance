import { useEffect, useState } from 'react';
import { getDatabase } from '../db/connection';
import { TripsRepository } from '../db/repositories/trips.repo';

let repoInstance: TripsRepository | null = null;

export function useTripsRepo(): TripsRepository | null {
  const [repo, setRepo] = useState<TripsRepository | null>(repoInstance);

  useEffect(() => {
    if (repo) return;

    (async () => {
      try {
        const db = await getDatabase();
        const r = new TripsRepository(db);
        repoInstance = r;
        setRepo(r);
      } catch (e) {
        console.error('[useTripsRepo] error:', e);
      }
    })();
  }, [repo]);

  return repo;
}