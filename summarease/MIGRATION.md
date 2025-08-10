# Database Migration Guide

This document contains the SQL migrations needed to update your Supabase database for the new Notebook functionality.

## Migration 004: Add Transcript Source Tracking

Run this SQL in your Supabase SQL Editor:

```sql
-- Add source tracking to transcripts table
ALTER TABLE transcripts 
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'audio',
ADD COLUMN IF NOT EXISTS source_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS audio_file_path TEXT;

-- Add comment to explain the source types
COMMENT ON COLUMN transcripts.source_type IS 'Type of source: audio, document, notes';
COMMENT ON COLUMN transcripts.source_name IS 'Name of the source file (for documents)';
COMMENT ON COLUMN transcripts.duration IS 'Recording duration in seconds';
COMMENT ON COLUMN transcripts.audio_file_path IS 'Path to audio file if stored';
```

## Migration 005: Create Separate Content Type Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Create separate tables for different content types

-- Notes table for user-written notes
```

## How to Apply These Migrations

1. **Open Supabase Dashboard**
   - Go to your project dashboard at https://supabase.com/dashboard

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run Migration 004**
   - Copy the Migration 004 SQL code above
   - Paste it into a new query
   - Click "Run" to execute

4. **Run Migration 005**
   - Copy the Migration 005 SQL code above
   - Paste it into a new query
   - Click "Run" to execute

5. **Verify Tables Created**
   - Go to "Table Editor" in the left sidebar
   - You should see the new `notes` and `documents` tables
   - Check that the `transcripts` table has the new columns

## What These Migrations Do

### Migration 004:
- Adds source tracking to the existing `transcripts` table
- Allows us to know if a transcript came from audio, document, or notes
- Adds duration tracking for audio recordings
- Adds optional audio file path storage

### Migration 005:
- Creates a `notes` table for rich text user notes
- Creates a `documents` table for uploaded files and their extracted content
- Sets up proper indexes for performance
- Configures Row Level Security (RLS) policies for data protection
- Ensures users can only access their own content

## After Migration

Once you've run these migrations, the new Notebook functionality will work properly:

- ✅ Audio recordings with transcripts
- ✅ Rich text note-taking
- ✅ Document uploads with text extraction
- ✅ Unified content saving under one notebook title
- ✅ Separate content type display in the View tab

## Troubleshooting

If you encounter any errors:

1. **Permission Errors**: Make sure you're running the SQL as a database admin
2. **Table Already Exists**: The `IF NOT EXISTS` clauses should handle this, but you can ignore these errors
3. **RLS Errors**: If RLS policies fail, you can skip them and add them later through the Supabase dashboard

## Rollback (if needed)

If you need to rollback these changes:

```sql
-- Remove new tables (WARNING: This will delete all data)
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS notes CASCADE;

-- Remove new columns from transcripts
ALTER TABLE transcripts 
DROP COLUMN IF EXISTS source_type,
DROP COLUMN IF EXISTS source_name,
DROP COLUMN IF EXISTS duration,
DROP COLUMN IF EXISTS audio_file_path;
```

**⚠️ Warning**: The rollback will permanently delete all notebook data. Only use if absolutely necessary.