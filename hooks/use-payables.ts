import { createPayableService } from '@/modules/payable/payable.service';
import type { CreatePayableInput, UpdatePayableInput } from '@/modules/payable/payable.types';
import { usePayableStore } from '@/state/payable.store';
import { useCallback } from 'react';

export function usePayables() {
  const fetch = useCallback(async () => {
    const { setLoading, setError, setPayables } = usePayableStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createPayableService();
      const payables = await service.getAll();
      setPayables(payables);
      return payables;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch payables';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const add = useCallback(async (input: CreatePayableInput) => {
    const { setLoading, setError, addPayable } = usePayableStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createPayableService();
      const payable = await service.add(input);
      addPayable(payable);
      return payable;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add payable';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const edit = useCallback(async (id: string, input: UpdatePayableInput) => {
    const { setLoading, setError, updatePayable } = usePayableStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createPayableService();
      const payable = await service.edit(id, input);
      if (!payable) {
        setError('Payable not found');
        return null;
      }
      updatePayable(payable);
      return payable;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update payable';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    const { setLoading, setError, removePayable } = usePayableStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createPayableService();
      const success = await service.remove(id);
      if (!success) {
        setError('Payable not found');
        return false;
      }
      removePayable(id);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete payable';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const markPaid = useCallback(async (id: string) => {
    const { setLoading, setError, updatePayable } = usePayableStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createPayableService();
      await service.markPaid(id);
      const all = await service.getAll();
      const updated = all.find((p) => p.id === id);
      if (updated) updatePayable(updated);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark as paid';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const makePayment = useCallback(async (id: string, amount: number) => {
    const { setLoading, setError, updatePayable } = usePayableStore.getState();
    setLoading(true);
    setError(null);

    try {
      const service = createPayableService();
      await service.makePayment(id, amount);
      const all = await service.getAll();
      const updated = all.find((p) => p.id === id);
      if (updated) updatePayable(updated);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to make payment';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetch, add, edit, remove, markPaid, makePayment };
}
