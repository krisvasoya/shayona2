import { DbCustomer, DbInvoice } from './database';

export interface CustomerSummary extends DbCustomer {
  total_bills: number;
  total_amount: number; // in Paise
  total_jama: number; // in Paise (paid)
  total_baki: number; // in Paise (remaining)
}

export interface CustomerDetail extends CustomerSummary {
  invoices: DbInvoice[];
}
