-- ==============================================================================
-- SHAYONA INVOICE: SECURITY HARDENING & MULTI-TENANT ISOLATION
-- Phase 14 Migration: Cross-Party Integrity & Storage Isolation Enforcement
-- ==============================================================================

-- 1. Ensure RLS is strictly ENABLED on all core user-data tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. HARDEN INVOICES RLS POLICIES (Cross-Party Ownership Validation)
-- Ensures User A cannot create or update an invoice referencing User B's customer or buyer
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can create own invoices" ON public.invoices;
CREATE POLICY "Users can create own invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (party_type = 'CUSTOMER' AND EXISTS (
        SELECT 1 FROM public.customers 
        WHERE customers.id = invoices.party_id 
        AND customers.user_id = auth.uid()
      ))
      OR
      (party_type = 'BUYER' AND EXISTS (
        SELECT 1 FROM public.buyers 
        WHERE buyers.id = invoices.party_id 
        AND buyers.user_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
CREATE POLICY "Users can update own invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (party_type = 'CUSTOMER' AND EXISTS (
        SELECT 1 FROM public.customers 
        WHERE customers.id = invoices.party_id 
        AND customers.user_id = auth.uid()
      ))
      OR
      (party_type = 'BUYER' AND EXISTS (
        SELECT 1 FROM public.buyers 
        WHERE buyers.id = invoices.party_id 
        AND buyers.user_id = auth.uid()
      ))
    )
  );

-- ------------------------------------------------------------------------------
-- 3. HARDEN INVOICE_ITEMS RLS POLICIES (Invoice Parent Ownership)
-- Ensures line items can strictly be inserted, updated, deleted only if parent invoice belongs to auth.uid()
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own invoice items" ON public.invoice_items;
CREATE POLICY "Users can view own invoice items"
  ON public.invoice_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own invoice items" ON public.invoice_items;
CREATE POLICY "Users can create own invoice items"
  ON public.invoice_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own invoice items" ON public.invoice_items;
CREATE POLICY "Users can update own invoice items"
  ON public.invoice_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own invoice items" ON public.invoice_items;
CREATE POLICY "Users can delete own invoice items"
  ON public.invoice_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );
