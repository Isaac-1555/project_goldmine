# Quick Supabase Setup (5 minutes)

## Step 1: Create Supabase Project (2 minutes)

1. Go to **[supabase.com](https://supabase.com)** and sign up/login
2. Click **"New Project"**
3. Fill in:
   - **Name**: `summarease`
   - **Database Password**: Generate a strong password (SAVE THIS!)
   - **Region**: Choose closest to you
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

## Step 2: Get Your Credentials (30 seconds)

1. In your project dashboard, go to **Settings** → **API**
2. Copy these two values:
   - **Project URL** (like: `https://abcdefgh.supabase.co`)
   - **Anon public key** (long string starting with `eyJhbGciOiJIUzI1NiIs...`)

## Step 3: Update Your .env File (30 seconds)

Replace the placeholder values in your `.env` file:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GEMINI_API_KEY=placeholder-key
```

## Step 4: Set Up Database (2 minutes)

1. In Supabase dashboard, go to **SQL Editor**
2. Copy the entire content from `supabase/migrations/001_initial_schema.sql`
3. Paste it and click **"Run"**
4. Repeat for `002_row_level_security.sql` and `003_functions_and_triggers.sql`

## Step 5: Test It! (30 seconds)

1. Save your `.env` file
2. Restart your dev server: `npm run dev`
3. Try creating an account - it should work!

## That's it! 🎉

Your SummarEase app now has:
- ✅ Real authentication
- ✅ Complete database
- ✅ Secure user data isolation
- ✅ Ready for file uploads

**Next**: Start building the file upload features!