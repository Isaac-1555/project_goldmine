# Deploy Edge Functions to Supabase

The file processing functionality requires deploying the edge function to Supabase. Here's how to do it:

## Option 1: Deploy via Supabase CLI (Recommended)

### Prerequisites
1. Install Supabase CLI:
```bash
npm install -g @supabase/cli
```

2. Login to Supabase:
```bash
supabase login
```

### Deploy the Function
1. Link your project (replace `your-project-ref` with your actual project ID):
```bash
supabase link --project-ref your-project-ref
```

2. Deploy the edge function:
```bash
supabase functions deploy process-file
```

3. Set environment variables for the edge function:
```bash
supabase secrets set GEMINI_API_KEY=your_actual_gemini_api_key
supabase secrets set SUPABASE_URL=your_supabase_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Option 2: Deploy via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions**
3. Click **"Create Function"**
4. Name: `process-file`
5. Copy the content from `supabase/functions/process-file/index.ts`
6. Click **"Deploy Function"**
7. Go to **Settings** → **Environment Variables** and add:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL` 
   - `SUPABASE_SERVICE_ROLE_KEY`

## Getting Your Service Role Key

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the **service_role** key (NOT the anon key)
3. This key has elevated permissions for server-side operations

## Verify Deployment

After deployment, test by uploading a DOCX file. Check the Function Logs in your Supabase dashboard to see if the processing is working.

## Troubleshooting

- **Function not found**: Make sure it's deployed with the exact name `process-file`
- **Environment variables**: Verify all secrets are set correctly
- **Permissions**: Ensure you're using the service_role key, not anon key