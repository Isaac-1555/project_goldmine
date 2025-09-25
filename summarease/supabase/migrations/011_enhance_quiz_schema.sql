-- Enhanced Quiz Schema Migration
-- This migration restructures the quiz system to support:
-- 1. Quiz sets (collection of questions from multiple summaries)
-- 2. Quiz sessions (individual quiz-taking instances with timing)
-- 3. Better question management and statistics tracking

-- First, we need to restructure the existing quizzes table
-- The current table stores individual questions, but we need to group them into quiz sets

-- Create quiz_sets table (represents a complete quiz generated from one or more summaries)
CREATE TABLE public.quiz_sets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    summary_ids UUID[] NOT NULL, -- Array of summary IDs used to generate this quiz
    question_count INTEGER NOT NULL DEFAULT 5,
    difficulty_level TEXT DEFAULT 'mixed' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'mixed')),
    question_types TEXT[] DEFAULT ARRAY['mcq'], -- For future: ['mcq', 'true-false', 'fill-blank', 'short-answer']
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quiz_questions table (individual questions within a quiz set)
CREATE TABLE public.quiz_questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quiz_set_id UUID REFERENCES public.quiz_sets(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'true-false', 'fill-blank', 'short-answer')),
    options JSONB NOT NULL, -- Array of options for MCQ, or other question-specific data
    correct_answer_index INTEGER NOT NULL,
    explanation TEXT, -- Optional explanation for the correct answer
    difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    question_order INTEGER NOT NULL, -- Order within the quiz set
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quiz_sessions table (tracks individual attempts at a quiz set)
CREATE TABLE public.quiz_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quiz_set_id UUID REFERENCES public.quiz_sets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ, -- NULL if session is in progress
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER DEFAULT 0,
    score_percentage DECIMAL(5,2), -- Calculated score as percentage
    time_spent_seconds INTEGER, -- Total time taken in seconds
    session_status TEXT DEFAULT 'in_progress' CHECK (session_status IN ('in_progress', 'completed', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create quiz_question_attempts table (tracks individual question attempts within a session)
CREATE TABLE public.quiz_question_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quiz_session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE NOT NULL,
    quiz_question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
    user_answer_index INTEGER, -- User's selected answer (NULL if not answered)
    is_correct BOOLEAN,
    time_spent_seconds INTEGER, -- Time spent on this specific question
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(quiz_session_id, quiz_question_id) -- One attempt per question per session
);

-- Create indexes for better performance
CREATE INDEX idx_quiz_sets_user_id ON public.quiz_sets(user_id);
CREATE INDEX idx_quiz_sets_created_at ON public.quiz_sets(created_at DESC);
CREATE INDEX idx_quiz_sets_summary_ids ON public.quiz_sets USING gin(summary_ids);

CREATE INDEX idx_quiz_questions_quiz_set_id ON public.quiz_questions(quiz_set_id);
CREATE INDEX idx_quiz_questions_order ON public.quiz_questions(quiz_set_id, question_order);

CREATE INDEX idx_quiz_sessions_user_id ON public.quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_quiz_set_id ON public.quiz_sessions(quiz_set_id);
CREATE INDEX idx_quiz_sessions_status ON public.quiz_sessions(session_status);
CREATE INDEX idx_quiz_sessions_completed_at ON public.quiz_sessions(completed_at DESC);

CREATE INDEX idx_quiz_question_attempts_session_id ON public.quiz_question_attempts(quiz_session_id);
CREATE INDEX idx_quiz_question_attempts_question_id ON public.quiz_question_attempts(quiz_question_id);

-- Function to automatically update quiz_sets.updated_at timestamp
CREATE OR REPLACE FUNCTION update_quiz_sets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on quiz_sets
CREATE TRIGGER trigger_update_quiz_sets_updated_at
    BEFORE UPDATE ON public.quiz_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_sets_updated_at();

-- Function to automatically calculate and update quiz session score
CREATE OR REPLACE FUNCTION update_quiz_session_score()
RETURNS TRIGGER AS $$
DECLARE
    session_record RECORD;
    total_questions INTEGER;
    correct_count INTEGER;
    calculated_score DECIMAL(5,2);
BEGIN
    -- Get session details
    SELECT * INTO session_record FROM quiz_sessions WHERE id = NEW.quiz_session_id;
    
    -- Count total questions and correct answers for this session
    SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_correct = true THEN 1 END) as correct
    INTO total_questions, correct_count
    FROM quiz_question_attempts 
    WHERE quiz_session_id = NEW.quiz_session_id;
    
    -- Calculate percentage score
    calculated_score = CASE 
        WHEN total_questions > 0 THEN (correct_count * 100.0) / total_questions
        ELSE 0 
    END;
    
    -- Update the quiz session with new stats
    UPDATE quiz_sessions 
    SET 
        correct_answers = correct_count,
        score_percentage = calculated_score
    WHERE id = NEW.quiz_session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update quiz session score when question attempts are inserted/updated
