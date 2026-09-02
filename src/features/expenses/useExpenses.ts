import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseService } from '@/src/services/expense.service';
import { ExpenseFormValues, ExpenseSummary } from '@/src/types/expense';

export const EXPENSES_QUERY_KEY = ['expenses'];

export function useExpenses(startDate?: string, endDate?: string) {
  return useQuery<ExpenseSummary[]>({
    queryKey: [...EXPENSES_QUERY_KEY, startDate, endDate],
    queryFn: () => expenseService.getExpenses(startDate, endDate),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useExpenseDetails(id: string) {
  return useQuery<ExpenseSummary | null>({
    queryKey: [...EXPENSES_QUERY_KEY, 'detail', id],
    queryFn: () => expenseService.getExpenseById(id),
    enabled: Boolean(id),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ExpenseFormValues) => expenseService.createExpense(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ExpenseFormValues }) =>
      expenseService.updateExpense(id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expenseService.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
