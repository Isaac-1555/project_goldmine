-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summary_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Folders table policies
CREATE POLICY "Users can view own folders" ON public.folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own folders" ON public.folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own folders" ON public.folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own folders" ON public.folders
    FOR DELETE USING (auth.uid() = user_id);

-- Files table policies
CREATE POLICY "Users can view own files" ON public.files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files" ON public.files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files" ON public.files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON public.files
    FOR DELETE USING (auth.uid() = user_id);

-- Transcripts table policies
CREATE POLICY "Users can view transcripts of own files" ON public.transcripts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.files 
            WHERE files.id = transcripts.file_id 
            AND files.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert transcripts for own files" ON public.transcripts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.files 
            WHERE files.id = transcripts.file_id 
            AND files.user_id = auth.uid()
        )
    );

-- Summaries table policies
CREATE POLICY "Users can view summaries of own files" ON public.summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.files 
            WHERE files.id = summaries.file_id 
            AND files.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert summaries for own files" ON public.summaries
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.files 
            WHERE files.id = summaries.file_id 
            AND files.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update summaries of own files" ON public.summaries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.files 
            WHERE files.id = summaries.file_id 
            AND files.user_id = auth.uid()
        )
    );

-- Tags table policies (tags are shared across users)
CREATE POLICY "Anyone can view tags" ON public.tags
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert tags" ON public.tags
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Summary_tags table policies
CREATE POLICY "Users can view tags of own summaries" ON public.summary_tags
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.summaries s
            JOIN public.files f ON s.file_id = f.id
            WHERE s.id = summary_tags.summary_id 
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage tags of own summaries" ON public.summary_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.summaries s
            JOIN public.files f ON s.file_id = f.id
            WHERE s.id = summary_tags.summary_id 
            AND f.user_id = auth.uid()
        )
    );

-- Flashcards table policies
CREATE POLICY "Users can view flashcards of own summaries" ON public.flashcards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.summaries s
            JOIN public.files f ON s.file_id = f.id
            WHERE s.id = flashcards.summary_id 
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage flashcards of own summaries" ON public.flashcards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.summaries s
            JOIN public.files f ON s.file_id = f.id
            WHERE s.id = flashcards.summary_id 
            AND f.user_id = auth.uid()
        )
    );

-- Quizzes table policies
CREATE POLICY "Users can view quizzes of own summaries" ON public.quizzes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.summaries s
            JOIN public.files f ON s.file_id = f.id
            WHERE s.id = quizzes.summary_id 
            AND f.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage quizzes of own summaries" ON public.quizzes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.summaries s
            JOIN public.files f ON s.file_id = f.id
            WHERE s.id = quizzes.summary_id 
            AND f.user_id = auth.uid()
        )
    );

-- Quiz attempts table policies
CREATE POLICY "Users can view own quiz attempts" ON public.quiz_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz attempts" ON public.quiz_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);