CREATE TRIGGER trigger_update_quiz_session_score
    AFTER INSERT OR UPDATE ON public.quiz_question_attempts
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_session_score();

-- Function to get user's quiz statistics
CREATE OR REPLACE FUNCTION get_user_quiz_statistics(user_uuid UUID)
RETURNS TABLE (
    total_quizzes_created INTEGER,
    total_quizzes_taken INTEGER,
    total_sessions INTEGER,
    completed_sessions INTEGER,
    average_score DECIMAL(5,2),
    total_questions_answered INTEGER,
    total_correct_answers INTEGER,
    accuracy_percentage DECIMAL(5,2),
    total_time_spent_minutes INTEGER,
    average_session_time_minutes DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Quizzes created
        (SELECT COUNT(*)::INTEGER FROM quiz_sets WHERE user_id = user_uuid),
        -- Unique quizzes taken
        (SELECT COUNT(DISTINCT quiz_set_id)::INTEGER FROM quiz_sessions WHERE user_id = user_uuid),
        -- Total sessions
        (SELECT COUNT(*)::INTEGER FROM quiz_sessions WHERE user_id = user_uuid),
        -- Completed sessions
        (SELECT COUNT(*)::INTEGER FROM quiz_sessions WHERE user_id = user_uuid AND session_status = 'completed'),
        -- Average score
        (SELECT COALESCE(AVG(score_percentage), 0)::DECIMAL(5,2) FROM quiz_sessions WHERE user_id = user_uuid AND session_status = 'completed'),
        -- Total questions answered
        (SELECT COUNT(*)::INTEGER FROM quiz_question_attempts qqa 
         JOIN quiz_sessions qs ON qqa.quiz_session_id = qs.id 
         WHERE qs.user_id = user_uuid AND qqa.user_answer_index IS NOT NULL),
        -- Total correct answers
        (SELECT COUNT(*)::INTEGER FROM quiz_question_attempts qqa 
         JOIN quiz_sessions qs ON qqa.quiz_session_id = qs.id 
         WHERE qs.user_id = user_uuid AND qqa.is_correct = true),
        -- Accuracy percentage
        (SELECT CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(CASE WHEN qqa.is_correct = true THEN 1 END) * 100.0 / COUNT(*))::DECIMAL(5,2)
            ELSE 0 
        END
        FROM quiz_question_attempts qqa 
        JOIN quiz_sessions qs ON qqa.quiz_session_id = qs.id 
        WHERE qs.user_id = user_uuid AND qqa.user_answer_index IS NOT NULL),
        -- Total time spent (in minutes)
        (SELECT COALESCE(SUM(time_spent_seconds), 0)::INTEGER / 60 FROM quiz_sessions WHERE user_id = user_uuid AND session_status = 'completed'),
        -- Average session time (in minutes)
        (SELECT COALESCE(AVG(time_spent_seconds), 0)::DECIMAL(5,2) / 60 FROM quiz_sessions WHERE user_id = user_uuid AND session_status = 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's recent quiz performance (last 10 sessions)
CREATE OR REPLACE FUNCTION get_user_recent_quiz_performance(user_uuid UUID)
RETURNS TABLE (
    session_id UUID,
    quiz_title TEXT,
    completed_at TIMESTAMPTZ,
    score_percentage DECIMAL(5,2),
    time_spent_minutes DECIMAL(5,2),
    total_questions INTEGER,
    correct_answers INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qs.id as session_id,
        qset.title as quiz_title,
        qs.completed_at,
        qs.score_percentage,
        (qs.time_spent_seconds / 60.0)::DECIMAL(5,2) as time_spent_minutes,
        qs.total_questions,
        qs.correct_answers
    FROM quiz_sessions qs
    JOIN quiz_sets qset ON qs.quiz_set_id = qset.id
    WHERE qs.user_id = user_uuid 
      AND qs.session_status = 'completed'
    ORDER BY qs.completed_at DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_quiz_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_recent_quiz_performance(UUID) TO authenticated;

-- Note: We'll keep the existing quizzes and quiz_attempts tables for backward compatibility
-- But new quiz functionality will use the enhanced schema above
-- The old tables can be migrated or deprecated in a future migration if needed