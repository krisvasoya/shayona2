import { supabase } from './supabase/client';
import { InvoiceSummary, InvoiceDetail, InvoiceFormData } from '@/src/types/invoice';
import { DbInvoice, DbInvoiceItem, PartyType } from '@/src/types/database';
import { rupeesToPaise } from '@/src/utils';

export interface InvoiceFilters {
  partyType?: PartyType;
  paymentStatus?: 'ALL' | 'PAID' | 'BAKI';
  searchQuery?: string;
}

export interface InvoiceOperationResult<T = unknown> {
  data: T | null;
  error?: string;
}

export const invoiceService = {
  /**
   * Generates the next sequential invoice number for the authenticated user
   * (e.g. INV-0001, INV-0002)
   */
  async getNextInvoiceNumber(): Promise<string> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return 'INV-0001';
    }

    const { count, error } = await (supabase.from('invoices') as any)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.user.id);

    if (error || count === null || count === undefined) {
      return 'INV-0001';
    }

    const nextNumber = count + 1;
    return `INV-${String(nextNumber).padStart(4, '0')}`;
  },

  /**
   * Fetch all invoices with filters, party names, and item counts
   */
  async getInvoices(filters?: InvoiceFilters): Promise<InvoiceSummary[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // 1. Fetch invoices
    let query = (supabase.from('invoices') as any)
      .select('*')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters?.partyType) {
      query = query.eq('party_type', filters.partyType);
    }

    if (filters?.paymentStatus === 'PAID') {
      query = query.eq('remaining_amount', 0);
    } else if (filters?.paymentStatus === 'BAKI') {
      query = query.gt('remaining_amount', 0);
    }

    const { data: invoices, error: invErr } = await query;
    if (invErr) {
      throw new Error(invErr.message || 'Failed to fetch invoices.');
    }

    if (!invoices || (invoices as DbInvoice[]).length === 0) {
      return [];
    }

    const typedInvoices = invoices as DbInvoice[];

    // 2. Fetch party names and line item counts
    const [customersRes, buyersRes, itemsRes] = await Promise.all([
      (supabase.from('customers') as any).select('id, name').eq('user_id', userId),
      (supabase.from('buyers') as any).select('id, name').eq('user_id', userId),
      (supabase.from('invoice_items') as any).select('id, invoice_id'),
    ]);

    const customerMap = new Map<string, string>();
    (customersRes.data || []).forEach((c: { id: string; name: string }) =>
      customerMap.set(c.id, c.name),
    );

    const buyerMap = new Map<string, string>();
    (buyersRes.data || []).forEach((b: { id: string; name: string }) => buyerMap.set(b.id, b.name));

    const itemsCountMap = new Map<string, number>();
    (itemsRes.data || []).forEach((item: { invoice_id: string }) => {
      itemsCountMap.set(item.invoice_id, (itemsCountMap.get(item.invoice_id) || 0) + 1);
    });

    let results: InvoiceSummary[] = typedInvoices.map(inv => {
      let partyName = 'Party';
      if (inv.party_type === 'CUSTOMER') {
        partyName = customerMap.get(inv.party_id) || 'Customer';
      } else if (inv.party_type === 'BUYER') {
        partyName = buyerMap.get(inv.party_id) || 'Buyer';
      }

      return {
        ...inv,
        party_name: partyName,
        items_count: itemsCountMap.get(inv.id) || 0,
      };
    });

    // 3. Client-side search filtering by invoice number or party name
    if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter(
        inv =>
          inv.invoice_number.toLowerCase().includes(q) ||
          inv.party_name.toLowerCase().includes(q) ||
          inv.notes?.toLowerCase().includes(q),
      );
    }

    return results;
  },

  /**
   * Fetch single invoice with all line items and party name
   */
  async getInvoiceById(invoiceId: string): Promise<InvoiceDetail> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // 1. Fetch invoice header
    const { data: invoice, error: invErr } = await (supabase.from('invoices') as any)
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();

    if (invErr || !invoice) {
      throw new Error(invErr?.message || 'Invoice not found.');
    }

    const typedInvoice = invoice as DbInvoice;

    // 2. Fetch line items and party name in parallel
    const [itemsRes, partyRes] = await Promise.all([
      (supabase.from('invoice_items') as any)
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true }),
      typedInvoice.party_type === 'CUSTOMER'
        ? (supabase.from('customers') as any)
            .select('name')
            .eq('id', typedInvoice.party_id)
            .single()
        : (supabase.from('buyers') as any).select('name').eq('id', typedInvoice.party_id).single(),
    ]);

    const partyName =
      partyRes.data?.name || (typedInvoice.party_type === 'CUSTOMER' ? 'Customer' : 'Buyer');
    const items = (itemsRes.data as DbInvoiceItem[]) || [];

    return {
      ...typedInvoice,
      party_name: partyName,
      items_count: items.length,
      items,
    };
  },

  /**
   * Create new invoice with line items (Transactionally safe)
   */
  async createInvoice(formData: InvoiceFormData): Promise<InvoiceOperationResult<DbInvoice>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;

      if (!formData.items || formData.items.length === 0) {
        return { data: null, error: 'At least one line item is required.' };
      }

      // 1. Calculate item amounts and total in integer Paise
      const calculatedItems = formData.items.map(item => {
        const ratePaise = rupeesToPaise(item.rate_rupees);
        const amountPaise = Math.round(Number(item.quantity) * ratePaise);
        return {
          item_name: item.item_name.trim(),
          quantity: Number(item.quantity),
          rate: ratePaise,
          amount: amountPaise,
        };
      });

      const totalAmountPaise = calculatedItems.reduce((sum, it) => sum + it.amount, 0);
      const paidAmountPaise = rupeesToPaise(formData.paid_amount_rupees);
      const remainingAmountPaise = Math.max(0, totalAmountPaise - paidAmountPaise);

      // 2. Insert invoice header
      const { data: newInvoice, error: invErr } = await (supabase.from('invoices') as any)
        .insert({
          user_id: userId,
          invoice_number: formData.invoice_number.trim(),
          party_type: formData.party_type,
          party_id: formData.party_id,
          invoice_date: formData.invoice_date,
          total_amount: totalAmountPaise,
          paid_amount: paidAmountPaise,
          remaining_amount: remainingAmountPaise,
          notes: formData.notes?.trim() || null,
        })
        .select()
        .single();

      if (invErr || !newInvoice) {
        return { data: null, error: invErr?.message || 'Failed to create invoice header.' };
      }

      const invoiceId = (newInvoice as DbInvoice).id;

      // 3. Insert line items
      const lineItemsPayload = calculatedItems.map(item => ({
        invoice_id: invoiceId,
        item_name: item.item_name,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      }));

      const { error: itemsErr } = await (supabase.from('invoice_items') as any).insert(
        lineItemsPayload,
      );

      if (itemsErr) {
        // Rollback invoice header if items insertion failed
        await (supabase.from('invoices') as any).delete().eq('id', invoiceId);
        return { data: null, error: itemsErr.message || 'Failed to save invoice line items.' };
      }

      return { data: newInvoice as DbInvoice };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Unexpected error creating invoice.' };
    }
  },

  /**
   * Update existing invoice and replace line items
   */
  async updateInvoice(
    invoiceId: string,
    formData: InvoiceFormData,
  ): Promise<InvoiceOperationResult<DbInvoice>> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { data: null, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;

      if (!formData.items || formData.items.length === 0) {
        return { data: null, error: 'At least one line item is required.' };
      }

      // 1. Calculate item amounts and total in integer Paise
      const calculatedItems = formData.items.map(item => {
        const ratePaise = rupeesToPaise(item.rate_rupees);
        const amountPaise = Math.round(Number(item.quantity) * ratePaise);
        return {
          item_name: item.item_name.trim(),
          quantity: Number(item.quantity),
          rate: ratePaise,
          amount: amountPaise,
        };
      });

      const totalAmountPaise = calculatedItems.reduce((sum, it) => sum + it.amount, 0);
      const paidAmountPaise = rupeesToPaise(formData.paid_amount_rupees);
      const remainingAmountPaise = Math.max(0, totalAmountPaise - paidAmountPaise);

      // 2. Update invoice header (Preserve invoice_number and ID)
      const { data: updatedInvoice, error: updateErr } = await (supabase.from('invoices') as any)
        .update({
          party_type: formData.party_type,
          party_id: formData.party_id,
          invoice_date: formData.invoice_date,
          total_amount: totalAmountPaise,
          paid_amount: paidAmountPaise,
          remaining_amount: remainingAmountPaise,
          notes: formData.notes?.trim() || null,
        })
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateErr || !updatedInvoice) {
        return { data: null, error: updateErr?.message || 'Failed to update invoice.' };
      }

      // 3. Replace line items: delete previous items and re-insert
      await (supabase.from('invoice_items') as any).delete().eq('invoice_id', invoiceId);

      const lineItemsPayload = calculatedItems.map(item => ({
        invoice_id: invoiceId,
        item_name: item.item_name,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      }));

      const { error: itemsErr } = await (supabase.from('invoice_items') as any).insert(
        lineItemsPayload,
      );

      if (itemsErr) {
        return { data: null, error: itemsErr.message || 'Failed to update line items.' };
      }

      return { data: updatedInvoice as DbInvoice };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Unexpected error updating invoice.' };
    }
  },

  /**
   * Delete invoice (cascades to invoice_items automatically)
   */
  async deleteInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { success: false, error: 'User not authenticated.' };
      }

      const { error } = await (supabase.from('invoices') as any)
        .delete()
        .eq('id', invoiceId)
        .eq('user_id', userData.user.id);

      if (error) {
        return { success: false, error: error.message || 'Failed to delete invoice.' };
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
