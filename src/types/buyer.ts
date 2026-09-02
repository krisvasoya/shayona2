import { DbBuyer, DbInvoice } from './database';

export interface BuyerSummary extends DbBuyer {
  total_bills: number;
  total_amount: number; // in Paise
  total_jama: number; // in Paise (paid)
  total_baki: number; // in Paise (remaining)
}

export interface BuyerDetail extends BuyerSummary {
  invoices: DbInvoice[];
}
