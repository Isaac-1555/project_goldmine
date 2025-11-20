# 🚀 Deployment Guide - Sat-Brain

This document provides comprehensive instructions for deploying the Sat-Brain application to Vercel with a complete CI/CD pipeline.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Vercel Setup](#initial-vercel-setup)
- [Environment Variables Configuration](#environment-variables-configuration)
- [GitHub Secrets Setup](#github-secrets-setup)
- [CI/CD Pipeline Overview](#cicd-pipeline-overview)
- [Deployment Process](#deployment-process)
- [Supabase Production Setup](#supabase-production-setup)
- [Post-Deployment Verification](#post-deployment-verification)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ GitHub account with access to this repository
- ✅ Vercel account (sign up at https://vercel.com)
- ✅ Production Supabase project created
- ✅ Google Gemini API key
- ✅ Node.js 18+ installed locally (for testing)

---

## Initial Vercel Setup

### Step 1: Create Vercel Project

1. **Login to Vercel**
   - Go to https://vercel.com
   - Sign in with your GitHub account

2. **Import Project**
   - Click "Add New..." → "Project"
   - Select the `project_goldmine` repository
   - Click "Import"

3. **Configure Project Settings**
   ```
   Framework Preset: Vite
   Root Directory: summarease
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   Node Version: 20.x
   ```

4. **Skip Environment Variables for Now**
   - Click "Deploy" (it will fail, but that's okay)
   - We'll add environment variables next

### Step 2: Get Vercel Project IDs

After project creation:

1. Go to Project Settings → General
2. Copy your **Project ID** (save for GitHub secrets)
3. Go to Account Settings → Tokens
4. Create a new token with full access
5. Copy the **Vercel Token** (save for GitHub secrets)
6. Find your **Organization ID** in the URL or settings

---

## Environment Variables Configuration

### Step 1: Add Variables in Vercel Dashboard

Go to your Vercel project → Settings → Environment Variables

Add the following variables for **Production**, **Preview**, and **Development**:

| Variable Name | Description | Example |
|---------------|-------------|---------|
| `VITE_SUPABASE_URL` | Production Supabase URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Production Supabase anon key | `eyJhbGc...` |
| `VITE_GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `VITE_FEEDBACK_EMAIL` | Contact email for feedback | `your@email.com` |

**Important Notes:**
- Mark sensitive keys as "Sensitive" in Vercel
- Use the same values for all environments initially
- You can differentiate later (e.g., separate preview database)

### Step 2: Verify Environment Variables

1. Go to Deployments in Vercel
2. Click on your latest deployment
3. Check the "Environment Variables" section to ensure they're loaded

---

## GitHub Secrets Setup

To enable CI/CD workflows, add these secrets to your GitHub repository:

### Step 1: Access GitHub Secrets

1. Go to your GitHub repository
2. Navigate to: Settings → Secrets and variables → Actions
3. Click "New repository secret"

### Step 2: Add Required Secrets

Add the following secrets:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `VERCEL_TOKEN` | Your Vercel token | Vercel Account → Settings → Tokens |
| `VERCEL_ORG_ID` | Your Vercel organization ID | Vercel → Account Settings |
| `VERCEL_PROJECT_ID` | Your project ID | Vercel → Project Settings → General |
| `VITE_SUPABASE_URL` | Production Supabase URL | Supabase Project Settings |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Project Settings → API |
| `VITE_GEMINI_API_KEY` | Google Gemini API key | Google AI Studio |
| `VITE_FEEDBACK_EMAIL` | Your contact email | - |

**Tip:** These environment variables are needed for CI builds to succeed.

---

## CI/CD Pipeline Overview

This project uses GitHub Actions for automated deployment:

### Workflows

#### 1. **CI Workflow** (`.github/workflows/ci.yml`)
- **Triggers:** Pull requests and pushes to `main` and `develop`
- **Actions:**
  - Linting with ESLint
  - Type checking with TypeScript
  - Build verification
  - Artifact upload

#### 2. **Vercel Deploy Workflow** (`.github/workflows/vercel-deploy.yml`)
- **Triggers:**
  - **Preview:** Pull requests
  - **Production:** Pushes to `main` branch
- **Actions:**
  - Deploy to Vercel preview (for PRs)
  - Deploy to production (for main branch)
  - Comment PR with preview URL
  - Generate deployment summaries

### Workflow Diagram

```
Pull Request → CI Checks → Preview Deployment → Review → Merge
                                    ↓
Main Branch Push → CI Checks → Production Deployment → Live
```

---

## Deployment Process

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes and Commit**
   ```bash
   git add .
   git commit -m "feat: description of changes"
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request**
   - Go to GitHub and create a PR to `main`
   - CI workflow runs automatically
   - Preview deployment is created
   - Review the preview URL in PR comments

4. **Review and Merge**
   - Review changes in preview environment
   - Request code reviews
   - Once approved, merge to `main`

5. **Production Deployment**
   - Merge triggers automatic production deployment
   - Monitor deployment in GitHub Actions
   - Verify production at your Vercel URL

### Manual Deployment (If Needed)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
cd summarease
vercel

# Deploy to production
vercel --prod
```

---

## Supabase Production Setup

### Step 1: Create Production Project

1. Go to https://supabase.com
2. Create a new project (separate from development)
3. Choose a strong database password
4. Select a region close to your users

### Step 2: Run Database Migrations

Execute migrations in order from `summarease/supabase/migrations/`:

```sql
-- Run these in order through Supabase SQL Editor:
-- 001_initial_schema.sql
-- 002_row_level_security.sql
-- 003_functions_and_triggers.sql
-- ... (continue with all numbered migrations)
```

**Tip:** Use the Supabase CLI for easier migration:
```bash
npm i -g supabase
cd summarease
supabase link --project-ref your-project-ref
supabase db push
```

### Step 3: Configure Storage

1. Go to Storage in Supabase dashboard
2. Create required buckets (check `storage.sql`)
3. Set up CORS for your Vercel domain:
   ```json
   {
     "allowedOrigins": ["https://your-app.vercel.app", "https://*.vercel.app"],
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "allowedHeaders": ["*"]
   }
   ```

### Step 4: Configure Authentication (If Applicable)

1. Go to Authentication → Settings
2. Add your Vercel domain to Site URL
3. Add Vercel domains to Redirect URLs
4. Configure email templates (optional)

---

## Post-Deployment Verification

### Automated Checks

After deployment, verify the following:

#### 1. **Application Health**
- [ ] Application loads without errors
- [ ] All routes are accessible
- [ ] No console errors in browser

#### 2. **API Connections**
- [ ] Supabase connection works
- [ ] Gemini API calls succeed
- [ ] File uploads work

#### 3. **Core Features**
- [ ] Document upload and processing
- [ ] Summary generation
- [ ] Quiz creation
- [ ] Flashcards functionality
- [ ] Charts rendering

#### 4. **Performance**
- [ ] Lighthouse score > 80
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s

### Monitoring Setup

1. **Enable Vercel Analytics**
   - Go to Project → Analytics
   - Enable Web Analytics and Speed Insights

2. **Monitor Error Logs**
   - Check Vercel → Deployments → Functions
   - Monitor Supabase logs

3. **Set Up Alerts**
   - Configure Vercel webhook notifications
   - Set up uptime monitoring (UptimeRobot, etc.)

---

## Troubleshooting

### Common Issues

#### Build Fails with "Module not found"
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Environment Variables Not Loading
- Verify variables are set in Vercel dashboard
- Check variable names match exactly (case-sensitive)
- Redeploy the project to pick up new variables

#### 404 Errors on Routes
- Ensure `vercel.json` is present in `summarease/`
- Verify rewrite rules are configured correctly

#### Supabase Connection Fails
- Check CORS settings in Supabase
- Verify RLS policies are correct
- Ensure anon key has proper permissions

#### Build Timeout
- Increase build timeout in Vercel project settings
- Optimize dependencies and build process
- Consider using build cache

---

## Rollback Procedures

### Vercel Rollback

1. **Using Vercel Dashboard**
   - Go to Deployments
   - Find the last working deployment
   - Click "..." → "Promote to Production"

2. **Using Vercel CLI**
   ```bash
   vercel rollback
   ```

### Git Rollback

1. **Revert Last Commit**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Rollback to Specific Commit**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

### Database Rollback

If you need to rollback database changes:

1. Check Supabase backups (automatic daily backups)
2. Restore from backup in Supabase dashboard
3. Or run reverse migration SQL scripts

---

## Hotfix Deployment

For urgent production fixes:

1. **Create Hotfix Branch**
   ```bash
   git checkout main
   git checkout -b hotfix/critical-issue
   ```

2. **Make Fix and Test Locally**
   ```bash
   npm run build
   npm run preview
   ```

3. **Deploy Directly**
   ```bash
   git add .
   git commit -m "hotfix: description"
   git push origin hotfix/critical-issue
   ```

4. **Merge to Main**
   - Create PR and merge immediately
   - Or push directly to main (if critical)

---

## Maintenance Mode

To enable maintenance mode:

1. Create a simple maintenance page
2. Update Vercel rewrites to redirect all traffic
3. Or use Vercel's "Deployment Protection" feature

---

## Performance Optimization Checklist

- [ ] Enable Vercel Edge Caching
- [ ] Configure proper cache headers
- [ ] Optimize images (use WebP format)
- [ ] Enable compression
- [ ] Monitor bundle size
- [ ] Use code splitting (already configured)
- [ ] Consider CDN for static assets

---

## Security Checklist

- [ ] All secrets stored as environment variables
- [ ] No hardcoded API keys in code
- [ ] CORS properly configured
- [ ] Security headers enabled (in `vercel.json`)
- [ ] Supabase RLS policies active
- [ ] Regular dependency updates
- [ ] Monitor security advisories

---

## Cost Monitoring

### Vercel Costs
- Monitor bandwidth usage
- Check function execution time
- Review build minutes

### Supabase Costs
- Monitor database size
- Check storage usage
- Review API calls count

### Gemini API Costs
- Track API usage
- Set up usage alerts
- Consider rate limiting

---

## Future Enhancements

When adding Clerk payment gateway:

1. Install Clerk SDK:
   ```bash
   npm install @clerk/clerk-react
   ```

2. Add Clerk environment variables
3. Create serverless functions in `api/` directory
4. Update database schema for subscriptions
5. Implement webhook handlers

See `ENV_SETUP.md` for Clerk-specific configuration.

---

## Support and Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Supabase Documentation:** https://supabase.com/docs
- **Vite Documentation:** https://vitejs.dev
- **GitHub Actions:** https://docs.github.com/en/actions

---

## Changelog

Keep track of major deployment changes here:

- **2025-10-09:** Initial deployment setup with CI/CD pipeline
- Add future updates here...

---

**Last Updated:** 2025-10-09
**Maintained By:** Project Team
