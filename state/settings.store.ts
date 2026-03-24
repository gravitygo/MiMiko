import { create } from "zustand";
import {
  formatCurrency as formatCurrencyUtil,
  formatSignedCurrency as formatSignedCurrencyUtil,
  getCurrencySymbol as getCurrencySymbolUtil,
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
} from "@/modules/currency";

export type CurrencyCode = string;
export type AppearanceMode = "light" | "dark" | "system";

export const CURRENCIES = SUPPORTED_CURRENCIES.map((c) => ({
  code: c.code.toUpperCase() as CurrencyCode,
  symbol: c.symbol,
  name: c.name,
}));

interface SettingsState {
  appearance: AppearanceMode;
  currency: CurrencyCode;
}

interface SettingsActions {
  setAppearance: (mode: AppearanceMode) => void;
  setCurrency: (currency: CurrencyCode) => void;
}

const initialState: SettingsState = {
  appearance: "system",
  currency: DEFAULT_CURRENCY.toUpperCase(),
};

export const useSettingsStore = create<SettingsState & SettingsActions>(
  (set) => ({
    ...initialState,
    setAppearance: (appearance) => set({ appearance }),
    setCurrency: (currency) => set({ currency }),
  }),
);

export function getCurrencySymbol(code?: CurrencyCode): string {
  const currency = code ?? useSettingsStore.getState().currency;
  return getCurrencySymbolUtil(currency.toLowerCase());
}

export function formatCurrency(amount: number, code?: CurrencyCode): string {
  const currency = code ?? useSettingsStore.getState().currency;
  return formatCurrencyUtil(Math.abs(amount), currency.toLowerCase());
}

export function formatSignedCurrency(
  amount: number,
  type: "expense" | "income" | "transfer",
  code?: CurrencyCode,
): string {
  const currency = code ?? useSettingsStore.getState().currency;
  return formatSignedCurrencyUtil(amount, type, currency.toLowerCase());
}
