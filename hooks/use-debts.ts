import { createDebtService } from '@/modules/debt/debt.service';
import type { CreateDebtInput, UpdateDebtInput } from '@/modules/debt/debt.types';
import { useDebtStore } from '@/state/debt.store';
import { useCallback } from 'react';

export function useDebts() {
  const fetch = useCallback(async () => {
    const { setLoading, setError, setDebts } = useDebtStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createDebtService();
      const debts = await service.getAll();
      setDebts(debts);
      return debts;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch debts';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnsettled = useCallback(async () => {
    const { setLoading, setError, setDebts } = useDebtStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createDebtService();
      const debts = await service.getUnsettled();
      setDebts(debts);
      return debts;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch debts';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async (input: CreateDebtInput) => {
    const { setLoading, setError, addDebt } = useDebtStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createDebtService();
      const debt = await service.add(input);
      addDebt(debt);
      return debt;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add debt';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const edit = useCallback(async (id: string, input: UpdateDebtInput) => {
    const { setLoading, setError, updateDebt } = useDebtStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createDebtService();
      const debt = await service.edit(id, input);
      if (!debt) {
        setError('Debt not found');
        return null;
      }
      updateDebt(debt);
      return debt;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update debt';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const settle = useCallback(async (id: string) => {
    const { setLoading, setError, updateDebt } = useDebtStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createDebtService();
      const debt = await service.settle(id);
      if (!debt) {
        setError('Cannot settle this debt');
        return null;
      }
      updateDebt(debt);
      return debt;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to settle debt';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const { setLoading, setError, removeDebt } = useDebtStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createDebtService();
      const success = await service.remove(id);
      if (!success) {
        setError('Cannot delete this debt');
        return false;
      }
      removeDebt(id);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete debt';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetch, fetchUnsettled, add, edit, settle, remove };
}
