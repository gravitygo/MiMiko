import * as Crypto from 'expo-crypto';

import { getDatabase } from '@/database';
import { createAccountService } from './account.service';
import type { Account } from './account.types';
import { createCreditCardCycleRepository } from './credit-card-cycle.repository';
import type { CreditCardCycle, CreditCardCycleWithTotal } from './credit-card-cycle.types';

// ─── Date utilities (mirrors logic in credit-card.service.ts) ────────────────

function getBillingCycleDates(
  billingDay: number,
  referenceDate: Date = new Date()
): { startDate: Date; endDate: Date } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();

  if (currentDay <= billingDay) {
    return {
      endDate: new Date(year, month, billingDay),
      startDate: new Date(year, month - 1, billingDay + 1),
    };
  }
  return {
    endDate: new Date(year, month + 1, billingDay),
    startDate: new Date(year, month, billingDay + 1),
  };
}

function getDeadlineDate(billingEndDate: Date, deadlineDay: number): Date {
  const year = billingEndDate.getFullYear();
  const month = billingEndDate.getMonth();
  if (deadlineDay > billingEndDate.getDate()) {
    return new Date(year, month, deadlineDay);
  }
  return new Date(year, month + 1, deadlineDay);
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ─── Live transaction sum for a billing period ───────────────────────────────

async function fetchTransactionAmount(
  accountId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ amount: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS amount
     FROM transactions
     WHERE account_id = ? AND type = 'expense' AND date >= ? AND date <= ?`,
    [accountId, startDate, endDate]
  );
  return result?.amount ?? 0;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export function createCreditCardCycleService() {
  const repo = createCreditCardCycleRepository();
  const accountService = createAccountService();

  return {
    /**
     * Ensure a cycle record exists for the account's current billing period.
     * Creates it if missing and returns it.
     */
    async ensureCurrentCycle(account: Account): Promise<CreditCardCycle> {
      if (!account.billingDate || !account.deadlineDate) {
        throw new Error(`Account "${account.name}" is missing billing configuration.`);
      }

      const { startDate, endDate } = getBillingCycleDates(account.billingDate);
      const deadline = getDeadlineDate(endDate, account.deadlineDate);

      const endDateStr = toDateString(endDate);

      const existing = await repo.findByBillingEnd(account.id, endDateStr);
      if (existing) return existing;

      const now = new Date().toISOString();
      const cycle: CreditCardCycle = {
        id: Crypto.randomUUID(),
        accountId: account.id,
        billingStartDate: toDateString(startDate),
        billingEndDate: endDateStr,
        deadlineDate: toDateString(deadline),
        carryoverAmount: 0,
        paidAmount: 0,
        isClosed: false,
        createdAt: now,
        updatedAt: now,
      };

      await repo.insert(cycle);
      return cycle;
    },

    /**
     * Close all overdue unclosed cycles for an account and carry their
     * remaining balance into the current billing cycle.
     */
    async processCarryovers(account: Account): Promise<void> {
      if (!account.billingDate || !account.deadlineDate) return;

      const today = toDateString(new Date());
      const overdue = await repo.findOverdueUnclosed(account.id, today);
      if (overdue.length === 0) return;

      // Ensure current cycle exists before we start adding carryover to it
      const current = await this.ensureCurrentCycle(account);

      for (const old of overdue) {
        // Safety: don't carry a cycle into itself
        if (old.id === current.id) continue;

        const txAmount = await fetchTransactionAmount(
          account.id,
          old.billingStartDate,
          old.billingEndDate
        );
        const totalAmount = txAmount + old.carryoverAmount;
        const remaining = Math.max(0, totalAmount - old.paidAmount);

        if (remaining > 0) {
          await repo.addCarryover(current.id, remaining);
        }

        // Aggregate and close the old cycle
        await repo.markClosed(old.id);
      }
    },

    /**
     * Return all active (unclosed) billing cycles across every credit-mode
     * account, enriched with live transaction totals.
     *
     * Automatically:
     * - Ensures a cycle record exists for the current billing period.
     * - Processes carryovers from overdue cycles before returning results.
     */
    async getActiveCycles(): Promise<CreditCardCycleWithTotal[]> {
      const accounts = await accountService.getAll();
      const creditAccounts = accounts.filter(
        (a) => (a.creditMode || a.type === 'credit_card') && a.billingDate && a.deadlineDate
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const results: CreditCardCycleWithTotal[] = [];

      for (const account of creditAccounts) {
        // Step 1: carry over any overdue cycles
        await this.processCarryovers(account);
        // Step 2: ensure we have a cycle for the current period
        await this.ensureCurrentCycle(account);

        // Step 3: gather all unclosed cycles for this account
        const cycles = await repo.findUnclosedByAccount(account.id);

        for (const cycle of cycles) {
          const transactionAmount = await fetchTransactionAmount(
            account.id,
            cycle.billingStartDate,
            cycle.billingEndDate
          );
          const totalAmount = transactionAmount + cycle.carryoverAmount;
          const remainingAmount = Math.max(0, totalAmount - cycle.paidAmount);

          // Auto-close cycles with nothing remaining
          if (totalAmount === 0) continue;
          if (remainingAmount <= 0 && totalAmount > 0) {
            await repo.markClosed(cycle.id);
            continue;
          }

          const deadline = new Date(cycle.deadlineDate + 'T00:00:00');
          deadline.setHours(0, 0, 0, 0);
          const diffMs = deadline.getTime() - today.getTime();
          const daysUntilDeadline = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          results.push({
            ...cycle,
            accountName: account.name,
            transactionAmount,
            totalAmount,
            remainingAmount,
            daysUntilDeadline,
            isOverdue: daysUntilDeadline < 0,
          });
        }
      }

      // Most urgent first
      return results.sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);
    },

    /**
     * Record a payment against a specific cycle.
     * Clamps the payment to the remaining balance and auto-closes the cycle
     * when it reaches zero.
     *
     * @returns the actual amount that was applied (may be clamped)
     */
    async recordPayment(
      cycleId: string,
      amount: number,
      remainingAmount: number
    ): Promise<number> {
      const applied = Math.min(amount, remainingAmount);
      if (applied <= 0) return 0;

      await repo.addPaidAmount(cycleId, applied);

      // Auto-close if fully paid
      if (remainingAmount - applied <= 0) {
        await repo.markClosed(cycleId);
      }

      return applied;
    },
  };
}

export type CreditCardCycleService = ReturnType<typeof createCreditCardCycleService>;
