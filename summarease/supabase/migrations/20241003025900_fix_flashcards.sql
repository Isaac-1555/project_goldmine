-- Add missing columns to flashcards table
ALTER TABLE public.flashcards 
ADD COLUMN IF NOT EXISTS back TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Update existing rows to have a default back value if they don't
UPDATE public.flashcards SET back = 'Answer' WHERE back IS NULL;

-- Make back column required
ALTER TABLE public.flashcards ALTER COLUMN back SET NOT NULL;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_flashcards_created_at ON public.flashcards(created_at DESC);

-- Ensure Leitner reviews table exists
CREATE TABLE IF NOT EXISTS public.flashcard_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  box INTEGER NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  lapses INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user ON public.flashcard_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_next ON public.flashcard_reviews(next_review_at);

-- Enable RLS if not already
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS flashcards_select_own ON public.flashcards;
DROP POLICY IF EXISTS flashcards_modify_own ON public.flashcards;
DROP POLICY IF EXISTS flashcards_update_own ON public.flashcards;
DROP POLICY IF EXISTS flashcards_delete_own ON public.flashcards;

DROP POLICY IF EXISTS flashcard_reviews_select_own ON public.flashcard_reviews;
DROP POLICY IF EXISTS flashcard_reviews_upsert_own ON public.flashcard_reviews;
DROP POLICY IF EXISTS flashcard_reviews_update_own ON public.flashcard_reviews;
DROP POLICY IF EXISTS flashcard_reviews_delete_own ON public.flashcard_reviews;

-- Recreate policies
CREATE POLICY flashcards_select_own
  ON public.flashcards FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.summaries s
    JOIN public.files f ON f.id = s.file_id
    WHERE s.id = flashcards.summary_id AND f.user_id = auth.uid()
  ));

CREATE POLICY flashcards_modify_own
  ON public.flashcards FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.summaries s
    JOIN public.files f ON f.id = s.file_id
    WHERE s.id = flashcards.summary_id AND f.user_id = auth.uid()
  ));

CREATE POLICY flashcards_update_own
  ON public.flashcards FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.summaries s
    JOIN public.files f ON f.id = s.file_id
    WHERE s.id = flashcards.summary_id AND f.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.summaries s
    JOIN public.files f ON f.id = s.file_id
    WHERE s.id = flashcards.summary_id AND f.user_id = auth.uid()
  ));

CREATE POLICY flashcards_delete_own
  ON public.flashcards FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.summaries s
    JOIN public.files f ON f.id = s.file_id
    WHERE s.id = flashcards.summary_id AND f.user_id = auth.uid()
  ));

CREATE POLICY flashcard_reviews_select_own
  ON public.flashcard_reviews FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY flashcard_reviews_upsert_own
  ON public.flashcard_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY flashcard_reviews_update_own
  ON public.flashcard_reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY flashcard_reviews_delete_own
  ON public.flashcard_reviews FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());