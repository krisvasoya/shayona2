import * as Crypto from 'expo-crypto';
import { supabase } from './supabase/client';
import { localStore } from '@/src/database/localStore';
import { LocalExpense } from '@/src/database/types';
import { ExpenseSummary, ExpenseFormValues } from '@/src/types/expense';
import { rupeesToPaise } from '@/src/utils';
import { syncService } from './sync.service';
import { networkService } from './network.service';

export interface ExpenseOperationResult<T = unknown> {
  data: T | null;
  error?: string;
}

export const expenseService = {
  /**
   * Fetch all expenses for authenticated user (Offline-First)
   */
  async getExpenses(startDate?: string, endDate?: string): Promise<ExpenseSummary[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // Background pull if online
    if (networkService.isOnline()) {
      syncService.pullFromServer(userId).catch(() => {});
    }

    // 1. Read local expenses
    const localExpenses = await localStore.getExpenses(userId);

    // 2. Filter by date range if provided
    let filtered = localExpenses;
    if (startDate && endDate) {
      filtered = filtered.filter(e => e.expense_date >= startDate && e.expense_date <= endDate);
    }

    return filtered.map(e => ({
      id: e.id,
      user_id: e.user_id,
      expense_date: e.expense_date,
      amount: Number(e.amount),
      created_at: e.created_at,
      updated_at: e.updated_at,
    }));
  },

  /**
   * Fetch single expense by ID
   */
  async getExpenseById(id: string): Promise<ExpenseSummary | null> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const local = await localStore.getExpenseById(userData.user.id, id);
    if (!local) return null;

    return {
      id: local.id,
      user_id: local.user_id,
      expense_date: local.expense_date,
      amount: Number(local.amount),
      created_at: local.created_at,
      updated_at: local.updated_at,
    };
  },

  /**
   * Create new expense (Offline-First)
   */
  async createExpense(values: ExpenseFormValues): Promise<ExpenseOperationResult<ExpenseSummary>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;
      const expenseId = Crypto.randomUUID();
      const now = new Date().toISOString();
      const amountPaise = rupeesToPaise(values.amount);

      const localExpense: LocalExpense = {
        id: expenseId,
        user_id: userId,
        expense_date: values.expense_date,
        amount: amountPaise,
        created_at: now,
        updated_at: now,
        sync_status: 'PENDING_CREATE',
        local_updated_at: now,
      };

      // 1. Save to local store
      await localStore.upsertExpense(userId, localExpense);

      // 2. Enqueue sync mutation
      await localStore.enqueueSyncItem(userId, {
        id: `sync-exp-${expenseId}`,
        user_id: userId,
        entity: 'EXPENSE',
        entity_id: expenseId,
        operation: 'CREATE',
        payload: {
          id: expenseId,
          user_id: userId,
          amount: amountPaise,
          expense_date: values.expense_date,
        },
        created_at: now,
        retry_count: 0,
      });

      // 3. Trigger background sync if online
      if (networkService.isOnline()) {
        syncService.processQueue(userId).catch(() => {});
      }

      return {
        data: {
          id: expenseId,
          user_id: userId,
          expense_date: values.expense_date,
          amount: amountPaise,
          created_at: now,
          updated_at: now,
        },
      };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Failed to create expense.' };
    }
  },

  /**
   * Update existing expense (Offline-First)
   */
  async updateExpense(
    id: string,
    values: ExpenseFormValues,
  ): Promise<ExpenseOperationResult<ExpenseSummary>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;
      const existing = await localStore.getExpenseById(userId, id);
      if (!existing) {
        return { data: null, error: 'Expense record not found.' };
      }

      const now = new Date().toISOString();
      const amountPaise = rupeesToPaise(values.amount);

      const updatedExpense: LocalExpense = {
        ...existing,
        expense_date: values.expense_date,
        amount: amountPaise,
        updated_at: now,
        sync_status:
          existing.sync_status === 'PENDING_CREATE' ? 'PENDING_CREATE' : 'PENDING_UPDATE',
        local_updated_at: now,
      };

      // 1. Update local store
      await localStore.upsertExpense(userId, updatedExpense);

      // 2. Enqueue sync mutation
      await localStore.enqueueSyncItem(userId, {
        id: `sync-exp-upd-${id}`,
        user_id: userId,
        entity: 'EXPENSE',
        entity_id: id,
        operation: 'UPDATE',
        payload: {
          id,
          user_id: userId,
          amount: amountPaise,
          expense_date: values.expense_date,
        },
        created_at: now,
        retry_count: 0,
      });

      // 3. Trigger background sync if online
      if (networkService.isOnline()) {
        syncService.processQueue(userId).catch(() => {});
      }

      return {
        data: {
          id,
          user_id: userId,
          expense_date: values.expense_date,
          amount: amountPaise,
          created_at: existing.created_at,
          updated_at: now,
        },
      };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Failed to update expense.' };
    }
  },

  /**
   * Delete expense (Offline-First)
   */
  async deleteExpense(id: string): Promise<ExpenseOperationResult<boolean>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;
      const existing = await localStore.getExpenseById(userId, id);
      if (!existing) {
        return { data: null, error: 'Expense record not found.' };
      }

      const now = new Date().toISOString();

      // 1. Remove from local store
      await localStore.deleteExpense(userId, id);

      // 2. Enqueue delete sync mutation
      if (existing.sync_status !== 'PENDING_CREATE') {
        await localStore.enqueueSyncItem(userId, {
          id: `sync-exp-del-${id}`,
          user_id: userId,
          entity: 'EXPENSE',
          entity_id: id,
          operation: 'DELETE',
          payload: null,
          created_at: now,
          retry_count: 0,
        });
      }

      // 3. Trigger background sync if online
      if (networkService.isOnline()) {
        syncService.processQueue(userId).catch(() => {});
      }

      return { data: true };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Failed to delete expense.' };
    }
  },
};
