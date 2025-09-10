-- 007_hardening_and_repair.sql
-- Purpose: Repair drift (after stamping 001–006) and harden RLS/policies.
-- - Ensure required extensions exist
-- - Ensure columns/tables/indexes introduced in 004/005 exist (idempotent)
-- - Harden policies by adding explicit WITH CHECK where missing
-- - Ensure file_type constraint includes new values

-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;         -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- for uuid_generate_v4()

-- 2) Ensure columns from 004 exist on transcripts
ALTER TABLE public.transcripts 
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'audio',
    ADD COLUMN IF NOT EXISTS source_name VARCHAR(255);

COMMENT ON COLUMN public.transcripts.source_type IS 'Type of source: audio, document, notes';
COMMENT ON COLUMN public.transcripts.source_name IS 'Name of the source file (for documents)';

-- 3) Ensure audio-specific columns from 005 exist on transcripts
ALTER TABLE public.transcripts 
    ADD COLUMN IF NOT EXISTS duration INTEGER,
    ADD COLUMN IF NOT EXISTS audio_file_path TEXT;

-- 4) Ensure separate content tables (from 005) exist
CREATE TABLE IF NOT EXISTS public.notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    html_content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    storage_path TEXT NOT NULL,
    extracted_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_notes_file_id ON public.notes(file_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_id ON public.documents(file_id);

-- 6) Enable RLS on new tables
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- 7) Policies for notes (ensure present and hardened)
DO $$ BEGIN
  CREATE POLICY "Users can view their own notes" ON public.notes
    FOR SELECT USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can view their own notes" ON public.notes
    USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert their own notes" ON public.notes
    FOR INSERT WITH CHECK (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can insert their own notes" ON public.notes
    WITH CHECK (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own notes" ON public.notes
    FOR UPDATE USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    ) WITH CHECK (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can update their own notes" ON public.notes
    USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    ) WITH CHECK (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own notes" ON public.notes
    FOR DELETE USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can delete their own notes" ON public.notes
    USING (
      file_id IN (SELECT id FROM public.files WHERE user_id = auth.uid())
    );
END $$;

-- 8) Policies for documents (ensure present and hardened)
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

-- 9) Harden existing policies to include WITH CHECK where missing
-- files: update policy should also restrict the new row
DO $$ BEGIN
  ALTER POLICY "Users can update own files" ON public.files
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN undefined_object THEN
  -- If policy didn't exist for some reason, create it
  CREATE POLICY "Users can update own files" ON public.files
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
END $$;

-- summaries: update policy should also restrict the new row
DO $$ BEGIN
  ALTER POLICY "Users can update summaries of own files" ON public.summaries
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.files 
        WHERE public.files.id = public.summaries.file_id 
          AND public.files.user_id = auth.uid()
      )
    );
EXCEPTION WHEN undefined_object THEN
  CREATE POLICY "Users can update summaries of own files" ON public.summaries
    FOR UPDATE USING (
      EXISTS (
        SELECT 1 FROM public.files 
        WHERE public.files.id = public.summaries.file_id 
          AND public.files.user_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.files 
        WHERE public.files.id = public.summaries.file_id 
          AND public.files.user_id = auth.uid()
      )
    );
END $$;

-- summary_tags: FOR ALL should include WITH CHECK
DO $$ BEGIN
  CREATE POLICY "Users can manage tags of own summaries" ON public.summary_tags
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.summary_tags.summary_id 
          AND f.user_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.summary_tags.summary_id 
          AND f.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can manage tags of own summaries" ON public.summary_tags
    USING (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.summary_tags.summary_id 
          AND f.user_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.summary_tags.summary_id 
          AND f.user_id = auth.uid()
      )
    );
END $$;

-- flashcards: FOR ALL should include WITH CHECK
DO $$ BEGIN
  CREATE POLICY "Users can manage flashcards of own summaries" ON public.flashcards
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.flashcards.summary_id 
          AND f.user_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.flashcards.summary_id 
          AND f.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can manage flashcards of own summaries" ON public.flashcards
    USING (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.flashcards.summary_id 
          AND f.user_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.flashcards.summary_id 
          AND f.user_id = auth.uid()
      )
    );
END $$;

-- quizzes: FOR ALL should include WITH CHECK
DO $$ BEGIN
  CREATE POLICY "Users can manage quizzes of own summaries" ON public.quizzes
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.quizzes.summary_id 
          AND f.user_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.quizzes.summary_id 
          AND f.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN
  ALTER POLICY "Users can manage quizzes of own summaries" ON public.quizzes
    USING (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.quizzes.summary_id 
          AND f.user_id = auth.uid()
      )
    ) WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.summaries s
        JOIN public.files f ON s.file_id = f.id
        WHERE s.id = public.quizzes.summary_id 
          AND f.user_id = auth.uid()
      )
    );
END $$;

-- 10) Ensure files.file_type check constraint supports all expected types
ALTER TABLE public.files 
  DROP CONSTRAINT IF EXISTS files_file_type_check;
ALTER TABLE public.files 
  ADD CONSTRAINT files_file_type_check 
  CHECK (file_type IN ('audio', 'pdf', 'docx', 'mixed', 'notebook'));
