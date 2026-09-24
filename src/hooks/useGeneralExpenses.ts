import { useEffect, useState } from 'react';
import { getDatabase } from '../db/connection';
import { ExpensesRepository, type ExpenseRow } from '../db/repositories/expenses.repo';

export function useGeneralExpenses(): ExpenseRow[] {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const db = await getDatabase();
        const repo = new ExpensesRepository(db);
        const list = await repo.listGeneral();
        setExpenses(list);
      } catch (e) {
        console.error('Error cargando gastos generales:', e);
      }
    };

    load();
    // Recargar cada 2 segundos por si se agregó uno nuevo
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, []);

  return expenses;
}