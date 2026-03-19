export type PayableStatus = 'unpaid' | 'paid';

export interface Payable {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  dueDate: string;
  description: string | null;
  isPaid: boolean;
  categoryId: string | null;
  accountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayableRow {
  id: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  due_date: string;
  description: string | null;
  is_paid: number;
  category_id: string | null;
  account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePayableInput {
  name: string;
  totalAmount: number;
  dueDate: string;
  description?: string;
  categoryId?: string;
  accountId?: string;
}

export interface UpdatePayableInput {
  name?: string;
  totalAmount?: number;
  remainingAmount?: number;
  dueDate?: string;
  description?: string;
  categoryId?: string;
  accountId?: string;
}
