import { create } from 'zustand';

export type AppearanceMode = 'system' | 'light' | 'dark';
export type CurrencyCode = 'USD' | 'PHP' | 'IDR';

export const CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
];

interface SettingsState {
  appearance: AppearanceMode;
  currency: CurrencyCode;
}

interface SettingsActions {
  setAppearance: (mode: AppearanceMode) => void;
  setCurrency: (currency: CurrencyCode) => void;
}

const initialState: SettingsState = {
  appearance: 'system',
  currency: 'USD',
};

export const useSettingsStore = create<SettingsState & SettingsActions>((set) => ({
  ...initialState,
  setAppearance: (appearance) => set({ appearance }),
  setCurrency: (currency) => set({ currency }),
}));

export function getCurrencySymbol(code: CurrencyCode): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? '$';
}

export function formatCurrency(amount: number, code?: CurrencyCode): string {
  const currency = code ?? useSettingsStore.getState().currency;
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${Math.abs(amount).toLocaleString()}`;
}

export function formatSignedCurrency(amount: number, type: 'expense' | 'income', code?: CurrencyCode): string {
  const prefix = type === 'expense' ? '-' : '+';
  return `${prefix}${formatCurrency(amount, code)}`;
}
