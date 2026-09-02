-- ==============================================================================
-- SHAYONA INVOICE: PHASE 17 - PAYMENT HISTORY & AUDIT LOG SCHEMA
-- Multi-Tenant Payment History with Row Level Security (RLS)
-- ==============================================================================

-- 1. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance & Multi-Tenant Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_invoice 
  ON public.payments(user_id, invoice_id, payment_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_user_date 
  ON public.payments(user_id, payment_date DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 4. Multi-Tenant RLS Policies
-- SELECT: Users can only read payments belonging to their own user account
CREATE POLICY "Users can view own payments" 
  ON public.payments 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert payments for invoices they own
CREATE POLICY "Users can insert own payments" 
  ON public.payments 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE id = invoice_id AND user_id = auth.uid()
    )
  );

-- UPDATE: Users can only update their own payments
CREATE POLICY "Users can update own payments" 
  ON public.payments 
  FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own payments
CREATE POLICY "Users can delete own payments" 
  ON public.payments 
  FOR DELETE 
  USING (auth.uid() = user_id);
