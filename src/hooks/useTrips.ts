import { useEffect, useState } from 'react';
import { getDatabase } from '../db/connection';
import { TripsRepository, type TripRow } from '../db/repositories/trips.repo';

export function useTrips(): TripRow[] {
  const [trips, setTrips] = useState<TripRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const db = await getDatabase();
      const repo = new TripsRepository(db);
      const all = await repo.listAll();
      setTrips(all);
    };

    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  return trips;
}