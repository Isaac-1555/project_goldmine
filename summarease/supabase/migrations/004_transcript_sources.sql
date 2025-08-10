-- Add source tracking to transcripts table
ALTER TABLE transcripts 
ADD COLUMN source_type VARCHAR(20) DEFAULT 'audio',
ADD COLUMN source_name VARCHAR(255);

-- Add comment to explain the source types
COMMENT ON COLUMN transcripts.source_type IS 'Type of source: audio, document, notes';
COMMENT ON COLUMN transcripts.source_name IS 'Name of the source file (for documents)';

-- Update file_type enum to include mixed content
-- Note: In production, you might need to handle this differently depending on your PostgreSQL version
-- This is a simplified approach for development