import { PartyType, DbInvoice, DbInvoiceItem } from './database';

export interface InvoiceItemInput {
  id?: string;
  item_name: string;
  quantity: number;
  rate: number; // in Paise
  amount: number; // in Paise
}

export interface InvoiceSummary extends DbInvoice {
  party_name: string;
  items_count: number;
}

export interface InvoiceDetail extends InvoiceSummary {
  items: DbInvoiceItem[];
}

export interface InvoiceFormData {
  invoice_number: string;
  party_type: PartyType;
  party_id: string;
  party_name: string;
  invoice_date: string;
  items: {
    item_name: string;
    quantity: number;
    rate_rupees: number;
  }[];
  paid_amount_rupees: number;
  notes?: string;
}
