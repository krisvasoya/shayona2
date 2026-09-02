import * as Crypto from 'expo-crypto';
import { supabase } from './supabase/client';
import { localStore } from '@/src/database/localStore';
import { LocalInvoice, LocalInvoiceItem } from '@/src/database/types';
import { InvoiceSummary, InvoiceDetail, InvoiceFormData } from '@/src/types/invoice';
import { PartyType } from '@/src/types/database';
import { rupeesToPaise } from '@/src/utils';
import { syncService } from './sync.service';
import { networkService } from './network.service';

export interface InvoiceFilters {
  partyType?: PartyType;
  paymentStatus?: 'ALL' | 'PAID' | 'BAKI';
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}

export interface InvoiceOperationResult<T = unknown> {
  data: T | null;
  error?: string;
}

export const invoiceService = {
  /**
   * Generates the next sequential invoice number for the authenticated user
   * (e.g. INV-0001, INV-0002) completely offline-safe and scalable
   */
  async getNextInvoiceNumber(): Promise<string> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return 'INV-0001';
    }

    const userId = userData.user.id;
    const localInvoices = await localStore.getInvoices(userId);

    let maxNum = 0;
    localInvoices.forEach(inv => {
      const match = (inv.invoice_number || '').match(/INV-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const nextNumber = maxNum + 1;
    return `INV-${String(nextNumber).padStart(4, '0')}`;
  },

  /**
   * Fetch all invoices with filters, party names, item counts, and pagination (3+ Years Scalable)
   */
  async getInvoices(filters?: InvoiceFilters): Promise<InvoiceSummary[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // Background pull if online
    if (networkService.isOnline()) {
      syncService.pullFromServer(userId).catch(() => {});
    }

    // 1. Read local invoices
    const allInvoices = await localStore.getInvoices(userId);

    // 2. Read party lookups and item counts
    const [customers, buyers, items] = await Promise.all([
      localStore.getCustomers(userId),
      localStore.getBuyers(userId),
      localStore.getInvoiceItems(userId),
    ]);

    const customerMap = new Map<string, string>();
    customers.forEach(c => customerMap.set(c.id, c.name));

    const buyerMap = new Map<string, string>();
    buyers.forEach(b => buyerMap.set(b.id, b.name));

    const itemsCountMap = new Map<string, number>();
    items.forEach(item => {
      itemsCountMap.set(item.invoice_id, (itemsCountMap.get(item.invoice_id) || 0) + 1);
    });

    // 3. Filter local invoices
    let filtered = allInvoices;

    if (filters?.partyType) {
      filtered = filtered.filter(inv => inv.party_type === filters.partyType);
    }

    if (filters?.paymentStatus === 'PAID') {
      filtered = filtered.filter(inv => Number(inv.remaining_amount || 0) === 0);
    } else if (filters?.paymentStatus === 'BAKI') {
      filtered = filtered.filter(inv => Number(inv.remaining_amount || 0) > 0);
    }

    let results: InvoiceSummary[] = filtered.map(inv => {
      let partyName = 'Party';
      if (inv.party_type === 'CUSTOMER') {
        partyName = customerMap.get(inv.party_id) || 'Customer';
      } else if (inv.party_type === 'BUYER') {
        partyName = buyerMap.get(inv.party_id) || 'Buyer';
      }

      return {
        id: inv.id,
        user_id: inv.user_id,
        invoice_number: inv.invoice_number,
        invoice_date: inv.invoice_date,
        party_type: inv.party_type as PartyType,
        party_id: inv.party_id,
        party_name: partyName,
        total_amount: Number(inv.total_amount || 0),
        paid_amount: Number(inv.paid_amount || 0),
        remaining_amount: Number(inv.remaining_amount || 0),
        pdf_path: inv.pdf_path || null,
        notes: inv.notes || null,
        items_count: itemsCountMap.get(inv.id) || 0,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
      };
    });

    if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter(
        inv =>
          inv.invoice_number.toLowerCase().includes(q) || inv.party_name.toLowerCase().includes(q),
      );
    }

    // Sort newest first
    results.sort((a, b) => {
      const dateCmp = new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime();
      if (dateCmp !== 0) return dateCmp;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Apply pagination if specified
    if (filters?.page && filters?.pageSize) {
      const start = (filters.page - 1) * filters.pageSize;
      return results.slice(start, start + filters.pageSize);
    }

    return results;
  },

  /**
   * Fetch single invoice with line items (Direct Index Lookup)
   */
  async getInvoiceById(invoiceId: string): Promise<InvoiceDetail> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // 1. Fetch invoice from localStore
    let invoice = await localStore.getInvoiceById(userId, invoiceId);

    // If not found locally and online, try server
    if (!invoice && networkService.isOnline()) {
      const { data: serverInv } = await (supabase.from('invoices') as any)
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();

      if (serverInv) {
        const localInv: LocalInvoice = {
          ...serverInv,
          sync_status: 'SYNCED',
          local_updated_at: serverInv.updated_at,
        };
        await localStore.upsertInvoice(userId, localInv);
        invoice = localInv;

        const { data: serverItems } = await (supabase.from('invoice_items') as any)
          .select('*')
          .eq('invoice_id', invoiceId);
        if (serverItems) {
          await localStore.setInvoiceItemsForInvoice(
            userId,
            invoiceId,
            serverItems.map((si: any) => ({
              ...si,
              sync_status: 'SYNCED',
              local_updated_at: si.created_at,
            })),
          );
        }
      }
    }

    if (!invoice) {
      throw new Error('Invoice not found.');
    }

    // 2. Fetch line items strictly for this invoice
    const items = await localStore.getInvoiceItems(userId, invoiceId);

    // 3. Fetch party name
    let partyName = 'Party';
    if (invoice.party_type === 'CUSTOMER') {
      const cust = await localStore.getCustomerById(userId, invoice.party_id);
      partyName = cust?.name || 'Customer';
    } else if (invoice.party_type === 'BUYER') {
      const buy = await localStore.getBuyerById(userId, invoice.party_id);
      partyName = buy?.name || 'Buyer';
    }

    return {
      id: invoice.id,
      user_id: invoice.user_id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      party_type: invoice.party_type as PartyType,
      party_id: invoice.party_id,
      party_name: partyName,
      total_amount: Number(invoice.total_amount || 0),
      paid_amount: Number(invoice.paid_amount || 0),
      remaining_amount: Number(invoice.remaining_amount || 0),
      pdf_path: invoice.pdf_path,
      notes: invoice.notes,
      items_count: items.length,
      created_at: invoice.created_at,
      updated_at: invoice.updated_at,
      items: items.map(it => ({
        id: it.id,
        invoice_id: it.invoice_id,
        item_name: it.item_name,
        quantity: Number(it.quantity),
        rate: Number(it.rate),
        amount: Number(it.amount),
        created_at: it.created_at,
      })),
    };
  },

  /**
   * Create a new invoice with line items (Offline-First: Local save with stable UUID + sync queue)
   */
  async createInvoice(data: InvoiceFormData): Promise<InvoiceOperationResult<InvoiceDetail>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;
      const invoiceId = Crypto.randomUUID();
      const now = new Date().toISOString();

      // Financial calculations in paise
      const totalAmountPaise = data.items.reduce((sum, item) => {
        const itemQty = Number(item.quantity) || 0;
        const itemRateRupees = Number(item.rate_rupees) || 0;
        return sum + Math.round(itemQty * rupeesToPaise(itemRateRupees));
      }, 0);

      const paidAmountPaise = data.paid_amount_rupees
        ? rupeesToPaise(Number(data.paid_amount_rupees))
        : 0;
      const remainingAmountPaise = Math.max(0, totalAmountPaise - paidAmountPaise);

      // Line items with stable UUIDs
      const localItems: LocalInvoiceItem[] = data.items.map(item => {
        const itemQty = Number(item.quantity) || 0;
        const itemRateRupees = Number(item.rate_rupees) || 0;
        const itemRatePaise = rupeesToPaise(itemRateRupees);
        const itemAmountPaise = Math.round(itemQty * itemRatePaise);

        return {
          id: Crypto.randomUUID(),
          invoice_id: invoiceId,
          item_name: item.item_name.trim(),
          quantity: itemQty,
          rate: itemRatePaise,
          amount: itemAmountPaise,
          created_at: now,
          sync_status: 'PENDING_CREATE',
          local_updated_at: now,
        };
      });

      const localInvoice: LocalInvoice = {
        id: invoiceId,
        user_id: userId,
        invoice_number: data.invoice_number.trim(),
        party_type: data.party_type,
        party_id: data.party_id,
        invoice_date: data.invoice_date,
        total_amount: totalAmountPaise,
        paid_amount: paidAmountPaise,
        remaining_amount: remainingAmountPaise,
        pdf_path: null,
        notes: data.notes?.trim() || null,
        created_at: now,
        updated_at: now,
        sync_status: 'PENDING_CREATE',
        local_updated_at: now,
      };

      // 1. Save to local database immediately
      await localStore.upsertInvoice(userId, localInvoice);
      await localStore.setInvoiceItemsForInvoice(userId, invoiceId, localItems);

      // 2. Enqueue mutation with full payload
      await localStore.enqueueSyncItem(userId, {
        id: Crypto.randomUUID(),
        user_id: userId,
        entity: 'INVOICE',
        entity_id: invoiceId,
        operation: 'CREATE',
        payload: {
          invoice_number: localInvoice.invoice_number,
          party_type: localInvoice.party_type,
          party_id: localInvoice.party_id,
          invoice_date: localInvoice.invoice_date,
          total_amount: localInvoice.total_amount,
          paid_amount: localInvoice.paid_amount,
          remaining_amount: localInvoice.remaining_amount,
          notes: localInvoice.notes,
          items: localItems,
        },
        created_at: now,
        retry_count: 0,
      });

      // 3. Trigger background sync if online
      if (networkService.isOnline()) {
        syncService.processQueue(userId).catch(() => {});
      }

      // Party lookup for return object
      let partyName = 'Party';
      if (data.party_type === 'CUSTOMER') {
        const cust = await localStore.getCustomerById(userId, data.party_id);
        partyName = cust?.name || 'Customer';
      } else if (data.party_type === 'BUYER') {
        const buy = await localStore.getBuyerById(userId, data.party_id);
        partyName = buy?.name || 'Buyer';
      }

      const createdDetail: InvoiceDetail = {
        id: localInvoice.id,
        user_id: localInvoice.user_id,
        invoice_number: localInvoice.invoice_number,
        invoice_date: localInvoice.invoice_date,
        party_type: localInvoice.party_type as PartyType,
        party_id: localInvoice.party_id,
        party_name: partyName,
        total_amount: localInvoice.total_amount,
        paid_amount: localInvoice.paid_amount,
        remaining_amount: localInvoice.remaining_amount,
        pdf_path: localInvoice.pdf_path,
        notes: localInvoice.notes,
        items_count: localItems.length,
        created_at: localInvoice.created_at,
        updated_at: localInvoice.updated_at,
        items: localItems.map(it => ({
          id: it.id,
          invoice_id: it.invoice_id,
          item_name: it.item_name,
          quantity: it.quantity,
          rate: it.rate,
          amount: it.amount,
          created_at: it.created_at,
        })),
      };

      return { data: createdDetail };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Failed to create invoice.' };
    }
  },

  /**
   * Update an existing invoice (Offline-First)
   */
  async updateInvoice(
    invoiceId: string,
    data: Partial<InvoiceFormData>,
  ): Promise<InvoiceOperationResult<InvoiceDetail>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;
      const existing = await localStore.getInvoiceById(userId, invoiceId);
      if (!existing) {
        return { data: null, error: 'Invoice not found.' };
      }

      const now = new Date().toISOString();
      let totalAmountPaise = existing.total_amount;
      let paidAmountPaise = existing.paid_amount;
      let remainingAmountPaise = existing.remaining_amount;
      let localItems = await localStore.getInvoiceItems(userId, invoiceId);

      if (data.items) {
        totalAmountPaise = data.items.reduce((sum, item) => {
          const itemQty = Number(item.quantity) || 0;
          const itemRateRupees = Number(item.rate_rupees) || 0;
          return sum + Math.round(itemQty * rupeesToPaise(itemRateRupees));
        }, 0);

        localItems = data.items.map(item => {
          const itemQty = Number(item.quantity) || 0;
          const itemRateRupees = Number(item.rate_rupees) || 0;
          const itemRatePaise = rupeesToPaise(itemRateRupees);
          const itemAmountPaise = Math.round(itemQty * itemRatePaise);

          return {
            id: Crypto.randomUUID(),
            invoice_id: invoiceId,
            item_name: item.item_name.trim(),
            quantity: itemQty,
            rate: itemRatePaise,
            amount: itemAmountPaise,
            created_at: now,
            sync_status: 'PENDING_UPDATE',
            local_updated_at: now,
          };
        });
      }

      if (data.paid_amount_rupees !== undefined) {
        paidAmountPaise = rupeesToPaise(Number(data.paid_amount_rupees));
      }

      remainingAmountPaise = Math.max(0, totalAmountPaise - paidAmountPaise);

      const updatedInvoice: LocalInvoice = {
        ...existing,
        invoice_number: data.invoice_number ? data.invoice_number.trim() : existing.invoice_number,
        party_type: data.party_type || existing.party_type,
        party_id: data.party_id || existing.party_id,
        invoice_date: data.invoice_date || existing.invoice_date,
        total_amount: totalAmountPaise,
        paid_amount: paidAmountPaise,
        remaining_amount: remainingAmountPaise,
        notes: data.notes !== undefined ? data.notes?.trim() || null : existing.notes,
        updated_at: now,
        sync_status: 'PENDING_UPDATE',
        local_updated_at: now,
      };

      await localStore.upsertInvoice(userId, updatedInvoice);
      if (data.items) {
        await localStore.setInvoiceItemsForInvoice(userId, invoiceId, localItems);
      }

      // Enqueue mutation
      await localStore.enqueueSyncItem(userId, {
        id: Crypto.randomUUID(),
        user_id: userId,
        entity: 'INVOICE',
        entity_id: invoiceId,
        operation: 'UPDATE',
        payload: {
          invoice_number: updatedInvoice.invoice_number,
          party_type: updatedInvoice.party_type,
          party_id: updatedInvoice.party_id,
          invoice_date: updatedInvoice.invoice_date,
          total_amount: updatedInvoice.total_amount,
          paid_amount: updatedInvoice.paid_amount,
          remaining_amount: updatedInvoice.remaining_amount,
          notes: updatedInvoice.notes,
          items: localItems,
        },
        created_at: now,
        retry_count: 0,
      });

      if (networkService.isOnline()) {
        syncService.processQueue(userId).catch(() => {});
      }

      const detail = await this.getInvoiceById(invoiceId);
      return { data: detail };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Failed to update invoice.' };
    }
  },

  /**
   * Delete an invoice (Offline-First)
   */
  async deleteInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { success: false, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;
      const now = new Date().toISOString();

      await localStore.deleteInvoice(userId, invoiceId);

      await localStore.enqueueSyncItem(userId, {
        id: Crypto.randomUUID(),
        user_id: userId,
        entity: 'INVOICE',
        entity_id: invoiceId,
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
        error: (err as Error).message || 'Unexpected error deleting invoice.',
      };
    }
  },
};
