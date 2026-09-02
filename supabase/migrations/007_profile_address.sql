-- ==============================================================================
-- SHAYONA INVOICE: MIGRATION 007 — PROFILE ADDRESS
-- Add optional shop address column to public.profiles
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
