import { getDatabase } from '@/database';
import { mapRowToAccount } from './account.mapper';
import type { Account, AccountRow } from './account.types';
import type { RecurringRule, RecurringRuleRow } from '@/modules/recurring/recurring.types';
import { mapRowToRecurringRule } from '@/modules/recurring/recurring.mapper';

export interface CreditCardBillingInfo {
  account: Account;
  billingStartDate: string;
  billingEndDate: string;
  deadlineDate: string;
  totalAmount: number;
  transactionCount: number;
  recurringAmount: number;
  recurringCount: number;
  grandTotal: number;
}

export interface CreditCardReminder {
  accountId: string;
  accountName: string;
  amount: number;
  billingDate: string;
  deadlineDate: string;
  daysUntilDeadline: number;
  isOverdue: boolean;
}

function getBillingCycleDates(
  billingDay: number,
  referenceDate: Date = new Date()
): { startDate: Date; endDate: Date } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const currentDay = referenceDate.getDate();

  let endDate: Date;
  let startDate: Date;

  if (currentDay <= billingDay) {
    // Current billing cycle ends this month
    endDate = new Date(year, month, billingDay);
    startDate = new Date(year, month - 1, billingDay + 1);
  } else {
    // Current billing cycle ends next month
    endDate = new Date(year, month + 1, billingDay);
    startDate = new Date(year, month, billingDay + 1);
  }

  return { startDate, endDate };
}

function getDeadlineDate(
  billingEndDate: Date,
  deadlineDay: number
): Date {
  const year = billingEndDate.getFullYear();
  const month = billingEndDate.getMonth();

  // Deadline is typically in the month after billing date
  if (deadlineDay > billingEndDate.getDate()) {
    return new Date(year, month, deadlineDay);
  }
  return new Date(year, month + 1, deadlineDay);
}

function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function createCreditCardService() {
  return {
    async getBillingInfo(account: Account): Promise<CreditCardBillingInfo | null> {
      if (!account.creditMode && account.type !== 'credit_card') return null;
      if (!account.billingDate || !account.deadlineDate) return null;

      const { startDate, endDate } = getBillingCycleDates(account.billingDate);
      const deadline = getDeadlineDate(endDate, account.deadlineDate);

      const startDateStr = formatDateString(startDate);
      const endDateStr = formatDateString(endDate);

      const db = await getDatabase();

      // Get transactions in billing cycle
      const transactions = await db.getAllAsync<{ amount: number; count: number }>(
        `SELECT COALESCE(SUM(amount), 0) as amount, COUNT(*) as count
         FROM transactions
         WHERE account_id = ?
         AND type = 'expense'
         AND date >= ?
         AND date <= ?`,
        [account.id, startDateStr, endDateStr]
      );

      const transactionData = transactions[0] || { amount: 0, count: 0 };

      // Get recurring expenses that fall within billing cycle
      const recurringRows = await db.getAllAsync<RecurringRuleRow>(
        `SELECT * FROM recurring_rules
         WHERE account_id = ?
         AND type = 'expense'
         AND is_active = 1`,
        [account.id]
      );
      const recurringRules = recurringRows.map(mapRowToRecurringRule);

      let recurringAmount = 0;
      let recurringCount = 0;

      for (const rule of recurringRules) {
        const occurrences = this.countOccurrencesInPeriod(
          rule,
          startDate,
          endDate
        );
        if (occurrences > 0) {
          recurringAmount += rule.amount * occurrences;
          recurringCount += occurrences;
        }
      }

      return {
        account,
        billingStartDate: startDateStr,
        billingEndDate: endDateStr,
        deadlineDate: formatDateString(deadline),
        totalAmount: transactionData.amount,
        transactionCount: transactionData.count,
        recurringAmount,
        recurringCount,
        grandTotal: transactionData.amount + recurringAmount,
      };
    },

    countOccurrencesInPeriod(
      rule: RecurringRule,
      startDate: Date,
      endDate: Date
    ): number {
      const nextDate = new Date(rule.nextDate);

      // If next occurrence is after end date, no occurrences
      if (nextDate > endDate) return 0;

      // If next occurrence is before start date, we need to calculate forward
      let count = 0;
      let currentDate = new Date(nextDate);

      while (currentDate <= endDate) {
        if (currentDate >= startDate) {
          count++;
        }
        currentDate = this.getNextOccurrence(currentDate, rule.frequency);
      }

      return count;
    },

    getNextOccurrence(date: Date, frequency: string): Date {
      const next = new Date(date);

      switch (frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          next.setDate(next.getDate() + 7);
          break;
        case 'biweekly':
          next.setDate(next.getDate() + 14);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          break;
        case 'quarterly':
          next.setMonth(next.getMonth() + 3);
          break;
        case 'yearly':
          next.setFullYear(next.getFullYear() + 1);
          break;
        default:
          next.setMonth(next.getMonth() + 1);
      }

      return next;
    },

    async getCreditCardReminders(): Promise<CreditCardReminder[]> {
      const db = await getDatabase();

      const rows = await db.getAllAsync<AccountRow>(
        `SELECT * FROM accounts
         WHERE (type = 'credit_card' OR credit_mode = 1)
         AND billing_date IS NOT NULL
         AND deadline_date IS NOT NULL`
      );
      const creditCards = rows.map(mapRowToAccount);

      const reminders: CreditCardReminder[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const card of creditCards) {
        if (!card.billingDate || !card.deadlineDate) continue;

        const billingInfo = await this.getBillingInfo(card);
        if (!billingInfo || billingInfo.grandTotal === 0) continue;

        const deadline = new Date(billingInfo.deadlineDate);
        deadline.setHours(0, 0, 0, 0);

        const diffTime = deadline.getTime() - today.getTime();
        const daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        reminders.push({
          accountId: card.id,
          accountName: card.name,
          amount: billingInfo.grandTotal,
          billingDate: billingInfo.billingEndDate,
          deadlineDate: billingInfo.deadlineDate,
          daysUntilDeadline,
          isOverdue: daysUntilDeadline < 0,
        });
      }

      // Sort by deadline (most urgent first)
      return reminders.sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);
    },

    async getDueReminders(daysAhead: number = 7): Promise<CreditCardReminder[]> {
      const all = await this.getCreditCardReminders();
      return all.filter(
        (r) => r.daysUntilDeadline <= daysAhead || r.isOverdue
      );
    },
  };
}

export type CreditCardService = ReturnType<typeof createCreditCardService>;

