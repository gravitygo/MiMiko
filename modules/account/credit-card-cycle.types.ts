export interface CreditCardCycle {
  id: string;
  accountId: string;
  billingStartDate: string;
  billingEndDate: string;
  deadlineDate: string;
  /** Amount carried over from previous overdue cycle(s) */
  carryoverAmount: number;
  /** Total amount paid against this cycle */
  paidAmount: number;
  /** Closed when fully paid, or when remaining has been carried to the next cycle */
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardCycleRow {
  id: string;
  account_id: string;
  billing_start_date: string;
  billing_end_date: string;
  deadline_date: string;
  carryover_amount: number;
  paid_amount: number;
  is_closed: number;
  created_at: string;
  updated_at: string;
}

export interface CreditCardCycleWithTotal extends CreditCardCycle {
  accountName: string;
  /** Live sum of expense transactions charged to this account in the cycle period */
  transactionAmount: number;
  /** transactionAmount + carryoverAmount */
  totalAmount: number;
  /** totalAmount - paidAmount */
  remainingAmount: number;
  daysUntilDeadline: number;
  isOverdue: boolean;
}
