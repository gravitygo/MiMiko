import type { Payable } from '@/modules/payable/payable.types';
import { create } from 'zustand';

interface PayableState {
  payables: Payable[];
  isLoading: boolean;
  error: string | null;
}

interface PayableActions {
  setPayables: (payables: Payable[]) => void;
  addPayable: (payable: Payable) => void;
  updatePayable: (payable: Payable) => void;
  removePayable: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: PayableState = {
  payables: [],
  isLoading: false,
  error: null,
};

export const usePayableStore = create<PayableState & PayableActions>((set) => ({
  ...initialState,
  setPayables: (payables) => set({ payables }),
  addPayable: (payable) => set((s) => ({ payables: [payable, ...s.payables] })),
  updatePayable: (payable) =>
    set((s) => ({ payables: s.payables.map((p) => (p.id === payable.id ? payable : p)) })),
  removePayable: (id) => set((s) => ({ payables: s.payables.filter((p) => p.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
