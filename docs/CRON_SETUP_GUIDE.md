# 🕐 Cron Job Setup Guide - Trial Expiration

## ✅ What's Already Done

1. **Edge Function Created:** `supabase/functions/expire-trials/index.ts`
2. **Edge Function Deployed:** Available at your Supabase project
3. **GitHub Actions Workflow:** `.github/workflows/expire-trials-cron.yml`

The Edge Function is already working! Test results:
```json
{
  "message": "No expired trials found",
  "expired_count": 0,
  "timestamp": "2025-10-10T21:41:43.091Z"
}
```

---

## 🚀 Setup Instructions

### Option 1: GitHub Actions (Recommended)

This is the **easiest and most reliable** method. It's free, runs automatically, and provides logs.

#### Step 1: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add these two secrets:

**Secret 1:**
- Name: `SUPABASE_URL`
- Value: `https://YOUR_PROJECT_REF.supabase.co`

**Secret 2:**
- Name: `SUPABASE_ANON_KEY`
- Value: `REPLACE_WITH_NEW_SUPABASE_ANON_KEY`

#### Step 2: Commit and Push the Workflow

```bash
cd /Users/user/dev/project_goldmine/summarease
git add .github/workflows/expire-trials-cron.yml
git commit -m "Add cron job for trial expiration"
git push
```

#### Step 3: Test the Workflow

1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Click on **"Expire Trials Daily"** workflow
4. Click **"Run workflow"** → **"Run workflow"**
5. Wait a few seconds and check the results

The workflow will now automatically run **every day at midnight UTC**!

---

### Option 2: cron-job.org (Alternative)

If you prefer an external service:

1. Go to [cron-job.org](https://cron-job.org)
2. Create a free account
3. Create a new cron job:
   - **Title:** Expire Trials
   - **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-trials`
   - **Schedule:** Every day at 00:00
   - **HTTP Method:** POST
   - **Headers:** Add header
     - Key: `Authorization`
     - Value: `Bearer REPLACE_WITH_NEW_SUPABASE_ANON_KEY`

---

### Option 3: Supabase pg_cron (If Available)

If your Supabase plan supports pg_cron:

1. Go to Supabase Dashboard → Database → Extensions
2. Enable the `pg_cron` extension
3. Run this SQL in the SQL Editor:

```sql
-- Schedule the function to run daily at midnight
SELECT cron.schedule(
  'expire-trials-daily',
  '0 0 * * *',
  $$ 
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-trials',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer REPLACE_WITH_NEW_SUPABASE_ANON_KEY'
    )
  );
  $$
);

-- Check scheduled jobs
SELECT * FROM cron.job;
```

**Note:** pg_cron is only available on paid Supabase plans.

---

## 🧪 Testing the Cron Job

### Manual Test via Terminal

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-trials' \
  -H 'Authorization: Bearer REPLACE_WITH_NEW_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json'
```

Expected response:
```json
{
  "message": "No expired trials found",
  "expired_count": 0,
  "timestamp": "2025-10-10T21:41:43.091Z"
}
```

### Create a Test Trial and Expire It

1. **Create a test user with an expired trial:**

```sql
-- In Supabase SQL Editor
-- First, create or use an existing test user
INSERT INTO subscriptions (
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  status,
  trial_start,
  trial_end,
  current_period_end
) VALUES (
  'YOUR_TEST_USER_ID', -- Replace with actual user ID
  '',
  '',
  'trialing',
  NOW() - INTERVAL '31 days',
  NOW() - INTERVAL '1 day', -- Already expired
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (user_id) DO UPDATE SET
  status = 'trialing',
  trial_start = NOW() - INTERVAL '31 days',
  trial_end = NOW() - INTERVAL '1 day',
  current_period_end = NOW() - INTERVAL '1 day';
```

2. **Call the Edge Function:**

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-trials' \
  -H 'Authorization: Bearer REPLACE_WITH_NEW_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json'
