import { supabase } from '@/src/services/supabase/client';
import { DbInvoice } from '@/src/types/database';
import { InvoiceSummary } from '@/src/types/invoice';
import { DateRange } from './dateUtils';

export interface DashboardMetrics {
  totalBilledPaise: number;
  totalJamaPaise: number;
  totalBakiPaise: number;
  totalInvoicesCount: number;
  paidTransactionsCount: number;
  pendingInvoicesCount: number;
  recentInvoices: InvoiceSummary[];
}

export const dashboardService = {
  /**
   * Fetch Dashboard metrics and recent bills for a specific date range
   */
  async getDashboardData(dateRange: DateRange): Promise<DashboardMetrics> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;
    const { startDate, endDate } = dateRange;

    // Query invoices within the date range
    const { data: invoices, error: invErr } = await (supabase.from('invoices') as any)
      .select('*')
      .eq('user_id', userId)
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .order('invoice_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (invErr) {
      throw new Error(invErr.message || 'Failed to fetch dashboard invoices.');
    }

    const typedInvoices = (invoices as DbInvoice[]) || [];

    if (typedInvoices.length === 0) {
      return {
        totalBilledPaise: 0,
        totalJamaPaise: 0,
        totalBakiPaise: 0,
        totalInvoicesCount: 0,
        paidTransactionsCount: 0,
        pendingInvoicesCount: 0,
        recentInvoices: [],
      };
    }

    // Fetch customer and buyer party names for the recent invoices
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

    let totalBilledPaise = 0;
    let totalJamaPaise = 0;
    let totalBakiPaise = 0;
    let paidTransactionsCount = 0;
    let pendingInvoicesCount = 0;

    const mappedInvoices: InvoiceSummary[] = typedInvoices.map(inv => {
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      const remaining = Number(inv.remaining_amount || 0);

      totalBilledPaise += total;
      totalJamaPaise += paid;
      totalBakiPaise += remaining;

      if (paid > 0) paidTransactionsCount += 1;
      if (remaining > 0) pendingInvoicesCount += 1;

      let partyName = 'Customer';
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

    return {
      totalBilledPaise,
      totalJamaPaise,
      totalBakiPaise,
      totalInvoicesCount: typedInvoices.length,
      paidTransactionsCount,
      pendingInvoicesCount,
      recentInvoices: mappedInvoices.slice(0, 5),
    };
  },
};
