-- ==============================================================================
-- SHAYONA INVOICE: PHASE 23 - SIMPLE BUSINESS EXPENSES SCHEMA
-- Multi-Tenant Expense Tracking with Row Level Security (RLS)
-- ==============================================================================

-- 1. Create Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance & Multi-Tenant Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user_date 
  ON public.expenses(user_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_created 
  ON public.expenses(user_id, created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 4. Multi-Tenant RLS Policies
-- SELECT: Users can only read expenses belonging to their own user account
CREATE POLICY "Users can view own expenses" 
  ON public.expenses 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert expenses for themselves
CREATE POLICY "Users can insert own expenses" 
  ON public.expenses 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own expenses
CREATE POLICY "Users can update own expenses" 
  ON public.expenses 
  FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can only delete their own expenses
CREATE POLICY "Users can delete own expenses" 
  ON public.expenses 
  FOR DELETE 
  USING (auth.uid() = user_id);
