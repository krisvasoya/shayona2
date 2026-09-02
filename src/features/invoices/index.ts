/**
 * Invoices Feature Module Placeholder
 */

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number; // in paise
  amount: number; // in paise (quantity * rate)
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  partyType: 'customer' | 'buyer';
  partyId: string;
  partyName: string;
  date: string;
  items: InvoiceItem[];
  totalAmount: number; // in paise
  paidAmount: number; // in paise (Jama)
  remainingAmount: number; // in paise (Baki)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
