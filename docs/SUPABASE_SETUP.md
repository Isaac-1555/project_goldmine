# Supabase Setup Guide for SummarEase

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Fill in project details:
   - **Name**: `summarease` (or your preferred name)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your location
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 3: Update Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

## Step 4: Set Up the Database Schema

### Option A: Using Supabase Dashboard (Recommended)

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of each migration file in order:

   **First, run:** `supabase/migrations/001_initial_schema.sql`
   - This creates all the tables (users, files, summaries, etc.)
   
   **Then run:** `supabase/migrations/002_row_level_security.sql`
   - This sets up security policies so users can only access their own data
   
   **Finally run:** `supabase/migrations/003_functions_and_triggers.sql`
   - This creates helper functions and triggers

3. Click "Run" after pasting each file

### Option B: Using Supabase CLI (Advanced)

If you have the Supabase CLI installed:

```bash
# Initialize Supabase in your project
supabase init

# Link to your remote project
supabase link --project-ref your-project-id

# Push migrations
supabase db push
```

## Step 5: Set Up Storage

1. In Supabase dashboard, go to **Storage**
2. Go to **SQL Editor** and run the contents of `supabase/storage.sql`
3. This creates a "files" bucket for storing uploaded documents and audio files

## Step 6: Configure Authentication

1. In Supabase dashboard, go to **Authentication** → **Settings**
2. Under **Site URL**, add your development URL: `http://localhost:5173`
3. Under **Redirect URLs**, add: `http://localhost:5173/**`
4. Save the configuration

## Step 7: Test the Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:5173`
3. Try creating a new account
4. Check if you can log in successfully

## Verification Checklist

- [ ] Project created on Supabase
- [ ] Environment variables updated in `.env`
- [ ] All 3 migration files executed successfully
- [ ] Storage bucket created with policies
- [ ] Authentication URLs configured
- [ ] App runs without errors
- [ ] Can create new user account
- [ ] Can log in and see dashboard

## Troubleshooting

### Common Issues:

1. **"Invalid API key"**: Double-check your environment variables
2. **"Schema not found"**: Make sure all migration files ran successfully
3. **"Access denied"**: Check that RLS policies were created properly
4. **"Storage bucket not found"**: Run the storage.sql script

### Getting Help:

- Check the browser console for error messages
- Verify in Supabase dashboard that tables were created
- Test authentication in Supabase Auth panel

## Next Steps

Once Supabase is set up, you can:

1. **Test user registration/login** - Should work immediately
2. **Start Phase 2** - File upload and processing features
3. **Add AI integration** - Connect Gemini API for summarization
4. **Build study tools** - Flashcards and quizzes

Your SummarEase app is now ready for full development! 🚀