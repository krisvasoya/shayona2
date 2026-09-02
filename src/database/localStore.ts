import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LocalCustomer,
  LocalBuyer,
  LocalInvoice,
  LocalInvoiceItem,
  LocalPayment,
  LocalExpense,
  SyncQueueItem,
} from './types';

function getPartitionKey(userId: string, collection: string): string {
  return `@shayona_user_${userId}_${collection}`;
}

// In-memory cache for fast, non-blocking synchronous reads
const inMemoryCache: Record<string, any[]> = {};

export const localStore = {
  // ----------------------------------------------------
  // Generic Read / Write Helpers (User Partitioned + In-Memory Cache)
  // ----------------------------------------------------
  async getCollection<T>(userId: string, collection: string): Promise<T[]> {
    if (!userId) return [];
    const key = getPartitionKey(userId, collection);

    if (inMemoryCache[key]) {
      return inMemoryCache[key] as T[];
    }

    try {
      const dataStr = await AsyncStorage.getItem(key);
      if (!dataStr) {
        inMemoryCache[key] = [];
        return [];
      }
      const parsed = JSON.parse(dataStr) as T[];
      inMemoryCache[key] = parsed;
      return parsed;
    } catch {
      return [];
    }
  },

  async setCollection<T>(userId: string, collection: string, items: T[]): Promise<void> {
    if (!userId) return;
    const key = getPartitionKey(userId, collection);
    inMemoryCache[key] = items;
    try {
      await AsyncStorage.setItem(key, JSON.stringify(items));
    } catch {
      // ignore
    }
  },

  // ----------------------------------------------------
  // Customers
  // ----------------------------------------------------
  async getCustomers(userId: string): Promise<LocalCustomer[]> {
    const list = await this.getCollection<LocalCustomer>(userId, 'customers');
    return list.filter(c => c.sync_status !== 'PENDING_DELETE');
  },

  async getCustomerById(userId: string, id: string): Promise<LocalCustomer | null> {
    const list = await this.getCustomers(userId);
    return list.find(c => c.id === id) || null;
  },

  async upsertCustomer(userId: string, customer: LocalCustomer): Promise<void> {
    const list = await this.getCollection<LocalCustomer>(userId, 'customers');
    const index = list.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      list[index] = customer;
    } else {
      list.unshift(customer);
    }
    await this.setCollection(userId, 'customers', list);
  },

  async bulkUpsertCustomers(userId: string, serverCustomers: LocalCustomer[]): Promise<void> {
    const localList = await this.getCollection<LocalCustomer>(userId, 'customers');
    const localMap = new Map<string, LocalCustomer>();
    localList.forEach(c => localMap.set(c.id, c));

    serverCustomers.forEach(sc => {
      const existing = localMap.get(sc.id);
      if (!existing || existing.sync_status === 'SYNCED') {
        localMap.set(sc.id, {
          ...sc,
          sync_status: 'SYNCED',
          local_updated_at: sc.updated_at,
        });
      }
    });

    await this.setCollection(userId, 'customers', Array.from(localMap.values()));
  },

  // ----------------------------------------------------
  // Buyers
  // ----------------------------------------------------
  async getBuyers(userId: string): Promise<LocalBuyer[]> {
    const list = await this.getCollection<LocalBuyer>(userId, 'buyers');
    return list.filter(b => b.sync_status !== 'PENDING_DELETE');
  },

  async getBuyerById(userId: string, id: string): Promise<LocalBuyer | null> {
    const list = await this.getBuyers(userId);
    return list.find(b => b.id === id) || null;
  },

  async upsertBuyer(userId: string, buyer: LocalBuyer): Promise<void> {
    const list = await this.getCollection<LocalBuyer>(userId, 'buyers');
    const index = list.findIndex(b => b.id === buyer.id);
    if (index >= 0) {
      list[index] = buyer;
    } else {
      list.unshift(buyer);
    }
    await this.setCollection(userId, 'buyers', list);
  },

  async bulkUpsertBuyers(userId: string, serverBuyers: LocalBuyer[]): Promise<void> {
    const localList = await this.getCollection<LocalBuyer>(userId, 'buyers');
    const localMap = new Map<string, LocalBuyer>();
    localList.forEach(b => localMap.set(b.id, b));

    serverBuyers.forEach(sb => {
      const existing = localMap.get(sb.id);
      if (!existing || existing.sync_status === 'SYNCED') {
        localMap.set(sb.id, {
          ...sb,
          sync_status: 'SYNCED',
          local_updated_at: sb.updated_at,
        });
      }
    });

    await this.setCollection(userId, 'buyers', Array.from(localMap.values()));
  },

  // ----------------------------------------------------
  // Invoices
  // ----------------------------------------------------
  async getInvoices(userId: string): Promise<LocalInvoice[]> {
    const list = await this.getCollection<LocalInvoice>(userId, 'invoices');
    return list.filter(inv => inv.sync_status !== 'PENDING_DELETE');
  },

  async getInvoiceById(userId: string, id: string): Promise<LocalInvoice | null> {
    const list = await this.getInvoices(userId);
    return list.find(inv => inv.id === id) || null;
  },

  async upsertInvoice(userId: string, invoice: LocalInvoice): Promise<void> {
    const list = await this.getCollection<LocalInvoice>(userId, 'invoices');
    const index = list.findIndex(inv => inv.id === invoice.id);
    if (index >= 0) {
      list[index] = invoice;
    } else {
      list.unshift(invoice);
    }
    await this.setCollection(userId, 'invoices', list);
  },

  async deleteInvoice(userId: string, id: string): Promise<void> {
    const list = await this.getCollection<LocalInvoice>(userId, 'invoices');
    const updated = list.map(inv =>
      inv.id === id ? { ...inv, sync_status: 'PENDING_DELETE' as const } : inv,
    );
    await this.setCollection(userId, 'invoices', updated);
  },

  async bulkUpsertInvoices(userId: string, serverInvoices: LocalInvoice[]): Promise<void> {
    const localList = await this.getCollection<LocalInvoice>(userId, 'invoices');
    const localMap = new Map<string, LocalInvoice>();
    localList.forEach(inv => localMap.set(inv.id, inv));

    serverInvoices.forEach(si => {
      const existing = localMap.get(si.id);
      if (!existing || existing.sync_status === 'SYNCED') {
        localMap.set(si.id, {
          ...si,
          sync_status: 'SYNCED',
          local_updated_at: si.updated_at,
        });
      }
    });

    await this.setCollection(userId, 'invoices', Array.from(localMap.values()));
  },

  // ----------------------------------------------------
  // Invoice Items
  // ----------------------------------------------------
  async getInvoiceItems(userId: string, invoiceId?: string): Promise<LocalInvoiceItem[]> {
    const list = await this.getCollection<LocalInvoiceItem>(userId, 'invoice_items');
    const filtered = list.filter(item => item.sync_status !== 'PENDING_DELETE');
    if (invoiceId) {
      return filtered.filter(item => item.invoice_id === invoiceId);
    }
    return filtered;
  },

  async setInvoiceItemsForInvoice(
    userId: string,
    invoiceId: string,
    items: LocalInvoiceItem[],
  ): Promise<void> {
    const all = await this.getCollection<LocalInvoiceItem>(userId, 'invoice_items');
    const remaining = all.filter(i => i.invoice_id !== invoiceId);
    await this.setCollection(userId, 'invoice_items', [...items, ...remaining]);
  },

  async bulkUpsertInvoiceItems(userId: string, serverItems: LocalInvoiceItem[]): Promise<void> {
    const localList = await this.getCollection<LocalInvoiceItem>(userId, 'invoice_items');
    const localMap = new Map<string, LocalInvoiceItem>();
    localList.forEach(i => localMap.set(i.id, i));

    serverItems.forEach(si => {
      const existing = localMap.get(si.id);
      if (!existing || existing.sync_status === 'SYNCED') {
        localMap.set(si.id, {
          ...si,
          sync_status: 'SYNCED',
          local_updated_at: si.created_at,
        });
      }
    });

    await this.setCollection(userId, 'invoice_items', Array.from(localMap.values()));
  },

  // ----------------------------------------------------
  // Payments (Phase 17)
  // ----------------------------------------------------
  async getPayments(userId: string, invoiceId?: string): Promise<LocalPayment[]> {
    const list = await this.getCollection<LocalPayment>(userId, 'payments');
    const valid = list.filter(p => p.sync_status !== 'PENDING_DELETE');
    if (invoiceId) {
      return valid
        .filter(p => p.invoice_id === invoiceId)
        .sort(
          (a, b) =>
            new Date(b.payment_date || b.created_at).getTime() -
            new Date(a.payment_date || a.created_at).getTime(),
        );
    }
    return valid.sort(
      (a, b) =>
        new Date(b.payment_date || b.created_at).getTime() -
        new Date(a.payment_date || a.created_at).getTime(),
    );
  },

  async getPaymentById(userId: string, id: string): Promise<LocalPayment | null> {
    const list = await this.getPayments(userId);
    return list.find(p => p.id === id) || null;
  },

  async upsertPayment(userId: string, payment: LocalPayment): Promise<void> {
    const list = await this.getCollection<LocalPayment>(userId, 'payments');
    const idx = list.findIndex(p => p.id === payment.id);
    if (idx >= 0) {
      list[idx] = payment;
    } else {
      list.unshift(payment);
    }
    await this.setCollection(userId, 'payments', list);
  },

  async savePayments(userId: string, payments: LocalPayment[]): Promise<void> {
    await this.setCollection(userId, 'payments', payments);
  },

  async bulkUpsertPayments(userId: string, serverPayments: LocalPayment[]): Promise<void> {
    const localList = await this.getCollection<LocalPayment>(userId, 'payments');
    const localMap = new Map<string, LocalPayment>();
    localList.forEach(p => localMap.set(p.id, p));

    serverPayments.forEach(sp => {
      const existing = localMap.get(sp.id);
      if (!existing || existing.sync_status === 'SYNCED') {
        localMap.set(sp.id, {
          ...sp,
          sync_status: 'SYNCED',
          local_updated_at: sp.updated_at || sp.created_at,
        });
      }
    });

    await this.setCollection(userId, 'payments', Array.from(localMap.values()));
  },

  // ----------------------------------------------------
  // Expenses
  // ----------------------------------------------------
  async getExpenses(userId: string): Promise<LocalExpense[]> {
    const list = await this.getCollection<LocalExpense>(userId, 'expenses');
    return list
      .filter(e => e.sync_status !== 'PENDING_DELETE')
      .sort((a, b) => {
        const dateCmp =
          new Date(b.expense_date || b.created_at).getTime() -
          new Date(a.expense_date || a.created_at).getTime();
        if (dateCmp !== 0) return dateCmp;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  },

  async getExpenseById(userId: string, id: string): Promise<LocalExpense | null> {
    const list = await this.getExpenses(userId);
    return list.find(e => e.id === id) || null;
  },

  async upsertExpense(userId: string, expense: LocalExpense): Promise<void> {
    const list = await this.getCollection<LocalExpense>(userId, 'expenses');
    const idx = list.findIndex(e => e.id === expense.id);
    if (idx >= 0) {
      list[idx] = expense;
    } else {
      list.unshift(expense);
    }
    await this.setCollection(userId, 'expenses', list);
  },

  async deleteExpense(userId: string, id: string): Promise<void> {
    const list = await this.getCollection<LocalExpense>(userId, 'expenses');
    const filtered = list.filter(e => e.id !== id);
    await this.setCollection(userId, 'expenses', filtered);
  },

  async saveExpenses(userId: string, expenses: LocalExpense[]): Promise<void> {
    await this.setCollection(userId, 'expenses', expenses);
  },

  async bulkUpsertExpenses(userId: string, serverExpenses: LocalExpense[]): Promise<void> {
    const localList = await this.getCollection<LocalExpense>(userId, 'expenses');
    const localMap = new Map<string, LocalExpense>();
    localList.forEach(e => localMap.set(e.id, e));

    serverExpenses.forEach(se => {
      const existing = localMap.get(se.id);
      if (!existing || existing.sync_status === 'SYNCED') {
        localMap.set(se.id, {
          ...se,
          sync_status: 'SYNCED',
          local_updated_at: se.updated_at || se.created_at,
        });
      }
    });

    await this.setCollection(userId, 'expenses', Array.from(localMap.values()));
  },

  // ----------------------------------------------------
  // Sync Queue (FIFO mutations)
  // ----------------------------------------------------
  async getSyncQueue(userId: string): Promise<SyncQueueItem[]> {
    return this.getCollection<SyncQueueItem>(userId, 'sync_queue');
  },

  async enqueueSyncItem(userId: string, item: SyncQueueItem): Promise<void> {
    const queue = await this.getSyncQueue(userId);
    const existingIdx = queue.findIndex(
      q => q.entity_id === item.entity_id && q.entity === item.entity,
    );
    if (existingIdx >= 0) {
      queue[existingIdx] = item;
    } else {
      queue.push(item);
    }
    await this.setCollection(userId, 'sync_queue', queue);
  },

  async removeSyncQueueItem(userId: string, queueItemId: string): Promise<void> {
    const queue = await this.getSyncQueue(userId);
    const updated = queue.filter(q => q.id !== queueItemId);
    await this.setCollection(userId, 'sync_queue', updated);
  },

  async updateSyncQueueItem(userId: string, item: SyncQueueItem): Promise<void> {
    const queue = await this.getSyncQueue(userId);
    const idx = queue.findIndex(q => q.id === item.id);
    if (idx >= 0) {
      queue[idx] = item;
      await this.setCollection(userId, 'sync_queue', queue);
    }
  },

  async clearUserStore(userId: string): Promise<void> {
    if (!userId) return;
    const keys = [
      getPartitionKey(userId, 'customers'),
      getPartitionKey(userId, 'buyers'),
      getPartitionKey(userId, 'invoices'),
      getPartitionKey(userId, 'invoice_items'),
      getPartitionKey(userId, 'payments'),
      getPartitionKey(userId, 'expenses'),
      getPartitionKey(userId, 'sync_queue'),
    ];
    keys.forEach(k => delete inMemoryCache[k]);
    try {
      await AsyncStorage.multiRemove(keys);
    } catch {
      // ignore
    }
  },
};
