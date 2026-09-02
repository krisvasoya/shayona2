-- ==============================================================================
-- SHAYONA INVOICE: STORAGE BUCKET & STORAGE RLS POLICIES
-- Phase 3 Migration: Private PDF Invoice Bucket & User-Isolated Access Policies
-- ==============================================================================

-- 1. Create Private Invoices Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  FALSE,
  10485760, -- 10 MB maximum per PDF invoice
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

-- 2. Storage Objects RLS Policies
-- Expected Object Path: {user_id}/{year}/{invoice_id}.pdf

-- Allow authenticated users to view only their own invoices
DROP POLICY IF EXISTS "Users can view own invoice PDFs" ON storage.objects;
CREATE POLICY "Users can view own invoice PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to upload their own invoice PDFs
DROP POLICY IF EXISTS "Users can upload own invoice PDFs" ON storage.objects;
CREATE POLICY "Users can upload own invoice PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update their own invoice PDFs
DROP POLICY IF EXISTS "Users can update own invoice PDFs" ON storage.objects;
CREATE POLICY "Users can update own invoice PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own invoice PDFs
DROP POLICY IF EXISTS "Users can delete own invoice PDFs" ON storage.objects;
CREATE POLICY "Users can delete own invoice PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'invoices'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
