import type { Debt } from '@/modules/debt';
import { create } from 'zustand';

interface DebtState {
  debts: Debt[];
  isLoading: boolean;
  error: string | null;
}

interface DebtActions {
  setDebts: (debts: Debt[]) => void;
  addDebt: (debt: Debt) => void;
  updateDebt: (debt: Debt) => void;
  removeDebt: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: DebtState = {
  debts: [],
  isLoading: false,
  error: null,
};

export const useDebtStore = create<DebtState & DebtActions>((set) => ({
  ...initialState,

  setDebts: (debts) => set({ debts }),

  addDebt: (debt) =>
    set((state) => ({ debts: [debt, ...state.debts] })),

  updateDebt: (debt) =>
    set((state) => ({
      debts: state.debts.map((d) => (d.id === debt.id ? debt : d)),
    })),

  removeDebt: (id) =>
    set((state) => ({
      debts: state.debts.filter((d) => d.id !== id),
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  reset: () => set(initialState),
}));
