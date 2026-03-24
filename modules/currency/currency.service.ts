import { createCurrencyRepository } from './currency.repository';
import type { CurrencyData, ExchangeRates } from './currency.types';

const PRIMARY_API_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';
const FALLBACK_API_URL = 'https://latest.currency-api.pages.dev/v1/currencies';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createCurrencyService() {
  const repository = createCurrencyRepository();

  async function fetchFromApi(baseCurrency: string): Promise<ExchangeRates | null> {
    const base = baseCurrency.toLowerCase();
    const urls = [
      `${PRIMARY_API_URL}/${base}.min.json`,
      `${FALLBACK_API_URL}/${base}.min.json`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) continue;

        const data = await response.json();
        if (data && data[base]) {
          return data[base] as ExchangeRates;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  return {
    async fetchRates(baseCurrency: string): Promise<CurrencyData | null> {
      const base = baseCurrency.toLowerCase();
      const rates = await fetchFromApi(base);

      if (!rates) return null;

      const now = new Date().toISOString();
      const data: CurrencyData = {
        baseCurrency: base,
        rates,
        date: now.split('T')[0],
        fetchedAt: now,
      };

      await repository.upsert(data);
      return data;
    },

    async getRates(baseCurrency: string): Promise<CurrencyData | null> {
      const base = baseCurrency.toLowerCase();
      const cached = await repository.findByBase(base);

      if (cached) {
        const fetchedAt = new Date(cached.fetchedAt).getTime();
        const now = Date.now();

        if (now - fetchedAt < CACHE_DURATION_MS) {
          return cached;
        }
      }

      // Try to fetch fresh rates
      const fresh = await this.fetchRates(base);
      if (fresh) return fresh;

      // Return stale cache if fetch fails
      return cached;
    },

    async convert(
      amount: number,
      fromCurrency: string,
      toCurrency: string
    ): Promise<number | null> {
      const from = fromCurrency.toLowerCase();
      const to = toCurrency.toLowerCase();

      if (from === to) return amount;

      const data = await this.getRates(from);
      if (!data || !data.rates[to]) return null;

      return amount * data.rates[to];
    },

    async getRate(
      fromCurrency: string,
      toCurrency: string
    ): Promise<number | null> {
      const from = fromCurrency.toLowerCase();
      const to = toCurrency.toLowerCase();

      if (from === to) return 1;

      const data = await this.getRates(from);
      if (!data || !data.rates[to]) return null;

      return data.rates[to];
    },

    async getCachedRates(baseCurrency: string): Promise<CurrencyData | null> {
      return repository.findByBase(baseCurrency.toLowerCase());
    },

    async clearCache(): Promise<void> {
      await repository.deleteAll();
    },

    async prefetchCommonRates(): Promise<void> {
      const commonCurrencies = ['usd', 'eur', 'php', 'idr'];

      await Promise.allSettled(
        commonCurrencies.map((currency) => this.fetchRates(currency))
      );
    },
  };
}

export type CurrencyService = ReturnType<typeof createCurrencyService>;

