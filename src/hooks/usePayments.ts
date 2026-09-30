import { useEffect, useState, useCallback } from 'react';
import { getDatabase } from '../db/connection';
import {
  PaymentsRepository,
  type PaymentRow,
  type NewPayment,
} from '../db/repositories/payments.repo';

let repoInstance: PaymentsRepository | null = null;

function getRepo() {
  return (async () => {
    const db = await getDatabase();
    if (!repoInstance) repoInstance = new PaymentsRepository(db);
    return repoInstance;
  })();
}

export function usePaymentsByTrip(tripId: string | null) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!tripId) {
      setPayments([]);
      setLoading(false);
      return;
    }
    try {
      const repo = await getRepo();
      const list = await repo.listByTrip(tripId);
      setPayments(list);
    } catch (e) {
      console.error('[usePaymentsByTrip] error:', e);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: NewPayment) => {
      const repo = await getRepo();
      const row = await repo.create(input);
      await refresh();
      return row;
    },
    [refresh],
  );

  const remove = useCallback(
    async (localId: string) => {
      const repo = await getRepo();
      await repo.softDelete(localId);
      await refresh();
    },
    [refresh],
  );

  const total = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalAdvance = payments
    .filter((p) => p.kind === 'advance')
    .reduce((acc, p) => acc + p.amount, 0);
  const totalBalance = payments
    .filter((p) => p.kind === 'balance')
    .reduce((acc, p) => acc + p.amount, 0);

  return {
    payments,
    loading,
    create,
    remove,
    refresh,
    total,
    totalAdvance,
    totalBalance,
  };
}
