/**
 * Dashboard Feature Module Placeholder
 * Date filters (Day, Week, Month, Year, Custom) and Jama/Baki totals.
 */

export type DateFilterType = 'day' | 'week' | 'month' | 'year' | 'custom';

export interface DashboardMetrics {
  totalInvoicesCount: number;
  totalSalesAmount: number; // in paise or integer currency units
  totalJamaReceived: number; // in paise
  totalBakiDue: number; // in paise
}
