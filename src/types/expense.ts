import { DbExpense } from './database';

export type Expense = DbExpense;

export interface ExpenseFormValues {
  expense_date: string; // YYYY-MM-DD
  amount: number; // in Rupees from UI input
}

export interface ExpenseSummary {
  id: string;
  user_id: string;
  expense_date: string;
  amount: number; // in Paise
  created_at: string;
  updated_at: string;
}
