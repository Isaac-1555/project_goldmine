# 🔐 Environment Variables Setup Guide

This document details all environment variables required for the Sat-Brain application across different environments.

## 📋 Table of Contents

- [Current Environment Variables](#current-environment-variables)
- [Setting Up Locally](#setting-up-locally)
- [Production Environment](#production-environment)
- [Future: Clerk Integration](#future-clerk-integration)
- [Security Best Practices](#security-best-practices)

---

## Current Environment Variables

### Required Variables

| Variable | Type | Description | Required | Example |
|----------|------|-------------|----------|---------|
| `VITE_SUPABASE_URL` | Public | Supabase project URL | ✅ Yes | `https://abcdefghij.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public | Supabase anonymous key | ✅ Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_GEMINI_API_KEY` | Public | Google Gemini API key for AI features | ✅ Yes | `AIzaSyC-abcdefghijklmnopqrstuvwxyz` |
| `VITE_FEEDBACK_EMAIL` | Public | Email for user feedback | ✅ Yes | `feedback@example.com` |

**Note:** Variables prefixed with `VITE_` are exposed to the client-side code and bundled into the build. Do NOT put sensitive backend-only secrets with this prefix.

---

## Setting Up Locally

### Step 1: Copy Example File

```bash
cd summarease
cp .env.example .env
```

### Step 2: Fill In Values

Edit the `.env` file with your actual values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google Gemini AI
VITE_GEMINI_API_KEY=your-gemini-api-key

# Application Configuration
VITE_FEEDBACK_EMAIL=your-email@example.com
```

### Step 3: Get Your API Keys

#### Supabase Keys

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

#### Google Gemini API Key

1. Go to https://ai.google.dev/
2. Click "Get API Key"
3. Create a new API key in Google AI Studio
4. Copy the key → `VITE_GEMINI_API_KEY`

**Important:** Keep your `.env` file private and never commit it to Git!

---

## Production Environment

### Vercel Environment Variables

In your Vercel project dashboard (Settings → Environment Variables), add all variables for each environment:

#### Production Environment
```
VITE_SUPABASE_URL = <production-supabase-url>
VITE_SUPABASE_ANON_KEY = <production-anon-key>
VITE_GEMINI_API_KEY = <gemini-api-key>
VITE_FEEDBACK_EMAIL = <production-email>
```

#### Preview Environment (Optional: Use same as production initially)
```
VITE_SUPABASE_URL = <preview-supabase-url>
VITE_SUPABASE_ANON_KEY = <preview-anon-key>
VITE_GEMINI_API_KEY = <gemini-api-key>
VITE_FEEDBACK_EMAIL = <preview-email>
```

#### Development Environment
```
VITE_SUPABASE_URL = <dev-supabase-url>
VITE_SUPABASE_ANON_KEY = <dev-anon-key>
VITE_GEMINI_API_KEY = <gemini-api-key>
VITE_FEEDBACK_EMAIL = <dev-email>
```

### GitHub Secrets

For CI/CD workflows, add these to GitHub repository secrets:

```
VERCEL_TOKEN = <your-vercel-token>
VERCEL_ORG_ID = <your-vercel-org-id>
VERCEL_PROJECT_ID = <your-vercel-project-id>
VITE_SUPABASE_URL = <supabase-url>
VITE_SUPABASE_ANON_KEY = <supabase-anon-key>
VITE_GEMINI_API_KEY = <gemini-api-key>
VITE_FEEDBACK_EMAIL = <feedback-email>
```

---

## Future: Clerk Integration

When adding Clerk for authentication and payments, you'll need these additional variables:

### Clerk Environment Variables

#### Public (Client-side)
```env
# Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
VITE_CLERK_SIGN_IN_URL=/sign-in
VITE_CLERK_SIGN_UP_URL=/sign-up
VITE_CLERK_AFTER_SIGN_IN_URL=/dashboard
VITE_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

#### Private (Server-side only)
```env
# DO NOT prefix these with VITE_ - they should NOT be exposed to client
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Stripe Integration (For Payments)
```env
# Public
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx

# Private (Server-side only)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Updated Application Structure

When implementing payments, you'll create serverless functions:

```
summarease/
├── api/                        # Vercel serverless functions
│   ├── webhooks/
│   │   ├── clerk.ts           # Clerk webhook handler
│   │   └── stripe.ts          # Stripe webhook handler
│   ├── user/
│   │   ├── subscription.ts    # Get user subscription status
│   │   └── usage.ts           # Track API usage
│   └── payments/
│       ├── create-checkout.ts # Create payment session
│       └── manage-billing.ts  # Billing portal access
```

### Environment-Specific Configuration

Create `.env.production` for production-specific values:

```env
# Production Clerk Keys
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxx

# Production Stripe Keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Security Best Practices

### ✅ DO

- Use separate Supabase projects for dev/staging/production
- Rotate API keys regularly
- Use Vercel's "Sensitive" flag for secret values
- Store secrets in environment variables, never in code
- Use separate Stripe accounts for test and live modes
- Implement rate limiting on API endpoints
- Monitor API usage and set up alerts
- Use Row Level Security (RLS) in Supabase

### ❌ DON'T

- Commit `.env` files to Git
- Share API keys in plain text (email, chat, etc.)
- Use production keys in development
- Prefix backend-only secrets with `VITE_`
- Hardcode API keys in source code
- Use the same keys across all environments
- Log or console.log sensitive values
- Store secrets in client-side code

### Git Security

Ensure your `.gitignore` includes:

```gitignore
# Environment variables
.env
.env.local
.env.production
.env.development

# Vercel
.vercel

# Supabase
**/supabase/.temp
```

### Environment Variable Validation

Consider adding runtime validation in your app:

```typescript
// src/lib/env.ts
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_GEMINI_API_KEY',
  'VITE_FEEDBACK_EMAIL',
] as const;

export function validateEnv() {
  const missing = requiredEnvVars.filter(
    (key) => !import.meta.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

// Call this in main.tsx
validateEnv();
```

---

## Troubleshooting

### Environment Variables Not Loading

**Problem:** Variables are undefined in the application

**Solutions:**
1. Ensure variables are prefixed with `VITE_`
2. Restart dev server after changing `.env`
3. Clear Vite cache: `rm -rf node_modules/.vite`
4. Check Vercel deployment logs for missing variables

### Build Fails Due to Missing Variables

**Problem:** Build fails with "undefined" errors

**Solutions:**
1. Add placeholder values in CI workflow for build testing
2. Ensure all required secrets are set in GitHub
3. Check Vercel environment variable configuration
4. Verify variables are set for correct environment (Production/Preview)

### CORS Errors with Supabase

**Problem:** API calls fail with CORS errors

**Solutions:**
1. Add your domain to Supabase allowed origins
2. Check authentication settings
3. Verify RLS policies allow anon access where needed
4. Ensure CORS headers are properly set

---

## Environment Variable Checklist

Before deploying:

- [ ] All required variables are defined in `.env.example`
- [ ] Local `.env` file has all variables
- [ ] Vercel has all variables configured
- [ ] GitHub secrets are set for CI/CD
- [ ] Production uses separate Supabase project
- [ ] No secrets committed to Git
- [ ] `.gitignore` includes `.env` files
- [ ] Variables are validated at runtime
- [ ] Sensitive values marked as "Sensitive" in Vercel

---

## Additional Resources

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/api/securing-your-api)
- [Clerk Environment Variables](https://clerk.com/docs/references/nextjs/available-environment-variables)

---

**Last Updated:** 2025-10-09
**Maintained By:** Project Team
