import * as Crypto from 'expo-crypto';
import { supabase } from './supabase/client';
import { localStore } from '@/src/database/localStore';
import { LocalBuyer } from '@/src/database/types';
import { BuyerSummary, BuyerDetail } from '@/src/types/buyer';
import { DbBuyer } from '@/src/types/database';
import { normalizePhoneE164 } from '@/src/utils/phone';
import { syncService } from './sync.service';
import { networkService } from './network.service';

export interface BuyerOperationResult<T = unknown> {
  data: T | null;
  error?: string;
}

export const buyerService = {
  /**
   * Fetch all buyers for authenticated user with aggregated Baki/Jama stats (Offline-First)
   */
  async getBuyers(searchQuery?: string): Promise<BuyerSummary[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // Background sync & pull if online
    if (networkService.isOnline()) {
      syncService.pullFromServer(userId).catch(() => {});
    }

    // 1. Read local buyers
    const localBuyers = await localStore.getBuyers(userId);

    // Filter by search query if provided
    let filtered = localBuyers;
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        b => b.name.toLowerCase().includes(q) || (b.phone && b.phone.includes(q)),
      );
    }

    // 2. Read local invoices to calculate ledger stats
    const localInvoices = await localStore.getInvoices(userId);
    const buyerInvoices = localInvoices.filter(inv => inv.party_type === 'BUYER');

    const statsMap: Record<
      string,
      { total_bills: number; total_amount: number; total_jama: number; total_baki: number }
    > = {};

    buyerInvoices.forEach(inv => {
      if (!statsMap[inv.party_id]) {
        statsMap[inv.party_id] = { total_bills: 0, total_amount: 0, total_jama: 0, total_baki: 0 };
      }
      statsMap[inv.party_id].total_bills += 1;
      statsMap[inv.party_id].total_amount += Number(inv.total_amount || 0);
      statsMap[inv.party_id].total_jama += Number(inv.paid_amount || 0);
      statsMap[inv.party_id].total_baki += Number(inv.remaining_amount || 0);
    });

    return filtered
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(b => {
        const stats = statsMap[b.id] || {
          total_bills: 0,
          total_amount: 0,
          total_jama: 0,
          total_baki: 0,
        };
        return {
          ...b,
          ...stats,
        };
      });
  },

  /**
   * Fetch buyer by ID with full invoice history (Offline-First)
   */
  async getBuyerById(buyerId: string): Promise<BuyerDetail> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // 1. Fetch buyer from localStore
    let buyer = await localStore.getBuyerById(userId, buyerId);

    // If not found locally and online, try server
    if (!buyer && networkService.isOnline()) {
      const { data: serverBuyer } = await (supabase.from('buyers') as any)
        .select('*')
        .eq('id', buyerId)
        .eq('user_id', userId)
        .single();
      if (serverBuyer) {
        const localBuyer: LocalBuyer = {
          ...serverBuyer,
          sync_status: 'SYNCED',
          local_updated_at: serverBuyer.updated_at,
        };
        await localStore.upsertBuyer(userId, localBuyer);
        buyer = localBuyer;
      }
    }

    if (!buyer) {
      throw new Error('Buyer not found.');
    }

    // 2. Fetch buyer invoices
    const allInvoices = await localStore.getInvoices(userId);
    const buyerInvoices = allInvoices.filter(
      inv => inv.party_id === buyerId && inv.party_type === 'BUYER',
    );

    let totalAmount = 0;
    let totalJama = 0;
    let totalBaki = 0;

    buyerInvoices.forEach(inv => {
      totalAmount += Number(inv.total_amount || 0);
      totalJama += Number(inv.paid_amount || 0);
      totalBaki += Number(inv.remaining_amount || 0);
    });

    return {
      ...buyer,
      total_bills: buyerInvoices.length,
      total_amount: totalAmount,
      total_jama: totalJama,
      total_baki: totalBaki,
      invoices: buyerInvoices,
    };
  },

  /**
   * Create a new buyer (Offline-First: Local save with stable UUID + sync queue)
   */
  async createBuyer(data: {
    name: string;
    phone?: string;
    address?: string;
  }): Promise<BuyerOperationResult<DbBuyer>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;
      const formattedPhone = data.phone ? normalizePhoneE164(data.phone) : null;
      const stableId = Crypto.randomUUID();
      const now = new Date().toISOString();

      const newBuyer: LocalBuyer = {
        id: stableId,
        user_id: userId,
        name: data.name.trim(),
        phone: formattedPhone,
        address: data.address?.trim() || null,
        created_at: now,
        updated_at: now,
        sync_status: 'PENDING_CREATE',
        local_updated_at: now,
      };

      // 1. Save to local database immediately
      await localStore.upsertBuyer(userId, newBuyer);

      // 2. Enqueue mutation
      await localStore.enqueueSyncItem(userId, {
        id: Crypto.randomUUID(),
        user_id: userId,
        entity: 'BUYER',
        entity_id: stableId,
        operation: 'CREATE',
        payload: {
          name: newBuyer.name,
          phone: newBuyer.phone,
          address: newBuyer.address,
        },
        created_at: now,
        retry_count: 0,
      });

      // 3. Trigger background sync if online
      if (networkService.isOnline()) {
        syncService.processQueue(userId).catch(() => {});
      }

      return { data: newBuyer };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Unexpected error creating buyer.' };
    }
  },

  /**
   * Update an existing buyer (Offline-First)
   */
  async updateBuyer(
    buyerId: string,
    data: { name: string; phone?: string; address?: string },
  ): Promise<BuyerOperationResult<DbBuyer>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;
      const formattedPhone = data.phone ? normalizePhoneE164(data.phone) : null;
      const now = new Date().toISOString();

      const existing = await localStore.getBuyerById(userId, buyerId);
      const updatedBuyer: LocalBuyer = {
        id: buyerId,
        user_id: userId,
        name: data.name.trim(),
        phone: formattedPhone,
        address: data.address?.trim() || null,
        created_at: existing?.created_at || now,
        updated_at: now,
        sync_status: 'PENDING_UPDATE',
        local_updated_at: now,
      };

      // 1. Update localStore immediately
      await localStore.upsertBuyer(userId, updatedBuyer);

      // 2. Enqueue mutation
      await localStore.enqueueSyncItem(userId, {
        id: Crypto.randomUUID(),
        user_id: userId,
        entity: 'BUYER',
        entity_id: buyerId,
        operation: 'UPDATE',
        payload: {
          name: updatedBuyer.name,
          phone: updatedBuyer.phone,
          address: updatedBuyer.address,
        },
        created_at: now,
        retry_count: 0,
      });

      // 3. Trigger background sync if online
      if (networkService.isOnline()) {
        syncService.processQueue(userId).catch(() => {});
      }

      return { data: updatedBuyer };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Unexpected error updating buyer.' };
    }
  },

  /**
   * Safe Delete Buyer (Offline-First)
   */
  async deleteBuyer(buyerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { success: false, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;

      // Check invoices in localStore
      const invoices = await localStore.getInvoices(userId);
      const hasInvoices = invoices.some(
        inv => inv.party_id === buyerId && inv.party_type === 'BUYER',
      );

      if (hasInvoices) {
        return {
          success: false,
          error:
            'Cannot delete buyer because they have existing invoice(s). Buyer records must be preserved for invoice history.',
        };
      }

      const now = new Date().toISOString();
      const existing = await localStore.getBuyerById(userId, buyerId);
      if (existing) {
        await localStore.upsertBuyer(userId, {
          ...existing,
          sync_status: 'PENDING_DELETE',
          local_updated_at: now,
        });
      }

      // Enqueue delete mutation
      await localStore.enqueueSyncItem(userId, {
        id: Crypto.randomUUID(),
        user_id: userId,
        entity: 'BUYER',
        entity_id: buyerId,
        operation: 'DELETE',
        payload: null,
        created_at: now,
        retry_count: 0,
      });

      if (networkService.isOnline()) {
        syncService.processQueue(userId).catch(() => {});
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message || 'Unexpected error deleting buyer.',
      };
    }
  },
};
