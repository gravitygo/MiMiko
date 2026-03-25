import { getDatabase } from '@/database';
import type { CreditCardCycle, CreditCardCycleRow } from './credit-card-cycle.types';

function mapRow(row: CreditCardCycleRow): CreditCardCycle {
  return {
    id: row.id,
    accountId: row.account_id,
    billingStartDate: row.billing_start_date,
    billingEndDate: row.billing_end_date,
    deadlineDate: row.deadline_date,
    carryoverAmount: row.carryover_amount,
    paidAmount: row.paid_amount,
    isClosed: row.is_closed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createCreditCardCycleRepository() {
  return {
    async insert(cycle: CreditCardCycle): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO credit_card_cycles
           (id, account_id, billing_start_date, billing_end_date, deadline_date,
            carryover_amount, paid_amount, is_closed, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cycle.id,
          cycle.accountId,
          cycle.billingStartDate,
          cycle.billingEndDate,
          cycle.deadlineDate,
          cycle.carryoverAmount,
          cycle.paidAmount,
          cycle.isClosed ? 1 : 0,
          cycle.createdAt,
          cycle.updatedAt,
        ]
      );
    },

    async findById(id: string): Promise<CreditCardCycle | null> {
      const db = await getDatabase();
      const row = await db.getFirstAsync<CreditCardCycleRow>(
        'SELECT * FROM credit_card_cycles WHERE id = ?',
        [id]
      );
      return row ? mapRow(row) : null;
    },

    /** Find the cycle record for a specific billing-end date of an account. */
    async findByBillingEnd(accountId: string, billingEndDate: string): Promise<CreditCardCycle | null> {
      const db = await getDatabase();
      const row = await db.getFirstAsync<CreditCardCycleRow>(
        'SELECT * FROM credit_card_cycles WHERE account_id = ? AND billing_end_date = ?',
        [accountId, billingEndDate]
      );
      return row ? mapRow(row) : null;
    },

    /** All unclosed cycles for an account, oldest first. */
    async findUnclosedByAccount(accountId: string): Promise<CreditCardCycle[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<CreditCardCycleRow>(
        'SELECT * FROM credit_card_cycles WHERE account_id = ? AND is_closed = 0 ORDER BY billing_end_date ASC',
        [accountId]
      );
      return rows.map(mapRow);
    },

    /** Unclosed cycles whose payment deadline is in the past. */
    async findOverdueUnclosed(accountId: string, today: string): Promise<CreditCardCycle[]> {
      const db = await getDatabase();
      const rows = await db.getAllAsync<CreditCardCycleRow>(
        'SELECT * FROM credit_card_cycles WHERE account_id = ? AND is_closed = 0 AND deadline_date < ? ORDER BY billing_end_date ASC',
        [accountId, today]
      );
      return rows.map(mapRow);
    },

    async addPaidAmount(id: string, amount: number): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE credit_card_cycles SET paid_amount = paid_amount + ?, updated_at = ? WHERE id = ?',
        [amount, new Date().toISOString(), id]
      );
    },

    async addCarryover(id: string, amount: number): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE credit_card_cycles SET carryover_amount = carryover_amount + ?, updated_at = ? WHERE id = ?',
        [amount, new Date().toISOString(), id]
      );
    },

    async markClosed(id: string): Promise<void> {
      const db = await getDatabase();
      await db.runAsync(
        'UPDATE credit_card_cycles SET is_closed = 1, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), id]
      );
    },
  };
}

export type CreditCardCycleRepository = ReturnType<typeof createCreditCardCycleRepository>;
