-- ==============================================================================
-- SHAYONA INVOICE: PERFORMANCE & 3+ YEARS SCALABILITY INDEXES
-- Phase 13 Migration: Multi-Tenant B-Tree Indexes for High Volume Invoicing
-- ==============================================================================

-- 1. Invoices: Multi-tenant date descending order (speeds up invoice listings, year/month date-filter scans)
CREATE INDEX IF NOT EXISTS idx_invoices_user_date_desc 
  ON public.invoices(user_id, invoice_date DESC, created_at DESC);

-- 2. Invoices: Multi-tenant party type and payment status (speeds up Baki/Paid/Customer/Buyer filter tabs)
CREATE INDEX IF NOT EXISTS idx_invoices_user_party_status 
  ON public.invoices(user_id, party_type, remaining_amount);

-- 3. Invoices: Party ledger history (speeds up single customer/buyer ledger queries)
CREATE INDEX IF NOT EXISTS idx_invoices_user_party_id 
  ON public.invoices(user_id, party_id, invoice_date DESC);

-- 4. Invoices: Unique invoice number lookups
CREATE INDEX IF NOT EXISTS idx_invoices_user_number_lookup 
  ON public.invoices(user_id, invoice_number);

-- 5. Invoice Items: Foreign key lookups for single invoice load
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_lookup 
  ON public.invoice_items(invoice_id);

-- 6. Customers: Fast prefix & text search
CREATE INDEX IF NOT EXISTS idx_customers_user_name_phone 
  ON public.customers(user_id, name, phone);

-- 7. Buyers: Fast prefix & text search
CREATE INDEX IF NOT EXISTS idx_buyers_user_name_phone 
  ON public.buyers(user_id, name, phone);
