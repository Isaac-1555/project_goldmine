# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**SummarEase** is a React-based web application that helps students and professionals capture information through audio recording and document uploads, using AI (Google Gemini) to generate summaries, flashcards, quizzes, and a connected knowledge graph.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL database, Edge Functions, Storage, Auth)
- **AI Services**: Google Gemini API for transcription, summarization, and content generation
- **Payments**: Polar.sh (Merchant of Record for subscriptions and billing)
- **UI Libraries**: Radix UI components, Framer Motion, Lucide React icons

## Development Commands

### Primary Commands
```bash
# Start development server
cd summarease && npm run dev

# Build for production
cd summarease && npm run build

# Run linting
cd summarease && npm run lint

# Preview production build
cd summarease && npm run preview
```

### Database Operations
```bash
# Connect to Supabase project (requires Supabase CLI)
cd summarease && supabase link --project-ref your-project-ref

# Apply database migrations
cd summarease && supabase db push

# Generate TypeScript types from database
cd summarease && supabase gen types typescript --local > src/lib/database.types.ts
```

### Edge Function Operations
```bash
# Deploy Edge Functions to Supabase
cd summarease && supabase functions deploy process-file
cd summarease && supabase functions deploy polar-webhooks  # For Polar.sh integration

# Test Edge Functions locally
cd summarease && supabase functions serve

# View Edge Function logs
# Use Supabase Dashboard → Edge Functions → [function-name] → Logs
```

## Architecture Overview

### Core Structure
- **Main App**: React SPA with routing, authentication provider
- **Layout System**: Three-panel layout (LeftSidebar, MainContent, RightSidebar)
- **Processing Pipeline**: Upload → Supabase Storage → Edge Function → Gemini API → Database
- **Database**: PostgreSQL with tables for users, files, transcripts, summaries, tags, flashcards, quizzes

### Key Components
- **Authentication**: Supabase Auth with AuthProvider context
- **File Management**: Upload via drag/drop or file picker, audio recording interface
- **AI Processing**: Serverless Edge Function (`process-file`) handles Gemini API integration
- **Content Organization**: Files can be organized into folders, tagged automatically
- **Study Tools**: Generated flashcards and quizzes from summaries

### Database Schema (Important Tables)
- `files`: Central table for all uploaded content (audio, PDF, DOCX)
- `transcripts`: Raw extracted/transcribed text from files
- `summaries`: AI-generated summaries (user-editable)
- `tags`: Automatically extracted keywords for content linking
- `flashcards`: Study materials generated from summaries
- `quizzes`: Interactive quizzes with multiple choice questions
- `subscriptions`: User subscription status managed via Polar.sh webhooks
- `customers`: Payment customer records linked to Polar.sh
- `payment_history`: Historical payment records from Polar.sh

## Setup Requirements

### Environment Variables (.env)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-key  # Optional for client-side processing
VITE_POLAR_ORGANIZATION_ID=your-polar-org-id  # For Polar.sh billing
VITE_POLAR_PRODUCT_ID=your-polar-product-id  # For Polar.sh billing
```

### Supabase Setup
1. **Database**: Run migrations in order starting from `001_initial_schema.sql`
2. **Storage**: Create 'files' bucket with proper policies
3. **Edge Functions**: Deploy Edge Functions with required secrets (Gemini API key, etc.)
4. **Authentication**: Configure site URL and redirect URLs for local development
5. **Subscriptions**: Polar.sh webhooks update subscription status automatically

## Development Workflow

### Adding New Features
1. **Frontend**: Create components in `src/components/[FeatureName]/`
2. **Backend**: Add Edge Functions in `supabase/functions/`
3. **Database**: Add migrations in `supabase/migrations/`
4. **API Layer**: Update `src/lib/api.ts` for new endpoints

### File Processing Flow
1. User uploads file or records audio → `FileUpload.tsx` or `AudioRecorder.tsx`
2. File saved to Supabase Storage → Database record created with 'processing' status
3. Edge Function triggered → Gemini API processes content
4. Results saved to database → Status updated to 'completed'
5. Frontend refreshes to show processed content

### Database Functions
- `get_user_files_with_metadata`: Returns user's files with summaries and tags
- `get_knowledge_graph_data`: Returns data for knowledge graph visualization

## Common Development Tasks

### Testing File Upload
```bash
# Check if files appear in Supabase Storage bucket 'files'
# Verify database record created in 'files' table
# Monitor Edge Function logs for processing activity
```

### Debugging AI Processing
```bash
# Check Edge Function logs in Supabase Dashboard
# Verify Gemini API key is set as Supabase secret
# Test with small files first (PDFs under 1MB, short audio clips)
```

### Adding New File Types
1. Update `FileWithMetadata` interface in `src/lib/api.ts`
2. Add processing logic in `supabase/functions/process-file/index.ts`
3. Update file validation in `FileUpload.tsx`
4. Add database migration for new file type enum

## Important Implementation Notes

### AI Processing Strategy
- **Client-side fallback**: Document processing can work without Edge Functions for development
- **Retry mechanism**: Edge Functions include retry logic for Gemini API failures
- **Status tracking**: Files have processing states (processing/completed/failed)

### Authentication & Security
- Row Level Security (RLS) policies ensure users only access their own data
- All API calls require authentication through Supabase Auth
- File storage paths include user ID for isolation

### Performance Considerations
- Files cached in browser for faster access
- Optimistic UI updates while processing in background
- Pagination not yet implemented (consider for large file collections)

## Development Gotchas

### Supabase Edge Functions
- Must be deployed to work with Gemini API (local development limited)
- Require environment variables set as Supabase secrets
- CORS headers required for frontend communication

### File Processing
- Large files (>10MB) may timeout - implement chunking if needed
- Audio files require specific format handling (WebM for recordings)
- PDF/DOCX processing relies on Gemini vision/text capabilities

### Database Migrations
- Run migrations in exact order (001, 002, 003)
- RLS policies critical for data security
- Functions and triggers must be created after tables

## Useful Resources

### Setup Guides
- `QUICK_SUPABASE_SETUP.md`: 5-minute setup guide
- `GEMINI_SETUP.md`: AI processing configuration
- `DEBUG_CHECKLIST.md`: Common issues and solutions

### Documentation Files
- `docs/Database_Schema_Summarease.md`: Complete database schema
- `docs/System_Architecture_Summarease.md`: Technical architecture overview
- `docs/PRD_Summarease.md`: Product requirements and features

### Phase Completion Status
- ✅ **Phase 1**: Authentication and basic UI
- ✅ **Phase 2**: File upload and AI processing 
- 🚧 **Phase 3**: Content management (next priority)
- 🚧 **Phase 5**: RAG chat assistant
- 🚧 **Phase 6**: Knowledge graph visualization
