-- Add created_at field to the original quizzes table for backward compatibility
-- This ensures the simple quiz service can track creation timestamps

ALTER TABLE public.quizzes 
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();

-- Create an index on the created_at column for better performance when ordering
CREATE INDEX idx_quizzes_created_at ON public.quizzes(created_at DESC);