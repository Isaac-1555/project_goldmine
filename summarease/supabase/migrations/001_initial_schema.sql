-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends auth.users)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create folders table
CREATE TABLE public.folders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create files table
CREATE TABLE public.files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('audio', 'pdf', 'docx')),
    storage_path TEXT NOT NULL,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create transcripts table
CREATE TABLE public.transcripts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create summaries table
CREATE TABLE public.summaries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    file_id UUID REFERENCES public.files(id) ON DELETE CASCADE NOT NULL,
    summary_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tags table
CREATE TABLE public.tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- Create summary_tags junction table
CREATE TABLE public.summary_tags (
    summary_id UUID REFERENCES public.summaries(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (summary_id, tag_id)
);

-- Create flashcards table
CREATE TABLE public.flashcards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    summary_id UUID REFERENCES public.summaries(id) ON DELETE CASCADE NOT NULL,
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL
);

-- Create quizzes table
CREATE TABLE public.quizzes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    summary_id UUID REFERENCES public.summaries(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_index INTEGER NOT NULL
);

-- Create quiz_attempts table
CREATE TABLE public.quiz_attempts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    selected_index INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_files_user_id ON public.files(user_id);
CREATE INDEX idx_files_folder_id ON public.files(folder_id);
CREATE INDEX idx_files_status ON public.files(status);
CREATE INDEX idx_transcripts_file_id ON public.transcripts(file_id);
CREATE INDEX idx_summaries_file_id ON public.summaries(file_id);
CREATE INDEX idx_summary_tags_summary_id ON public.summary_tags(summary_id);
CREATE INDEX idx_summary_tags_tag_id ON public.summary_tags(tag_id);
CREATE INDEX idx_flashcards_summary_id ON public.flashcards(summary_id);
CREATE INDEX idx_quizzes_summary_id ON public.quizzes(summary_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);