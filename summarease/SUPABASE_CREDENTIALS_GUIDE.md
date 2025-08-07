# Getting the Correct Supabase Credentials

## ❌ What you found (Database Connection String):
```
postgresql://postgres:[YOUR-PASSWORD]@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```
This is for direct database connections, NOT for your frontend app.

## ✅ What you need (API Credentials):

### Step 1: Go to the Right Place
1. In your Supabase dashboard
2. Click **Settings** (gear icon in sidebar)
3. Click **API** (not Database!)

### Step 2: Copy These Two Values:

**Project URL** (should look like):
```
https://YOUR_PROJECT_REF.supabase.co
```

**Anon public key** (should look like):
```
REPLACE_WITH_NEW_SUPABASE_ANON_KEY
```

### Step 3: Update Your .env File:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=REPLACE_WITH_NEW_SUPABASE_ANON_KEY
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

## 🎯 Quick Fix:
Based on your database URL, your **Project URL** should be:
```
https://YOUR_PROJECT_REF.supabase.co
```

Go get the **Anon key** from Settings → API and you're all set!