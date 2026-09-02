import { z } from 'zod';

export const expenseFormSchema = z.object({
  expense_date: z
    .string()
    .min(1, 'Date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  amount: z
    .number({ invalid_type_error: 'Amount must be a valid number' })
    .positive('Amount must be greater than 0'),
});

export type ExpenseFormSchemaType = z.infer<typeof expenseFormSchema>;
