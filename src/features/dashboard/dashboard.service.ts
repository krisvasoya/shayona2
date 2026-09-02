import { supabase } from '@/src/services/supabase/client';
import { localStore } from '@/src/database/localStore';
import { InvoiceSummary } from '@/src/types/invoice';
import { syncService } from '@/src/services/sync.service';
import { networkService } from '@/src/services/network.service';
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
   * Fetch Dashboard metrics and recent bills for a specific date range (Offline-First)
   */
  async getDashboardData(dateRange: DateRange): Promise<DashboardMetrics> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      throw new Error('User not authenticated.');
    }

    const userId = userData.user.id;
    const { startDate, endDate } = dateRange;

    // Background pull if online
    if (networkService.isOnline()) {
      syncService.pullFromServer(userId).catch(() => {});
    }

    // 1. Read local invoices
    const allInvoices = await localStore.getInvoices(userId);

    // Filter by date range (inclusive)
    const rangeInvoices = allInvoices.filter(inv => {
      return inv.invoice_date >= startDate && inv.invoice_date <= endDate;
    });

    if (rangeInvoices.length === 0) {
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

    // 2. Fetch customers, buyers, items from localStore
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
    items.forEach(it => {
      itemsCountMap.set(it.invoice_id, (itemsCountMap.get(it.invoice_id) || 0) + 1);
    });

    let totalBilledPaise = 0;
    let totalJamaPaise = 0;
    let totalBakiPaise = 0;
    let paidTransactionsCount = 0;
    let pendingInvoicesCount = 0;

    const mappedInvoices: InvoiceSummary[] = rangeInvoices.map(inv => {
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      const remaining = Number(inv.remaining_amount || 0);

      totalBilledPaise += total;
      totalJamaPaise += paid;
      totalBakiPaise += remaining;

      if (paid > 0) paidTransactionsCount += 1;
      if (remaining > 0) pendingInvoicesCount += 1;

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
        party_type: inv.party_type as 'CUSTOMER' | 'BUYER',
        party_id: inv.party_id,
        party_name: partyName,
        total_amount: total,
        paid_amount: paid,
        remaining_amount: remaining,
        pdf_path: inv.pdf_path || null,
        notes: inv.notes || null,
        items_count: itemsCountMap.get(inv.id) || 0,
        created_at: inv.created_at,
        updated_at: inv.updated_at,
      };
    });

    // Sort by invoice_date desc, created_at desc
    mappedInvoices.sort((a, b) => {
      const dateCmp = new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime();
      if (dateCmp !== 0) return dateCmp;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return {
      totalBilledPaise,
      totalJamaPaise,
      totalBakiPaise,
      totalInvoicesCount: rangeInvoices.length,
      paidTransactionsCount,
      pendingInvoicesCount,
      recentInvoices: mappedInvoices.slice(0, 10),
    };
  },
};
