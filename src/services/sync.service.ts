import { supabase } from './supabase/client';
import { localStore } from '@/src/database/localStore';
import { SyncQueueItem } from '@/src/database/types';
import { networkService } from './network.service';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  remainingQueueCount: number;
  error?: string;
}

let isSyncInProgress = false;

export const syncService = {
  /**
   * Main synchronization worker.
   * Processes outbound mutation queue first (in dependency order),
   * then pulls latest changes from Supabase.
   */
  async syncAll(userId: string): Promise<SyncResult> {
    if (!userId) {
      return {
        success: false,
        syncedCount: 0,
        remainingQueueCount: 0,
        error: 'User not authenticated.',
      };
    }

    if (!networkService.isOnline()) {
      const queue = await localStore.getSyncQueue(userId);
      return {
        success: false,
        syncedCount: 0,
        remainingQueueCount: queue.length,
        error: 'Device is offline.',
      };
    }

    if (isSyncInProgress) {
      const queue = await localStore.getSyncQueue(userId);
      return { success: true, syncedCount: 0, remainingQueueCount: queue.length };
    }

    try {
      isSyncInProgress = true;

      // 1. Process outbound sync queue
      const queueResult = await this.processQueue(userId);

      // 2. Pull down latest server state to keep local store fresh
      try {
        await this.pullFromServer(userId);
      } catch {
        // Pull failure does not invalidate successfully uploaded queue items
      }

      return queueResult;
    } finally {
      isSyncInProgress = false;
    }
  },

  /**
   * Process all queued local mutations in strict dependency order:
   * 1. Customers & Buyers (parents)
   * 2. Invoices (headers)
   * 3. Invoice Items (children)
   * 4. Deletions
   */
  async processQueue(userId: string): Promise<SyncResult> {
    const rawQueue = await localStore.getSyncQueue(userId);
    if (rawQueue.length === 0) {
      return { success: true, syncedCount: 0, remainingQueueCount: 0 };
    }

    // Sort queue items by entity priority
    const priorityMap: Record<string, number> = {
      CUSTOMER: 1,
      BUYER: 1,
      INVOICE: 2,
      INVOICE_ITEM: 3,
    };

    const sortedQueue = [...rawQueue].sort((a, b) => {
      // Deletions go last
      if (a.operation === 'DELETE' && b.operation !== 'DELETE') return 1;
      if (a.operation !== 'DELETE' && b.operation === 'DELETE') return -1;

      const pA = priorityMap[a.entity] || 99;
      const pB = priorityMap[b.entity] || 99;
      if (pA !== pB) return pA - pB;

      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    let syncedCount = 0;

    for (const item of sortedQueue) {
      try {
        await this.syncQueueItem(userId, item);
        await localStore.removeSyncQueueItem(userId, item.id);
        syncedCount += 1;
      } catch (err) {
        // Record error and increment retry count
        const errorMsg = (err as Error).message || 'Sync failed';
        await localStore.updateSyncQueueItem(userId, {
          ...item,
          retry_count: item.retry_count + 1,
          last_error: errorMsg,
        });

        // If network disconnects midway, abort remaining queue to preserve order
        if (
          errorMsg.toLowerCase().includes('network') ||
          errorMsg.toLowerCase().includes('fetch') ||
          errorMsg.toLowerCase().includes('offline')
        ) {
          break;
        }
      }
    }

    const remaining = await localStore.getSyncQueue(userId);
    return {
      success: remaining.length === 0,
      syncedCount,
      remainingQueueCount: remaining.length,
    };
  },

  /**
   * Sync a single queue item to Supabase idempotently
   */
  async syncQueueItem(userId: string, item: SyncQueueItem): Promise<void> {
    const { entity, operation, payload, entity_id } = item;

    // ----------------------------------------------------
    // CUSTOMER
    // ----------------------------------------------------
    if (entity === 'CUSTOMER') {
      if (operation === 'CREATE' || operation === 'UPDATE') {
        const { error } = await (supabase.from('customers') as any).upsert({
          id: entity_id,
          user_id: userId,
          name: payload?.name,
          phone: payload?.phone || null,
          address: payload?.address || null,
          updated_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);

        const local = await localStore.getCustomerById(userId, entity_id);
        if (local) {
          await localStore.upsertCustomer(userId, {
            ...local,
            sync_status: 'SYNCED',
            local_updated_at: new Date().toISOString(),
          });
        }
      } else if (operation === 'DELETE') {
        const { error } = await (supabase.from('customers') as any)
          .delete()
          .eq('id', entity_id)
          .eq('user_id', userId);
        if (error) throw new Error(error.message);
      }
    }

    // ----------------------------------------------------
    // BUYER
    // ----------------------------------------------------
    else if (entity === 'BUYER') {
      if (operation === 'CREATE' || operation === 'UPDATE') {
        const { error } = await (supabase.from('buyers') as any).upsert({
          id: entity_id,
          user_id: userId,
          name: payload?.name,
          phone: payload?.phone || null,
          address: payload?.address || null,
          updated_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);

        const local = await localStore.getBuyerById(userId, entity_id);
        if (local) {
          await localStore.upsertBuyer(userId, {
            ...local,
            sync_status: 'SYNCED',
            local_updated_at: new Date().toISOString(),
          });
        }
      } else if (operation === 'DELETE') {
        const { error } = await (supabase.from('buyers') as any)
          .delete()
          .eq('id', entity_id)
          .eq('user_id', userId);
        if (error) throw new Error(error.message);
      }
    }

    // ----------------------------------------------------
    // INVOICE
    // ----------------------------------------------------
    else if (entity === 'INVOICE') {
      if (operation === 'CREATE' || operation === 'UPDATE') {
        const { error } = await (supabase.from('invoices') as any).upsert({
          id: entity_id,
          user_id: userId,
          invoice_number: payload?.invoice_number,
          party_type: payload?.party_type,
          party_id: payload?.party_id,
          invoice_date: payload?.invoice_date,
          total_amount: payload?.total_amount,
          paid_amount: payload?.paid_amount,
          remaining_amount: payload?.remaining_amount,
          notes: payload?.notes || null,
          updated_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);

        // Upload line items if present in payload
        if (payload?.items && Array.isArray(payload.items)) {
          // Delete existing server items for clean replacement
          await (supabase.from('invoice_items') as any).delete().eq('invoice_id', entity_id);

          const itemsToInsert = payload.items.map((it: any) => ({
            id: it.id,
            invoice_id: entity_id,
            item_name: it.item_name,
            quantity: it.quantity,
            rate: it.rate,
            amount: it.amount,
            created_at: it.created_at || new Date().toISOString(),
          }));

          const { error: itemsErr } = await (supabase.from('invoice_items') as any).insert(
            itemsToInsert,
          );
          if (itemsErr) throw new Error(itemsErr.message);
        }

        const local = await localStore.getInvoiceById(userId, entity_id);
        if (local) {
          await localStore.upsertInvoice(userId, {
            ...local,
            sync_status: 'SYNCED',
            local_updated_at: new Date().toISOString(),
          });
        }
      } else if (operation === 'DELETE') {
        // Delete items then invoice
        await (supabase.from('invoice_items') as any).delete().eq('invoice_id', entity_id);
        const { error } = await (supabase.from('invoices') as any)
          .delete()
          .eq('id', entity_id)
          .eq('user_id', userId);
        if (error) throw new Error(error.message);
      }
    }

    // ----------------------------------------------------
    // PAYMENT (Phase 17)
    // ----------------------------------------------------
    else if (entity === 'PAYMENT') {
      if (operation === 'CREATE' || operation === 'UPDATE') {
        const { error } = await (supabase.from('payments') as any).upsert({
          id: entity_id,
          user_id: userId,
          invoice_id: payload?.invoice_id,
          amount: payload?.amount,
          payment_date: payload?.payment_date,
          notes: payload?.notes || null,
          updated_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);

        const local = await localStore.getPaymentById(userId, entity_id);
        if (local) {
          await localStore.upsertPayment(userId, {
            ...local,
            sync_status: 'SYNCED',
            local_updated_at: new Date().toISOString(),
          });
        }
      } else if (operation === 'DELETE') {
        const { error } = await (supabase.from('payments') as any)
          .delete()
          .eq('id', entity_id)
          .eq('user_id', userId);
        if (error) throw new Error(error.message);
      }
    }
  },

  /**
   * Pull server updates and merge into local database
   */
  async pullFromServer(userId: string): Promise<void> {
    const [custRes, buyRes, invRes, itemsRes, payRes] = await Promise.all([
      (supabase.from('customers') as any).select('*').eq('user_id', userId),
      (supabase.from('buyers') as any).select('*').eq('user_id', userId),
      (supabase.from('invoices') as any).select('*').eq('user_id', userId),
      (supabase.from('invoice_items') as any).select('*'),
      (supabase.from('payments') as any).select('*').eq('user_id', userId),
    ]);

    if (custRes.data) {
      await localStore.bulkUpsertCustomers(
        userId,
        custRes.data.map((c: any) => ({
          ...c,
          sync_status: 'SYNCED',
          local_updated_at: c.updated_at,
        })),
      );
    }

    if (buyRes.data) {
      await localStore.bulkUpsertBuyers(
        userId,
        buyRes.data.map((b: any) => ({
          ...b,
          sync_status: 'SYNCED',
          local_updated_at: b.updated_at,
        })),
      );
    }

    if (invRes.data) {
      await localStore.bulkUpsertInvoices(
        userId,
        invRes.data.map((inv: any) => ({
          ...inv,
          sync_status: 'SYNCED',
          local_updated_at: inv.updated_at,
        })),
      );
    }

    if (itemsRes.data) {
      await localStore.bulkUpsertInvoiceItems(
        userId,
        itemsRes.data.map((item: any) => ({
          ...item,
          sync_status: 'SYNCED',
          local_updated_at: item.created_at,
        })),
      );
    }

    if (payRes.data) {
      await localStore.bulkUpsertPayments(
        userId,
        payRes.data.map((p: any) => ({
          ...p,
          sync_status: 'SYNCED',
          local_updated_at: p.updated_at || p.created_at,
        })),
      );
    }
  },
};
