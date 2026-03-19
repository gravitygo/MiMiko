import type { Payable, PayableRow } from './payable.types';

export function mapRowToPayable(row: PayableRow): Payable {
  return {
    id: row.id,
    name: row.name,
    totalAmount: row.total_amount,
    remainingAmount: row.remaining_amount,
    dueDate: row.due_date,
    description: row.description,
    isPaid: row.is_paid === 1,
    categoryId: row.category_id,
    accountId: row.account_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
