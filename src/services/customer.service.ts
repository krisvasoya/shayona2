import { supabase } from './supabase/client';
import { CustomerSummary, CustomerDetail } from '@/src/types/customer';
import { DbCustomer, DbInvoice } from '@/src/types/database';
import { normalizePhoneE164 } from '@/src/utils/phone';

export interface CustomerOperationResult<T = unknown> {
  data: T | null;
  error?: string;
}

export const customerService = {
  /**
   * Fetch all customers for the authenticated user with aggregated Baki/Jama totals
   */
  async getCustomers(searchQuery?: string): Promise<CustomerSummary[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // 1. Fetch customers
    let customerQuery = (supabase.from('customers') as any)
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (searchQuery && searchQuery.trim().length > 0) {
      const cleanSearch = searchQuery.trim();
      customerQuery = customerQuery.or(`name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%`);
    }

    const { data: customers, error: customerErr } = await customerQuery;
    if (customerErr) {
      throw new Error(customerErr.message || 'Failed to fetch customers.');
    }

    if (!customers || (customers as DbCustomer[]).length === 0) {
      return [];
    }

    const typedCustomers = customers as DbCustomer[];

    // 2. Fetch customer invoices to calculate totals
    const { data: invoices, error: invoiceErr } = await (supabase.from('invoices') as any)
      .select('party_id, total_amount, paid_amount, remaining_amount')
      .eq('user_id', userId)
      .eq('party_type', 'CUSTOMER');

    if (invoiceErr) {
      // Return customers with 0 stats if invoices table query fails
      return typedCustomers.map(c => ({
        ...c,
        total_bills: 0,
        total_amount: 0,
        total_jama: 0,
        total_baki: 0,
      }));
    }

    // Group invoices by party_id
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

    return typedCustomers.map(c => {
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
   * Fetch customer by ID including invoice ledger history
   */
  async getCustomerById(customerId: string): Promise<CustomerDetail> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;

    // 1. Fetch customer record
    const { data: customer, error: customerErr } = await (supabase.from('customers') as any)
      .select('*')
      .eq('id', customerId)
      .eq('user_id', userId)
      .single();

    if (customerErr || !customer) {
      throw new Error(customerErr?.message || 'Customer not found.');
    }

    const typedCustomer = customer as DbCustomer;

    // 2. Fetch invoice history
    const { data: invoices, error: invoiceErr } = await (supabase.from('invoices') as any)
      .select('*')
      .eq('party_id', customerId)
      .eq('party_type', 'CUSTOMER')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: false });

    if (invoiceErr) {
      throw new Error(invoiceErr.message || 'Failed to fetch customer invoices.');
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
      ...typedCustomer,
      total_bills: typedInvoices.length,
      total_amount: totalAmount,
      total_jama: totalJama,
      total_baki: totalBaki,
      invoices: typedInvoices,
    };
  },

  /**
   * Create a new customer
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

      const formattedPhone = data.phone ? normalizePhoneE164(data.phone) : null;

      const { data: newCustomer, error } = await (supabase.from('customers') as any)
        .insert({
          user_id: userData.user.id,
          name: data.name.trim(),
          phone: formattedPhone,
          address: data.address?.trim() || null,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message || 'Failed to create customer.' };
      }

      return { data: newCustomer as DbCustomer };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Unexpected error creating customer.' };
    }
  },

  /**
   * Update an existing customer
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

      const formattedPhone = data.phone ? normalizePhoneE164(data.phone) : null;

      const { data: updatedCustomer, error } = await (supabase.from('customers') as any)
        .update({
          name: data.name.trim(),
          phone: formattedPhone,
          address: data.address?.trim() || null,
        })
        .eq('id', customerId)
        .eq('user_id', userData.user.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message || 'Failed to update customer.' };
      }

      return { data: updatedCustomer as DbCustomer };
    } catch (err) {
      return { data: null, error: (err as Error).message || 'Unexpected error updating customer.' };
    }
  },

  /**
   * Safe Delete Customer
   * Checks if customer has existing invoices. If so, prevents deletion to preserve ledger history.
   */
  async deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return { success: false, error: 'User not authenticated.' };
      }

      const userId = userData.user.id;

      // 1. Check for existing invoices
      const { count, error: countErr } = await (supabase.from('invoices') as any)
        .select('*', { count: 'exact', head: true })
        .eq('party_id', customerId)
        .eq('party_type', 'CUSTOMER')
        .eq('user_id', userId);

      if (countErr) {
        return { success: false, error: 'Failed to verify customer invoice history.' };
      }

      if (count && count > 0) {
        return {
          success: false,
          error: `Cannot delete customer because they have ${count} existing invoice(s). Customer records must be preserved for invoice history.`,
        };
      }

      // 2. Delete customer
      const { error: deleteErr } = await (supabase.from('customers') as any)
        .delete()
        .eq('id', customerId)
        .eq('user_id', userId);

      if (deleteErr) {
        return { success: false, error: deleteErr.message || 'Failed to delete customer.' };
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
