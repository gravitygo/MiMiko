import { getDatabase } from '@/database';
import type { CurrencyData, CurrencyRow } from './currency.types';

export function createCurrencyRepository() {
  return {
    async upsert(data: CurrencyData): Promise<void> {
      const db = await getDatabase();
      const id = `rates_${data.baseCurrency}`;
      const ratesJson = JSON.stringify(data.rates);

      await db.runAsync(
        `INSERT INTO exchange_rates (id, base_currency, rates_json, date, fetched_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           rates_json = excluded.rates_json,
           date = excluded.date,
           fetched_at = excluded.fetched_at`,
        [id, data.baseCurrency, ratesJson, data.date, data.fetchedAt]
      );
    },

    async findByBase(baseCurrency: string): Promise<CurrencyData | null> {
      const db = await getDatabase();
      const row = await db.getFirstAsync<CurrencyRow>(
        'SELECT * FROM exchange_rates WHERE base_currency = ?',
        [baseCurrency.toLowerCase()]
      );

      if (!row) return null;

      return {
        baseCurrency: row.base_currency,
        rates: JSON.parse(row.rates_json),
        date: row.date,
        fetchedAt: row.fetched_at,
      };
    },

    async findAll(): Promise<CurrencyData[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<CurrencyRow>(
        'SELECT * FROM exchange_rates ORDER BY base_currency ASC'
      );

      return rows.map((row) => ({
        baseCurrency: row.base_currency,
        rates: JSON.parse(row.rates_json),
        date: row.date,
        fetchedAt: row.fetched_at,
      }));
    },

    async deleteAll(): Promise<void> {
      const db = await getDatabase();
      await db.runAsync('DELETE FROM exchange_rates');
    },
  };
}

export type CurrencyRepository = ReturnType<typeof createCurrencyRepository>;

