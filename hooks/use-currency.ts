import { useCallback, useEffect, useState } from 'react';
import { createCurrencyService } from '@/modules/currency/currency.service';
import type { CurrencyData } from '@/modules/currency/currency.types';
import { useSettingsStore } from '@/state/settings.store';

const currencyService = createCurrencyService();

interface UseCurrencyResult {
  rates: CurrencyData | null;
  loading: boolean;
  error: string | null;
  baseCurrency: string;
  convert: (amount: number, fromCurrency: string) => number;
  refresh: () => Promise<void>;
}

export function useCurrency(): UseCurrencyResult {
  const baseCurrency = useSettingsStore((s) => s.currency.toLowerCase());
  const [rates, setRates] = useState<CurrencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);

    const data = await currencyService.getRates(baseCurrency);
    if (data) {
      setRates(data);
    } else {
      setError('Failed to fetch exchange rates');
    }

    setLoading(false);
  }, [baseCurrency]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const convert = useCallback(
    (amount: number, fromCurrency: string): number => {
      const from = fromCurrency.toLowerCase();
      const base = baseCurrency.toLowerCase();

      if (from === base) return amount;
      if (!rates?.rates) return amount;

      // rates are FROM baseCurrency TO other currencies
      // e.g., if base is PHP: rates.usd = 0.017 means 1 PHP = 0.017 USD
      // To convert 100 USD to PHP: 100 / 0.017 = ~5882 PHP
      const rate = rates.rates[from];
      if (!rate || rate === 0) return amount;

      return amount / rate;
    },
    [rates, baseCurrency]
  );

  return {
    rates,
    loading,
    error,
    baseCurrency,
    convert,
    refresh: fetchRates,
  };
}

export function useTotalBalance(
  accounts: Array<{ balance: number; currency?: string; creditMode?: boolean; type?: string }>
): { totalBalance: number; loading: boolean } {
  const { convert, loading } = useCurrency();

  const totalBalance = accounts.reduce((sum, account) => {
    const currency = account.currency || 'php';
    const convertedBalance = convert(account.balance, currency);
    // Credit-mode accounts represent outstanding debt — subtract from net balance
    const isCreditMode = account.creditMode === true || account.type === 'credit_card';
    return sum + (isCreditMode ? -convertedBalance : convertedBalance);
  }, 0);

  return { totalBalance, loading };
}

