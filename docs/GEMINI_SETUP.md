# Gemini API Setup Guide

## Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated API key

## Step 2: Update Environment Variables

Add your Gemini API key to your `.env` file:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

## Step 3: Deploy Supabase Edge Function

### Option A: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-id
   ```

4. **Set environment variables for the function**:
   ```bash
   supabase secrets set GEMINI_API_KEY=your-gemini-api-key-here
   ```

5. **Deploy the function**:
   ```bash
   supabase functions deploy process-file
   ```

### Option B: Manual Deployment

1. In your Supabase dashboard, go to **Edge Functions**
2. Click **"New Function"**
3. Name it `process-file`
4. Copy the content from `supabase/functions/process-file/index.ts`
5. Set environment variables in the function settings:
   - `GEMINI_API_KEY`: Your Gemini API key

## Step 4: Test the Integration

1. **Upload a file** or **record audio** in your app
2. **Check the browser console** for processing logs
3. **Verify in Supabase**:
   - Files table should show status changing from "processing" to "completed"
   - Transcripts table should have the extracted text
   - Summaries table should have the AI-generated summary
   - Tags should be created and linked

## Troubleshooting

### Common Issues:

1. **"Function not found"**: Make sure the function is deployed correctly
2. **"API key invalid"**: Double-check your Gemini API key
3. **"Permission denied"**: Ensure environment variables are set in Supabase
4. **"Processing failed"**: Check the function logs in Supabase dashboard

### Function Logs:

- Go to **Edge Functions** → **process-file** → **Logs** in Supabase dashboard
- Check for error messages and debug information

## What the Function Does:

1. **Audio Files**: Transcribes using Gemini API
2. **PDF/DOCX Files**: Extracts text (placeholder for now)
3. **Generates Summary**: Creates intelligent summary using Gemini
4. **Extracts Tags**: Identifies 3-7 relevant keywords
5. **Updates Database**: Saves transcript, summary, and tags
6. **Updates Status**: Changes file status to "completed" or "failed"

## Next Steps:

Once the function is working:
- Files will be automatically processed after upload
- Users can view summaries and transcripts
- Tags enable knowledge graph connections
- Ready for Phase 3: Content Management!