-- 008_align_documents_notes_transcripts.sql
-- Purpose: Align schema for documents/notes/transcripts with app expectations.
-- This ensures required columns exist even if the tables predated earlier migrations.

-- Ensure extensions used by defaults exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- documents: ensure required columns exist
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS file_id UUID,
  ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- documents: ensure FK to files exists (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_file_id_fkey'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.documents
        ADD CONSTRAINT documents_file_id_fkey
        FOREIGN KEY (file_id) REFERENCES public.files(id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE public.documents VALIDATE CONSTRAINT documents_file_id_fkey;
    EXCEPTION WHEN duplicate_object THEN
      -- ignore if created concurrently
      NULL;
    END;
  END IF;
END
$$;

-- documents: index for file_id
CREATE INDEX IF NOT EXISTS idx_documents_file_id ON public.documents(file_id);

-- notes: ensure created_at/updated_at exist for UI ordering expectations
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- transcripts: ensure created_at exists for UI
ALTER TABLE public.transcripts
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- RLS already handled in prior migrations; keep enabled
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Reassert policies for documents in case they were missing (idempotent)
DO $$ BEGIN
  CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can view their own documents" ON public.documents
    USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own documents" ON public.documents
    FOR INSERT WITH CHECK (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can insert their own documents" ON public.documents
    WITH CHECK (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own documents" ON public.documents
    FOR UPDATE USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    ) WITH CHECK (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can update their own documents" ON public.documents
    USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    ) WITH CHECK (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own documents" ON public.documents
    FOR DELETE USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can delete their own documents" ON public.documents
    USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
END $$;

