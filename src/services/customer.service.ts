import * as Crypto from 'expo-crypto';
import { supabase } from './supabase/client';
import { localStore } from '@/src/database/localStore';
import { LocalCustomer } from '@/src/database/types';
import { CustomerSummary, CustomerDetail } from '@/src/types/customer';
import { DbCustomer } from '@/src/types/database';
import { normalizePhoneE164 } from '@/src/utils/phone';
import { syncService } from './sync.service';
import { networkService } from './network.service';

export interface CustomerOperationResult<T = unknown> {
  data: T | null;
  error?: string;
}

export const customerService = {
  /**
   * Fetch all customers (Offline-First: Reads local immediately, refreshes in background if online)
   */
  async getCustomers(searchQuery?: string): Promise<CustomerSummary[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // Background sync & pull if online
    if (networkService.isOnline()) {
      syncService.pullFromServer(userId).catch(() => {});
    }

    // 1. Read local customers
    const localCustomers = await localStore.getCustomers(userId);

    // Filter by search query if provided
    let filtered = localCustomers;
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)),
      );
    }

    // 2. Read local invoices to calculate ledger stats
    const localInvoices = await localStore.getInvoices(userId);
    const customerInvoices = localInvoices.filter(inv => inv.party_type === 'CUSTOMER');

    const statsMap: Record<
      string,
      { total_bills: number; total_amount: number; total_jama: number; total_baki: number }
    > = {};

    customerInvoices.forEach(inv => {
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
      .map(c => {
        const stats = statsMap[c.id] || {
          total_bills: 0,
          total_amount: 0,
          total_jama: 0,
          total_baki: 0,
        };
        return {
          ...c,
          ...stats,
        };
      });
  },

  /**
   * Fetch customer by ID including invoice ledger history (Offline-First)
   */
  async getCustomerById(customerId: string): Promise<CustomerDetail> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // 1. Fetch customer from localStore
    let customer = await localStore.getCustomerById(userId, customerId);

    // If not found locally and online, try server
    if (!customer && networkService.isOnline()) {
      const { data: serverCust } = await (supabase.from('customers') as any)
        .select('*')
        .eq('id', customerId)
        .eq('user_id', userId)
        .single();
      if (serverCust) {
        const localCust: LocalCustomer = {
          ...serverCust,
          sync_status: 'SYNCED',
          local_updated_at: serverCust.updated_at,
        };
        await localStore.upsertCustomer(userId, localCust);
        customer = localCust;
      }
    }

    if (!customer) {
      throw new Error('Customer not found.');
    }

    // 2. Fetch customer invoices
    const allInvoices = await localStore.getInvoices(userId);
    const customerInvoices = allInvoices.filter(
      inv => inv.party_id === customerId && inv.party_type === 'CUSTOMER',
    );

    let totalAmount = 0;
    let totalJama = 0;
    let totalBaki = 0;

    customerInvoices.forEach(inv => {
      totalAmount += Number(inv.total_amount || 0);
      totalJama += Number(inv.paid_amount || 0);
      totalBaki += Number(inv.remaining_amount || 0);
    });

    return {
      ...customer,
      total_bills: customerInvoices.length,
      total_amount: totalAmount,
      total_jama: totalJama,
      total_baki: totalBaki,
      invoices: customerInvoices,
    };
  },

  /**
   * Create a new customer (Offline-First: Local save with stable UUID + sync queue)
   */
  async createCustomer(data: {
    name: string;
    phone?: string;
    address?: string;
  }): Promise<CustomerOperationResult<DbCustomer>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;
      const formattedPhone = data.phone ? normalizePhoneE164(data.phone) : null;
      const stableId = Crypto.randomUUID();
      const now = new Date().toISOString();

      const newCustomer: LocalCustomer = {
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
      await localStore.upsertCustomer(userId, newCustomer);

      // 2. Enqueue mutation
      await localStore.enqueueSyncItem(userId, {
        id: Crypto.randomUUID(),
        user_id: userId,
        entity: 'CUSTOMER',
        entity_id: stableId,
        operation: 'CREATE',
        payload: {
          name: newCustomer.name,
          phone: newCustomer.phone,
          address: newCustomer.address,
        },
        created_at: now,
        retry_count: 0,
      });

      // 3. Trigger background sync if online
      if (networkService.isOnline()) {
        syncService.processQueue(userId).catch(() => {});
      }

      return { data: newCustomer };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Unexpected error creating customer.' };
    }
  },

  /**
   * Update an existing customer (Offline-First)
   */
  async updateCustomer(
    customerId: string,
    data: { name: string; phone?: string; address?: string },
  ): Promise<CustomerOperationResult<DbCustomer>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;
      const formattedPhone = data.phone ? normalizePhoneE164(data.phone) : null;
      const now = new Date().toISOString();

      const existing = await localStore.getCustomerById(userId, customerId);
      const updatedCustomer: LocalCustomer = {
        id: customerId,
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
      await localStore.upsertCustomer(userId, updatedCustomer);

      // 2. Enqueue mutation
      await localStore.enqueueSyncItem(userId, {
        id: Crypto.randomUUID(),
        user_id: userId,
        entity: 'CUSTOMER',
        entity_id: customerId,
        operation: 'UPDATE',
        payload: {
          name: updatedCustomer.name,
          phone: updatedCustomer.phone,
          address: updatedCustomer.address,
        },
        created_at: now,
        retry_count: 0,
      });

      // 3. Trigger background sync if online
      if (networkService.isOnline()) {
        syncService.processQueue(userId).catch(() => {});
      }

      return { data: updatedCustomer };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Unexpected error updating customer.' };
    }
  },

  /**
   * Safe Delete Customer (Offline-First)
   */
  async deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { success: false, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;

      // Check invoices in localStore
      const invoices = await localStore.getInvoices(userId);
      const hasInvoices = invoices.some(
        inv => inv.party_id === customerId && inv.party_type === 'CUSTOMER',
      );

      if (hasInvoices) {
        return {
          success: false,
          error:
            'Cannot delete customer because they have existing invoice(s). Customer records must be preserved for invoice history.',
        };
      }

      const now = new Date().toISOString();
      const existing = await localStore.getCustomerById(userId, customerId);
      if (existing) {
        await localStore.upsertCustomer(userId, {
          ...existing,
          sync_status: 'PENDING_DELETE',
          local_updated_at: now,
        });
      }

      // Enqueue delete mutation
      await localStore.enqueueSyncItem(userId, {
        id: Crypto.randomUUID(),
        user_id: userId,
        entity: 'CUSTOMER',
        entity_id: customerId,
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
        error: (err as Error).message || 'Unexpected error deleting customer.',
      };
    }
  },
};
