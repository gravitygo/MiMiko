export interface ExchangeRates {
  [currencyCode: string]: number;
}

export interface CurrencyData {
  baseCurrency: string;
  rates: ExchangeRates;
  date: string;
  fetchedAt: string;
}

export interface CurrencyRow {
  id: string;
  base_currency: string;
  rates_json: string;
  date: string;
  fetched_at: string;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'php', name: 'Philippine Peso', symbol: '₱', decimals: 2 },
  { code: 'usd', name: 'US Dollar', symbol: '$', decimals: 2 },
  { code: 'eur', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'gbp', name: 'British Pound', symbol: '£', decimals: 2 },
  { code: 'jpy', name: 'Japanese Yen', symbol: '¥', decimals: 0 },
  { code: 'cny', name: 'Chinese Yuan', symbol: '¥', decimals: 2 },
  { code: 'idr', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0 },
  { code: 'myr', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2 },
  { code: 'sgd', name: 'Singapore Dollar', symbol: 'S$', decimals: 2 },
  { code: 'thb', name: 'Thai Baht', symbol: '฿', decimals: 2 },
  { code: 'vnd', name: 'Vietnamese Dong', symbol: '₫', decimals: 0 },
  { code: 'krw', name: 'South Korean Won', symbol: '₩', decimals: 0 },
  { code: 'inr', name: 'Indian Rupee', symbol: '₹', decimals: 2 },
  { code: 'aud', name: 'Australian Dollar', symbol: 'A$', decimals: 2 },
  { code: 'cad', name: 'Canadian Dollar', symbol: 'C$', decimals: 2 },
  { code: 'chf', name: 'Swiss Franc', symbol: 'CHF', decimals: 2 },
  { code: 'hkd', name: 'Hong Kong Dollar', symbol: 'HK$', decimals: 2 },
  { code: 'nzd', name: 'New Zealand Dollar', symbol: 'NZ$', decimals: 2 },
  { code: 'btc', name: 'Bitcoin', symbol: '₿', decimals: 8 },
  { code: 'eth', name: 'Ethereum', symbol: 'Ξ', decimals: 8 },
];

export const DEFAULT_CURRENCY = 'php';

export function getCurrencyInfo(code: string): CurrencyInfo | undefined {
  return SUPPORTED_CURRENCIES.find(
    (c) => c.code.toLowerCase() === code.toLowerCase()
  );
}

export function getCurrencySymbol(code: string): string {
  const currency = getCurrencyInfo(code);
  return currency?.symbol ?? code.toUpperCase();
}

export function formatCurrency(
  amount: number,
  currencyCode: string = DEFAULT_CURRENCY,
  options?: { showSymbol?: boolean; showCode?: boolean }
): string {
  const currency = getCurrencyInfo(currencyCode);
  const decimals = currency?.decimals ?? 2;
  const symbol = currency?.symbol ?? '';
  const showSymbol = options?.showSymbol ?? true;
  const showCode = options?.showCode ?? false;

  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (showCode) {
    return `${formatted} ${currencyCode.toUpperCase()}`;
  }
  if (showSymbol) {
    return `${symbol}${formatted}`;
  }
  return formatted;
}

export function formatSignedCurrency(
  amount: number,
  type: 'expense' | 'income' | 'transfer',
  currencyCode: string = DEFAULT_CURRENCY
): string {
  const prefix = type === 'expense' ? '-' : type === 'income' ? '+' : '';
  return `${prefix}${formatCurrency(amount, currencyCode)}`;
}

