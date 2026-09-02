-- ==============================================================================
-- SHAYONA INVOICE: MIGRATION 007 — PROFILE ADDRESS
-- Add optional shop address column to public.profiles
-- ==============================================================================

-- 1. Add optional nullable address column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;

-- 2. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
