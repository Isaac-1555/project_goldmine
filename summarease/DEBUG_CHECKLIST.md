# SummarEase Debug Checklist

## 🔍 Common Issues to Check

### 1. **File Upload Issues**
- [ ] Files appear in sidebar after upload?
- [ ] Status shows "processing" initially?
- [ ] Check browser console for upload errors
- [ ] Verify Supabase Storage bucket exists and has proper permissions

### 2. **AI Processing Issues**
- [ ] Edge function deployed successfully?
- [ ] Gemini API key set in Supabase secrets?
- [ ] Check Edge Function logs in Supabase dashboard
- [ ] Files status changing from "processing" to "completed"?

### 3. **Database Issues**
- [ ] All database tables created (files, transcripts, summaries, tags)?
- [ ] RLS policies working correctly?
- [ ] User can see their own data?
- [ ] Check Supabase Table Editor for data

### 4. **Frontend Issues**
- [ ] FileList component loading files?
- [ ] ContentViewer showing selected file content?
- [ ] API calls working (check Network tab)?
- [ ] Authentication working properly?

## 🛠️ Quick Debug Steps

### Step 1: Check Database
1. Go to Supabase Dashboard → Table Editor
2. Check if these tables exist and have data:
   - `files` - Should show uploaded files
   - `transcripts` - Should have extracted text
   - `summaries` - Should have AI summaries
   - `tags` - Should have extracted keywords

### Step 2: Check Edge Function
1. Go to Supabase Dashboard → Edge Functions
2. Click on `process-file` → Logs
3. Look for any error messages or processing logs

### Step 3: Check Browser Console
1. Open Developer Tools (F12)
2. Check Console tab for JavaScript errors
3. Check Network tab for failed API calls

### Step 4: Test File Upload
1. Try uploading a small PDF or recording short audio
2. Watch the sidebar for the file to appear
3. Check if status changes from "processing" to "completed"

## 🚨 Common Error Messages

### "Failed to load files"
- Check if user is authenticated
- Verify RLS policies are set up correctly
- Check if `get_user_files_with_metadata` function exists

### "Processing failed"
- Check Gemini API key is set correctly
- Verify Edge Function is deployed
- Check function logs for specific errors

### "No files appear in sidebar"
- Check if files are being saved to database
- Verify file upload is completing successfully
- Check if FileList component is calling getUserFiles()

## 📋 What to Tell Me

Please let me know:
1. **What specific behavior you're seeing** (or not seeing)
2. **Any error messages** in browser console
3. **What happens when you upload a file**
4. **If files appear in the Supabase database**
5. **If the Edge Function logs show any activity**

This will help me pinpoint the exact issue and fix it quickly!