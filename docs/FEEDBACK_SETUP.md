# Feedback System Setup Guide

This guide will help you set up the free feedback system using Gmail SMTP and Supabase Edge Functions.

## Overview

The feedback system allows users to submit feedback directly from the Settings tab. Feedback is sent to your email via Gmail's SMTP server using a Supabase Edge Function (serverless).

**Cost:** 100% FREE
- Gmail SMTP is free for personal use
- Supabase Edge Functions have a generous free tier (2M invocations/month)

## Prerequisites

1. A Gmail account
2. Supabase project
3. Supabase CLI installed (for deploying Edge Functions)

## Step 1: Generate Gmail App Password

Since Gmail requires app-specific passwords for third-party applications:

1. **Enable 2-Factor Authentication** on your Gmail account:
   - Go to: https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Create an App Password**:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "SummarEase Feedback"
   - Click "Generate"
   - **Copy the 16-character password** (you'll need this in Step 3)

## Step 2: Configure Environment Variables

### Local Development (.env file)

Add the following to your `.env` file:

```bash
VITE_FEEDBACK_EMAIL=your-email@gmail.com
```

This is the email address where you want to receive feedback.

## Step 3: Deploy Supabase Edge Function

### Install Supabase CLI (if not already installed)

```bash
# macOS
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

### Login to Supabase

```bash
supabase login
```

### Link Your Project

```bash
# Run this from your project root
supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in your Supabase dashboard URL:
`https://app.supabase.com/project/YOUR_PROJECT_REF`

### Set Secrets

Set the Gmail credentials as secrets in your Supabase project:

```bash
# Your Gmail address
supabase secrets set GMAIL_USER=your-email@gmail.com

# The 16-character app password from Step 1
supabase secrets set GMAIL_APP_PASSWORD=your-app-password-here

# Where to send feedback (same as VITE_FEEDBACK_EMAIL)
supabase secrets set FEEDBACK_EMAIL=your-email@gmail.com
```

### Deploy the Edge Function

```bash
# Deploy the send-feedback function
supabase functions deploy send-feedback
```

You should see output like:
```
Function deployed successfully
URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-feedback
```

## Step 4: Test the Function

You can test the deployed function using curl:

```bash
curl -i --location --request POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-feedback' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"message":"Test feedback","category":"General"}'
```

You should receive a test email!

## Step 5: Update Your App

Make sure your `.env` file has:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_FEEDBACK_EMAIL=your-email@gmail.com
```

## Usage

Users can now:
1. Go to the Settings tab
2. Scroll to the "Feedback & Support" section
3. Click "Send Feedback"
4. Fill out the form (category, message, optional email)
5. Click "Send Feedback"

You'll receive an email with:
- Category (Bug Report, Feature Request, etc.)
- User's message
- User's email (if provided)
- Timestamp

## Troubleshooting

### "Email service not configured" error

**Solution:** Make sure you've set all three secrets:
```bash
supabase secrets list
```

Should show:
- GMAIL_USER
- GMAIL_APP_PASSWORD
- FEEDBACK_EMAIL

### Emails not being received

1. **Check spam folder** - first emails from new senders sometimes go to spam
2. **Verify app password** - make sure you copied the 16-character password correctly
3. **Check function logs**:
   ```bash
   supabase functions logs send-feedback
   ```

### "Authentication failed" error

**Solution:** Regenerate your Gmail App Password:
- Delete the old app password at https://myaccount.google.com/apppasswords
- Create a new one
- Update the secret: `supabase secrets set GMAIL_APP_PASSWORD=new-password`

### CORS errors

The function already includes CORS headers for all origins. If you're still seeing CORS errors:
- Make sure the function is deployed successfully
- Check that your Supabase project is active
- Verify the function URL in your browser's network tab

## Monitoring

### View Function Logs

```bash
# Real-time logs
supabase functions logs send-feedback --follow

# Recent logs
supabase functions logs send-feedback
```

### Usage Stats

Check your Supabase dashboard:
1. Go to Edge Functions section
2. Click on "send-feedback"
3. View invocation count and performance metrics

## Cost Estimate

With the free tier:
- **Supabase Edge Functions:** 2M invocations/month (free)
- **Gmail SMTP:** Unlimited for personal use (free)

Even with 100 feedback submissions per day, you'll use only ~3,000 invocations/month, well within the free tier!

## Security Notes

1. **Secrets are secure:** Gmail credentials are stored as Supabase secrets, not in your codebase
2. **CORS protection:** The function accepts requests from any origin, but you can restrict this if needed
3. **Rate limiting:** Consider adding rate limiting if you're worried about spam
4. **Input validation:** The function validates required fields (message, category)

## Updating the Function

If you need to modify the function:

1. Edit `supabase/functions/send-feedback/index.ts`
2. Deploy the updated version:
   ```bash
   supabase functions deploy send-feedback
   ```

## Need Help?

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Gmail App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
