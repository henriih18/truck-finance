import { useEffect, useState } from 'react';
import { getDatabase } from '../db/connection';
import { ExpensesRepository } from '../db/repositories/expenses.repo';

export function useExpensesTotal(tripId: string): number {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      const db = await getDatabase();
      const repo = new ExpensesRepository(db);
      const t = await repo.getTotalByTrip(tripId);
      setTotal(t);
    };

    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [tripId]);

  return total;
}