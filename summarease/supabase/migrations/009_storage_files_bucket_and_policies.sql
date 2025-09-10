-- 009_storage_files_bucket_and_policies.sql
-- Purpose: Ensure 'files' storage bucket exists and RLS policies allow per-user access.

-- Create bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

-- Policies on storage.objects for bucket 'files'
-- Upload (INSERT)
DO $$ BEGIN
  CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can upload their own files" ON storage.objects
    WITH CHECK (
      bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
    );
END $$;

-- View (SELECT)
DO $$ BEGIN
  CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can view their own files" ON storage.objects
    USING (
      bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
    );
END $$;

-- Update (UPDATE)
DO $$ BEGIN
  CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
    ) WITH CHECK (
      bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can update their own files" ON storage.objects
    USING (
      bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
    ) WITH CHECK (
      bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
    );
END $$;

-- Delete (DELETE)
DO $$ BEGIN
  CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can delete their own files" ON storage.objects
    USING (
      bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
    );
END $$;

