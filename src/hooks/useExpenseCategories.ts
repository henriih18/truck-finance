import { useEffect, useState, useCallback } from 'react';
import { getDatabase } from '../db/connection';
import {
  ExpenseCategoriesRepository,
  type ExpenseCategoryRow,
  type NewExpenseCategory,
  type ExpenseCategoryInput,
} from '../db/repositories/expenseCategories.repo';
import { useAuthStore } from '../stores/auth.store';

let repoInstance: ExpenseCategoriesRepository | null = null;

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const db = await getDatabase();
      if (!repoInstance) repoInstance = new ExpenseCategoriesRepository(db);
      // Asegurar que el usuario tenga las categorías por defecto
      await repoInstance.seedDefaultsIfEmpty(user.id);
      const list = await repoInstance.listAll(user.id);
      setCategories(list);
    } catch (e) {
      console.error('[useExpenseCategories] error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: NewExpenseCategory) => {
      const db = await getDatabase();
      if (!repoInstance) repoInstance = new ExpenseCategoriesRepository(db);
      const row = await repoInstance.create(input);
      await refresh();
      return row;
    },
    [refresh],
  );

  const update = useCallback(
    async (localId: string, input: ExpenseCategoryInput) => {
      const db = await getDatabase();
      if (!repoInstance) repoInstance = new ExpenseCategoriesRepository(db);
      const row = await repoInstance.update(localId, input);
      await refresh();
      return row;
    },
    [refresh],
  );

  const remove = useCallback(
    async (localId: string) => {
      const db = await getDatabase();
      if (!repoInstance) repoInstance = new ExpenseCategoriesRepository(db);
      await repoInstance.softDelete(localId);
      await refresh();
    },
    [refresh],
  );

  return { categories, loading, create, update, remove, refresh };
}