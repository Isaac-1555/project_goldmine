-- 009_storage_files_bucket.sql
-- Purpose: Create 'files' storage bucket (policies must be set up manually via Supabase dashboard)

-- Create bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;