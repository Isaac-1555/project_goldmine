-- Create new flashcards tables with different names to avoid conflicts
CREATE TABLE IF NOT EXISTS public.study_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_id UUID NOT NULL REFERENCES public.summaries(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  card_type TEXT NOT NULL DEFAULT 'qa' CHECK (card_type IN ('term-definition','qa','cloze')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_flashcards_summary ON public.study_flashcards(summary_id);
CREATE INDEX IF NOT EXISTS idx_study_flashcards_created ON public.study_flashcards(created_at DESC);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.study_flashcard_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.study_flashcards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  box INTEGER NOT NULL DEFAULT 1 CHECK (box BETWEEN 1 AND 5),
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  lapses INTEGER NOT NULL DEFAULT 0,
  successes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_study_reviews_user ON public.study_flashcard_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_study_reviews_next ON public.study_flashcard_reviews(next_review_at);

-- Enable RLS
ALTER TABLE public.study_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for study_flashcards
CREATE POLICY study_flashcards_select
  ON public.study_flashcards FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.summaries s
    JOIN public.files f ON f.id = s.file_id
    WHERE s.id = study_flashcards.summary_id AND f.user_id = auth.uid()
  ));

CREATE POLICY study_flashcards_insert
  ON public.study_flashcards FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.summaries s
    JOIN public.files f ON f.id = s.file_id
    WHERE s.id = study_flashcards.summary_id AND f.user_id = auth.uid()
  ));

CREATE POLICY study_flashcards_update
  ON public.study_flashcards FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.summaries s
    JOIN public.files f ON f.id = s.file_id
    WHERE s.id = study_flashcards.summary_id AND f.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.summaries s
    JOIN public.files f ON f.id = s.file_id
    WHERE s.id = study_flashcards.summary_id AND f.user_id = auth.uid()
  ));

CREATE POLICY study_flashcards_delete
  ON public.study_flashcards FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.summaries s
    JOIN public.files f ON f.id = s.file_id
    WHERE s.id = study_flashcards.summary_id AND f.user_id = auth.uid()
  ));

-- Policies for study_flashcard_reviews
CREATE POLICY study_reviews_select
  ON public.study_flashcard_reviews FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY study_reviews_insert
  ON public.study_flashcard_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY study_reviews_update
  ON public.study_flashcard_reviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY study_reviews_delete
  ON public.study_flashcard_reviews FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());