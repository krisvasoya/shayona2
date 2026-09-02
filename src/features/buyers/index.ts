/**
 * Buyers Feature Module Placeholder
 */

export interface Buyer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  totalInvoices: number;
  totalBakiDue: number; // in paise
  createdAt: string;
  updatedAt: string;
}
