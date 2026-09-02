import { supabase } from './supabase/client';
import { BuyerSummary, BuyerDetail } from '@/src/types/buyer';
import { DbBuyer, DbInvoice } from '@/src/types/database';
import { normalizePhoneE164 } from '@/src/utils/phone';

export interface BuyerOperationResult<T = unknown> {
  data: T | null;
  error?: string;
}

export const buyerService = {
  /**
   * Fetch all buyers for authenticated user with aggregated Baki/Jama stats
   */
  async getBuyers(searchQuery?: string): Promise<BuyerSummary[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // 1. Fetch buyers
    let buyerQuery = (supabase.from('buyers') as any)
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (searchQuery && searchQuery.trim().length > 0) {
      const cleanSearch = searchQuery.trim();
      buyerQuery = buyerQuery.or(`name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%`);
    }

    const { data: buyers, error: buyerErr } = await buyerQuery;
    if (buyerErr) {
      throw new Error(buyerErr.message || 'Failed to fetch buyers.');
    }

    if (!buyers || (buyers as DbBuyer[]).length === 0) {
      return [];
    }

    const typedBuyers = buyers as DbBuyer[];

    // 2. Fetch buyer invoices to calculate stats
    const { data: invoices, error: invoiceErr } = await (supabase.from('invoices') as any)
      .select('party_id, total_amount, paid_amount, remaining_amount')
      .eq('user_id', userId)
      .eq('party_type', 'BUYER');

    if (invoiceErr) {
      return typedBuyers.map(b => ({
        ...b,
        total_bills: 0,
        total_amount: 0,
        total_jama: 0,
        total_baki: 0,
      }));
    }

    const statsMap: Record<
      string,
      { total_bills: number; total_amount: number; total_jama: number; total_baki: number }
    > = {};

    ((invoices as DbInvoice[]) || []).forEach(inv => {
      if (!statsMap[inv.party_id]) {
        statsMap[inv.party_id] = { total_bills: 0, total_amount: 0, total_jama: 0, total_baki: 0 };
      }
      statsMap[inv.party_id].total_bills += 1;
      statsMap[inv.party_id].total_amount += Number(inv.total_amount || 0);
      statsMap[inv.party_id].total_jama += Number(inv.paid_amount || 0);
      statsMap[inv.party_id].total_baki += Number(inv.remaining_amount || 0);
    });

    return typedBuyers.map(b => {
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
   * Fetch buyer by ID with full invoice history
   */
  async getBuyerById(buyerId: string): Promise<BuyerDetail> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // 1. Fetch buyer record
    const { data: buyer, error: buyerErr } = await (supabase.from('buyers') as any)
      .select('*')
      .eq('id', buyerId)
      .eq('user_id', userId)
      .single();

    if (buyerErr || !buyer) {
      throw new Error(buyerErr?.message || 'Buyer not found.');
    }

    const typedBuyer = buyer as DbBuyer;

    // 2. Fetch invoice history
    const { data: invoices, error: invoiceErr } = await (supabase.from('invoices') as any)
      .select('*')
      .eq('party_id', buyerId)
      .eq('party_type', 'BUYER')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: false });

    if (invoiceErr) {
      throw new Error(invoiceErr.message || 'Failed to fetch buyer invoices.');
    }

    const typedInvoices = (invoices as DbInvoice[]) || [];

    let totalAmount = 0;
    let totalJama = 0;
    let totalBaki = 0;

    typedInvoices.forEach(inv => {
      totalAmount += Number(inv.total_amount || 0);
      totalJama += Number(inv.paid_amount || 0);
      totalBaki += Number(inv.remaining_amount || 0);
    });

    return {
      ...typedBuyer,
      total_bills: typedInvoices.length,
      total_amount: totalAmount,
      total_jama: totalJama,
      total_baki: totalBaki,
      invoices: typedInvoices,
    };
  },

  /**
   * Create a new buyer
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

      const formattedPhone = data.phone ? normalizePhoneE164(data.phone) : null;

      const { data: newBuyer, error } = await (supabase.from('buyers') as any)
        .insert({
          user_id: userData.user.id,
          name: data.name.trim(),
          phone: formattedPhone,
          address: data.address?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message || 'Failed to create buyer.' };
      }

      return { data: newBuyer as DbBuyer };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Unexpected error creating buyer.' };
    }
  },

  /**
   * Update an existing buyer
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

      const formattedPhone = data.phone ? normalizePhoneE164(data.phone) : null;

      const { data: updatedBuyer, error } = await (supabase.from('buyers') as any)
        .update({
          name: data.name.trim(),
          phone: formattedPhone,
          address: data.address?.trim() || null,
        })
        .eq('id', buyerId)
        .eq('user_id', userData.user.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message || 'Failed to update buyer.' };
      }

      return { data: updatedBuyer as DbBuyer };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Unexpected error updating buyer.' };
    }
  },

  /**
   * Safe Delete Buyer
   * Checks if buyer has existing invoices. If so, prevents deletion to preserve ledger history.
   */
  async deleteBuyer(buyerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { success: false, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;

      // 1. Check for existing invoices
      const { count, error: countErr } = await (supabase.from('invoices') as any)
        .select('*', { count: 'exact', head: true })
        .eq('party_id', buyerId)
        .eq('party_type', 'BUYER')
        .eq('user_id', userId);

      if (countErr) {
        return { success: false, error: 'Failed to verify buyer invoice history.' };
      }

      if (count && count > 0) {
        return {
          success: false,
          error: `Cannot delete buyer because they have ${count} existing invoice(s). Buyer records must be preserved for invoice history.`,
        };
      }

      // 2. Delete buyer
      const { error: deleteErr } = await (supabase.from('buyers') as any)
        .delete()
        .eq('id', buyerId)
        .eq('user_id', userId);

      if (deleteErr) {
        return { success: false, error: deleteErr.message || 'Failed to delete buyer.' };
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