```

Expected response:
```json
{
  "message": "Successfully expired trials",
  "expired_count": 1,
  "expired_trials": [...],
  "timestamp": "2025-10-10T21:42:00.000Z"
}
```

3. **Verify the status changed:**

```sql
SELECT * FROM subscriptions WHERE user_id = 'YOUR_TEST_USER_ID';
-- Status should now be 'canceled'
```

---

## 📊 Monitoring

### View Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions**
3. Click on **expire-trials**
4. View the **Logs** tab

You'll see logs like:
```
🔍 Checking for expired trials...
📊 Found 0 expired trial(s)
```

or

```
🔍 Checking for expired trials...
📊 Found 2 expired trial(s)
✅ Successfully expired 2 trial(s)
  - User abc123: trial ended 2025-10-09T00:00:00Z
  - User def456: trial ended 2025-10-08T00:00:00Z
```

### View GitHub Actions Logs (if using GitHub Actions)

1. Go to your GitHub repository
2. Navigate to **Actions** tab
3. Click on any workflow run
4. View the logs for each step

---

## ⚙️ Configuration

### Change the Schedule

Edit `.github/workflows/expire-trials-cron.yml`:

```yaml
on:
  schedule:
    # Run twice daily at 00:00 and 12:00 UTC
    - cron: '0 0,12 * * *'
```

Common cron schedules:
- `0 0 * * *` - Daily at midnight UTC
- `0 */12 * * *` - Every 12 hours
- `0 0 * * 0` - Every Sunday at midnight
- `0 1 * * *` - Daily at 1:00 AM UTC

### Add Email Notifications (GitHub Actions)

Add this step to the workflow:

```yaml
- name: Send email on failure
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.EMAIL_USERNAME }}
    password: ${{ secrets.EMAIL_PASSWORD }}
    subject: Trial Expiration Failed
    body: Failed to expire trials. Check GitHub Actions logs.
    to: your-email@example.com
    from: noreply@yourapp.com
```

---

## 🔒 Security Notes

1. **The SUPABASE_ANON_KEY is safe to use in GitHub Actions** because:
   - It's meant to be public (used in frontend)
   - Row Level Security (RLS) protects your data
   - Edge Function requires authorization header

2. **The Edge Function has authorization check** to prevent unauthorized access

3. **Service Role Key is never exposed** - it's only used inside the Edge Function on Supabase

---

## ✅ Verification Checklist

After setup:
- [ ] Edge Function deployed successfully
- [ ] GitHub secrets configured (if using GitHub Actions)
- [ ] Workflow file committed and pushed
- [ ] Manual test completed successfully
- [ ] Created test trial and verified expiration works
- [ ] Checked logs in Supabase Dashboard
- [ ] Verified automatic schedule is set

---

## 🆘 Troubleshooting

### Edge Function returns 401 Unauthorized
- Check that Authorization header is included
- Verify the SUPABASE_ANON_KEY is correct

### Edge Function returns 500 Internal Server Error
- Check Edge Function logs in Supabase Dashboard
- Verify SUPABASE_SERVICE_ROLE_KEY is set in Supabase
- Check database permissions

### GitHub Actions not running
- Verify GitHub secrets are set correctly
- Check that workflow file is in `.github/workflows/`
- Ensure you've pushed the workflow file to GitHub
- Check Actions tab for error messages

### Trials not expiring
- Check Edge Function logs for errors
- Verify the trial_end dates are in the past
- Ensure stripe_subscription_id is empty for test trials
- Run a manual test with a known expired trial

---

## 📝 Summary

✅ **Edge Function deployed and working**  
✅ **GitHub Actions workflow created**  
✅ **Ready to automate trial expiration**  

**Next Step:** Add GitHub secrets and push the workflow to enable automatic daily trial expiration!

**Test command:**
```bash
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/expire-trials' \
  -H 'Authorization: Bearer REPLACE_WITH_NEW_SUPABASE_ANON_KEY' \
  -H 'Content-Type: application/json'
```
