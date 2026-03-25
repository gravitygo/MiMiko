export type AccountType = 'cash' | 'bank' | 'credit_card' | 'e_wallet';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  icon: string;
  color: string;
  isDefault: boolean;
  // Credit mode fields (available to any account type)
  creditMode?: boolean; // When true, expenses add to balance (outstanding debt) instead of subtracting
  billingDate?: number; // Day of month (1-31) when billing cycle ends
  deadlineDate?: number; // Day of month (1-31) when payment is due
  createdAt: string;
  updatedAt: string;
}

export interface AccountRow {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  icon: string;
  color: string;
  is_default: number;
  credit_mode: number | null;
  billing_date: number | null;
  deadline_date: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  balance?: number;
  currency?: string;
  creditMode?: boolean;
  billingDate?: number;
  deadlineDate?: number;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  icon?: string;
  color?: string;
  currency?: string;
  creditMode?: boolean;
  billingDate?: number;
  deadlineDate?: number;
}

