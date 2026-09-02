/**
 * Customers Feature Module Placeholder
 */

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  totalInvoices: number;
  totalBakiDue: number; // in paise
  createdAt: string;
  updatedAt: string;
}
