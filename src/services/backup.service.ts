import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from './supabase/client';
import { localStore } from '@/src/database/localStore';
import {
  DbProfile,
  DbCustomer,
  DbBuyer,
  DbInvoice,
  DbInvoiceItem,
  DbPayment,
  DbExpense,
} from '@/src/types/database';
import { syncService } from './sync.service';
import { networkService } from './network.service';

export interface AccountBackupV1 {
  backupVersion: number;
  appName: string;
  createdAt: string;
  userId: string;
  profile: Partial<DbProfile>;
  customers: DbCustomer[];
  buyers: DbBuyer[];
  invoices: DbInvoice[];
  invoiceItems: DbInvoiceItem[];
  payments: DbPayment[];
  expenses?: DbExpense[];
}

export interface RestoreResult {
  success: boolean;
  customersRestored: number;
  buyersRestored: number;
  invoicesRestored: number;
  paymentsRestored: number;
  expensesRestored?: number;
  error?: string;
}

export const backupService = {
  /**
   * Generates a complete, structured JSON backup of the authenticated user's business data
   * and opens the native file share dialog.
   */
  async exportBackup(
    userId: string,
  ): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
      if (!userId) {
        return { success: false, error: 'User not authenticated.' };
      }

      // 1. Pull latest cloud data if online to ensure 100% comprehensive backup
      if (networkService.isOnline()) {
        try {
          await syncService.pullFromServer(userId);
        } catch {
          // fallback to local data if pull fails
        }
      }

      // 2. Fetch all user business records from local store
      const [customers, buyers, invoices, allInvoiceItems, payments, expenses] = await Promise.all([
        localStore.getCustomers(userId),
        localStore.getBuyers(userId),
        localStore.getInvoices(userId),
        localStore.getCollection<DbInvoiceItem>(userId, 'invoice_items'),
        localStore.getPayments(userId),
        localStore.getExpenses(userId),
      ]);

      // Filter line items belonging only to current user's invoices
      const userInvoiceIds = new Set(invoices.map(inv => inv.id));
      const invoiceItems = allInvoiceItems.filter(item => userInvoiceIds.has(item.invoice_id));

      // Fetch safe business profile
      let profile: Partial<DbProfile> = {};
      try {
        const { data: profileData } = await (supabase.from('profiles') as any)
          .select('name, shop_name, phone, email, language')
          .eq('id', userId)
          .single();
        if (profileData) {
          profile = profileData;
        }
      } catch {
        // ignore
      }

      // 3. Build versioned backup payload (STRICTLY EXCLUDING AUTH TOKENS, PASSWORDS, SECRETS)
      const backupPayload: AccountBackupV1 = {
        backupVersion: 1,
        appName: 'Shayona Invoice',
        createdAt: new Date().toISOString(),
        userId,
        profile,
        customers: customers.map(({ sync_status, local_updated_at, ...c }) => c as DbCustomer),
        buyers: buyers.map(({ sync_status, local_updated_at, ...b }) => b as DbBuyer),
        invoices: invoices.map(({ sync_status, local_updated_at, ...inv }) => inv as DbInvoice),
        invoiceItems,
        payments: payments.map(({ sync_status, local_updated_at, ...p }) => p as DbPayment),
        expenses: expenses.map(({ sync_status, local_updated_at, ...e }) => e as DbExpense),
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `shayona_backup_${dateStr}.json`;
      const filePath = `${FileSystem.cacheDirectory || ''}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backupPayload, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 4. Open native OS sharing dialog if available
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Save Shayona Invoice Backup',
          UTI: 'public.json',
        });
      }

      return { success: true, filePath };
    } catch (err) {
      return { success: false, error: (err as Error).message || 'Failed to generate backup.' };
    }
  },

  /**
   * Validates backup data format, version, data structures, and financial invariants.
   */
  validateBackup(jsonString: string): { valid: boolean; data?: AccountBackupV1; error?: string } {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return { valid: false, error: 'Backup file is empty or corrupted.' };
      }

      const parsed = JSON.parse(jsonString) as AccountBackupV1;

      if (!parsed || typeof parsed !== 'object') {
        return { valid: false, error: 'Invalid JSON structure.' };
      }

      if (parsed.backupVersion !== 1) {
        return {
          valid: false,
          error: `Unsupported backup version (${parsed.backupVersion || 'Unknown'}). Only Version 1 is supported.`,
        };
      }

      if (
        !Array.isArray(parsed.customers) ||
        !Array.isArray(parsed.buyers) ||
        !Array.isArray(parsed.invoices) ||
        !Array.isArray(parsed.invoiceItems)
      ) {
        return { valid: false, error: 'Backup is missing required entity arrays.' };
      }

      // Validate financial invariants on each invoice
      for (const inv of parsed.invoices) {
        if (!inv.id || !inv.invoice_number) {
          return { valid: false, error: 'Backup contains invalid invoice records missing IDs.' };
        }

        const total = Number(inv.total_amount || 0);
        const paid = Number(inv.paid_amount || 0);
        const remaining = Number(inv.remaining_amount || 0);

        if (total < 0 || paid < 0 || remaining < 0) {
          return {
            valid: false,
            error: `Invoice ${inv.invoice_number} contains negative financial values.`,
          };
        }

        if (paid > total) {
          return {
            valid: false,
            error: `Invoice ${inv.invoice_number} has paid amount exceeding total.`,
          };
        }
      }

      return { valid: true, data: parsed };
    } catch (err) {
      return { valid: false, error: (err as Error).message || 'Corrupted backup file.' };
    }
  },

  /**
   * Restores data safely using UPSERT/MERGE, remapping records to current authenticated user.
   */
  async restoreBackup(backupData: AccountBackupV1, currentUserId: string): Promise<RestoreResult> {
    try {
      if (!currentUserId) {
        return {
          success: false,
          customersRestored: 0,
          buyersRestored: 0,
          invoicesRestored: 0,
          paymentsRestored: 0,
          error: 'User not authenticated.',
        };
      }

      const now = new Date().toISOString();

      // 1. Remap and upsert Customers
      let customersCount = 0;
      for (const cust of backupData.customers) {
        const remappedCust: DbCustomer = {
          ...cust,
          user_id: currentUserId,
        };
        await localStore.upsertCustomer(currentUserId, {
          ...remappedCust,
          sync_status: 'PENDING_UPDATE',
          local_updated_at: now,
        });
        await localStore.enqueueSyncItem(currentUserId, {
          id: `sync-restore-cust-${remappedCust.id}`,
          user_id: currentUserId,
          entity: 'CUSTOMER',
          entity_id: remappedCust.id,
          operation: 'UPDATE',
          payload: {
            name: remappedCust.name,
            phone: remappedCust.phone,
            address: remappedCust.address,
          },
          created_at: now,
          retry_count: 0,
        });
        customersCount++;
      }

      // 2. Remap and upsert Buyers
      let buyersCount = 0;
      for (const buy of backupData.buyers) {
        const remappedBuy: DbBuyer = {
          ...buy,
          user_id: currentUserId,
        };
        await localStore.upsertBuyer(currentUserId, {
          ...remappedBuy,
          sync_status: 'PENDING_UPDATE',
          local_updated_at: now,
        });
        await localStore.enqueueSyncItem(currentUserId, {
          id: `sync-restore-buy-${remappedBuy.id}`,
          user_id: currentUserId,
          entity: 'BUYER',
          entity_id: remappedBuy.id,
          operation: 'UPDATE',
          payload: {
            name: remappedBuy.name,
            phone: remappedBuy.phone,
            address: remappedBuy.address,
          },
          created_at: now,
          retry_count: 0,
        });
        buyersCount++;
      }

      // 3. Remap and upsert Invoices & Items
      let invoicesCount = 0;
      for (const inv of backupData.invoices) {
        const remappedInv: DbInvoice = {
          ...inv,
          user_id: currentUserId,
          remaining_amount: Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount || 0)),
        };

        const matchingItems = backupData.invoiceItems.filter(
          item => item.invoice_id === remappedInv.id,
        );

        await localStore.upsertInvoice(currentUserId, {
          ...remappedInv,
          sync_status: 'PENDING_UPDATE',
          local_updated_at: now,
        });

        if (matchingItems.length > 0) {
          await localStore.setInvoiceItemsForInvoice(
            currentUserId,
            remappedInv.id,
            matchingItems.map(it => ({
              ...it,
              sync_status: 'SYNCED',
              local_updated_at: now,
            })),
          );
        }

        await localStore.enqueueSyncItem(currentUserId, {
          id: `sync-restore-inv-${remappedInv.id}`,
          user_id: currentUserId,
          entity: 'INVOICE',
          entity_id: remappedInv.id,
          operation: 'UPDATE',
          payload: {
            invoice_number: remappedInv.invoice_number,
            party_type: remappedInv.party_type,
            party_id: remappedInv.party_id,
            invoice_date: remappedInv.invoice_date,
            total_amount: remappedInv.total_amount,
            paid_amount: remappedInv.paid_amount,
            remaining_amount: remappedInv.remaining_amount,
            notes: remappedInv.notes,
            items: matchingItems,
          },
          created_at: now,
          retry_count: 0,
        });
        invoicesCount++;
      }

      // 4. Remap and upsert Payments
      let paymentsCount = 0;
      if (Array.isArray(backupData.payments)) {
        for (const pay of backupData.payments) {
          const remappedPay: DbPayment = {
            ...pay,
            user_id: currentUserId,
          };
          await localStore.upsertPayment(currentUserId, {
            ...remappedPay,
            sync_status: 'PENDING_UPDATE',
            local_updated_at: now,
          });
          await localStore.enqueueSyncItem(currentUserId, {
            id: `sync-restore-pay-${remappedPay.id}`,
            user_id: currentUserId,
            entity: 'PAYMENT',
            entity_id: remappedPay.id,
            operation: 'CREATE',
            payload: {
              id: remappedPay.id,
              user_id: currentUserId,
              invoice_id: remappedPay.invoice_id,
              amount: remappedPay.amount,
              payment_date: remappedPay.payment_date,
              notes: remappedPay.notes,
            },
            created_at: now,
            retry_count: 0,
          });
          paymentsCount++;
        }
      }

      // 5. Remap and upsert Expenses (Phase 23)
      let expensesCount = 0;
      if (Array.isArray(backupData.expenses)) {
        for (const exp of backupData.expenses) {
          const remappedExp: DbExpense = {
            ...exp,
            user_id: currentUserId,
          };
          await localStore.upsertExpense(currentUserId, {
            ...remappedExp,
            sync_status: 'PENDING_UPDATE',
            local_updated_at: now,
          });
          await localStore.enqueueSyncItem(currentUserId, {
            id: `sync-restore-exp-${remappedExp.id}`,
            user_id: currentUserId,
            entity: 'EXPENSE',
            entity_id: remappedExp.id,
            operation: 'CREATE',
            payload: {
              id: remappedExp.id,
              user_id: currentUserId,
              amount: remappedExp.amount,
              expense_date: remappedExp.expense_date,
            },
            created_at: now,
            retry_count: 0,
          });
          expensesCount++;
        }
      }

      // 6. Trigger cloud synchronization if device is online
      if (networkService.isOnline()) {
        syncService.processQueue(currentUserId).catch(() => {});
      }

      return {
        success: true,
        customersRestored: customersCount,
        buyersRestored: buyersCount,
        invoicesRestored: invoicesCount,
        paymentsRestored: paymentsCount,
        expensesRestored: expensesCount,
      };
    } catch (err) {
      return {
        success: false,
        customersRestored: 0,
        buyersRestored: 0,
        invoicesRestored: 0,
        paymentsRestored: 0,
        expensesRestored: 0,
        error: (err as Error).message || 'Failed to restore backup.',
      };
    }
  },
};
