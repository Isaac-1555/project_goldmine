-- Create separate tables for different content types

-- Notes table for user-written notes
CREATE TABLE IF NOT EXISTS notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    html_content TEXT, -- Store rich text HTML
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table for uploaded files with their extracted content
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- pdf, docx, etc.
    storage_path TEXT NOT NULL,
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update transcripts table to be more specific for audio
ALTER TABLE transcripts 
ADD COLUMN IF NOT EXISTS duration INTEGER, -- Recording duration in seconds
ADD COLUMN IF NOT EXISTS audio_file_path TEXT; -- Path to audio file if stored

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_file_id ON notes(file_id);
CREATE INDEX IF NOT EXISTS idx_documents_file_id ON documents(file_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_file_id ON transcripts(file_id);

-- Add RLS policies
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Notes policies
CREATE POLICY "Users can view their own notes" ON notes
    FOR SELECT USING (
        file_id IN (
            SELECT id FROM files WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own notes" ON notes
    FOR INSERT WITH CHECK (
        file_id IN (
            SELECT id FROM files WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own notes" ON notes
    FOR UPDATE USING (
        file_id IN (
            SELECT id FROM files WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own notes" ON notes
    FOR DELETE USING (
        file_id IN (
            SELECT id FROM files WHERE user_id = auth.uid()
        )
    );

-- Documents policies
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (
        file_id IN (
            SELECT id FROM files WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own documents" ON documents
    FOR INSERT WITH CHECK (
        file_id IN (
            SELECT id FROM files WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (
        file_id IN (
            SELECT id FROM files WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own documents" ON documents
    FOR DELETE USING (
        file_id IN (
            SELECT id FROM files WHERE user_id = auth.uid()
        )
    );