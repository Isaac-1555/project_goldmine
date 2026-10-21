# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository Scope (READ FIRST)

This repository is the **legacy React web app** and must remain deployable.

The Rust + Tauri desktop rework lives in the separate private repo
[`Isaac-1555/satbrain-desktop`](https://github.com/Isaac-1555/satbrain-desktop).
Do not implement desktop rework here.

When working on desktop work, read and update `PLAN.md` in that repo. The root
`PLAN.md` in this repo is only a pointer/status snapshot.

## Project Status

The web app is unchanged and remains the production reference while the desktop
app is developed separately.

## Project Overview

**SummarEase** (internal name: `sat-brain`) is a React SPA that helps students capture information through audio recording, note-taking, and document uploads, then uses Google Gemini to generate summaries, flashcards, quizzes, and auto-suggested charts.

## Development Commands

All commands must be run from the `summarease/` subdirectory:

```bash
npm run dev          # Start dev server (localhost:5173)
npm run build        # Production build → dist/
npm run build:check  # TypeScript check + production build
npm run typecheck    # TypeScript only (tsc -b)
npm run lint         # ESLint
```

There is no test suite configured. CI (.github/workflows/ci.yml) runs lint, typecheck (with `continue-on-error`), and build.

### Supabase Edge Functions

Edge Functions live in `summarease/supabase/functions/` and use Deno:

```bash
supabase functions serve          # Local dev
supabase functions deploy <name>  # Deploy (process-file, polar-webhooks, expire-trials, send-feedback)
supabase db push                  # Apply migrations
```

## Architecture

### Monorepo Layout

The actual application lives entirely inside `summarease/`. The root contains `docs/`, `.github/`, `README.md`, `AGENTS.md`, and `PLAN.md`. Vercel and CI are configured with `summarease/` as the root directory (legacy web setup; desktop build rework is tracked in `PLAN.md`).

### Frontend (React + TypeScript + Vite)

- **Entry**: `src/main.tsx` → `src/App.tsx`. Wraps the app in `PostHogProvider > Router > ToastProvider > ThemeProvider > AuthProvider > SubscriptionProvider`.
- **Routing**: React Router v7. Unauthenticated users see LandingPage/Login/SignUp. Authenticated users are redirected to `/dashboard`.
- **Dashboard**: `src/components/Dashboard/Dashboard.tsx` is the primary authenticated view. It uses a tab system (`TabNavigation`) with four tabs:
  - **NotebookTab** — note-taking + audio recording + file upload → AI processing → save to Supabase
  - **ViewTab** — browse/search saved files and summaries
  - **StudyToolsTab** — flashcards and quizzes generated from summaries
  - **SettingsTab** — user preferences
- **ContentViewer** (`src/components/ContentViewer/`) — full-screen view of a file's summary, transcript, charts, flashcards, and quizzes.

### Backend (Supabase)

- **Auth**: Supabase Auth via `AuthProvider` context. All data access uses RLS policies scoped to `auth.uid()`.
- **Database**: PostgreSQL. Migrations in `summarease/supabase/migrations/` (run in lexicographic order). Key tables: `files`, `transcripts`, `summaries`, `tags`, `summary_tags`, `flashcards`, `quizzes`, `documents`, `notes`, `subscriptions`, `users`.
- **Storage**: `files` bucket for uploaded content. Paths follow `{userId}/{timestamp}_{random}_{filename}`.
- **Edge Functions**: `process-file` is the main AI pipeline (download from storage → Gemini transcription/extraction → save transcript + summary + tags). Uses Deno with `@supabase/supabase-js` and `@google/generative-ai` via ESM imports.
- **RPC functions**: `get_user_files_with_metadata`, `get_knowledge_graph_data`, `get_summary_count_7days`, `increment_summary_usage`, `start_local_trial`.

### Dual Processing Pipeline

File processing can happen in two ways:
1. **Server-side** (Edge Function `process-file`): triggered via `supabase.functions.invoke()` from `src/lib/api.ts`. Preferred for production.
2. **Client-side** (fallback): `src/lib/documentProcessor.ts` handles extraction (PDF via pdf.js, DOCX via mammoth/PizZip, PPTX, images, audio) and calls Gemini directly from the browser. Used for development or when Edge Functions are unavailable.

### Key Library Modules (`src/lib/`)

- `api.ts` — all Supabase CRUD operations (files, summaries, tags, folders, flashcards, quizzes)
- `documentProcessor.ts` — client-side file extraction + Gemini summarization
- `audioProcessor.ts` / `transcriptionService.ts` — audio transcription (Gemini + Web Speech API fallback)
- `flashcardsService.ts` / `flashcardsServiceV2.ts` — flashcard generation via Gemini
- `quizService.ts` / `quizServiceSimple.ts` — quiz generation via Gemini
- `summaryPromptBuilder.ts` / `tagPromptBuilder.ts` — prompt construction for AI calls
- `viz/` — chart auto-suggestion: `extractor.ts` (parse numbers from summaries), `recommender.ts` (pick chart types), `vegaTemplates.ts` (Vega-Lite specs)

### Subscription & Billing

Managed via Polar.sh (not Stripe). `SubscriptionContext` provides `isPremium`, `isTrialing`, `canAccessPremiumFeatures`, and a local trial system. Polar webhooks update the `subscriptions` table via the `polar-webhooks` Edge Function. Free users are limited to 3 summaries per rolling 7-day window.

### Conventions

- Environment variables must be prefixed with `VITE_` for client access.
- `@typescript-eslint/no-explicit-any` is intentionally disabled — the codebase uses `any` at many Supabase/Gemini integration boundaries.
- Tags have types: `general`, `specific`, `user_added` (see `src/lib/types.ts`). Tag generation caps at 5 general + 7 specific.
- Theme is stored in `localStorage` key `theme-mode` (values: `light`, `dark`, `system`).
- Notebook drafts auto-save to `localStorage` under `sat-brain-notebook-state` and `sat-brain-local-notebooks`.

### Environment Variables

Required (see `summarease/.env.example`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — Supabase project credentials
- `VITE_GEMINI_API_KEY` — Google Gemini API key
- `VITE_FEEDBACK_EMAIL` — feedback destination

Optional:
- `VITE_POLAR_ORGANIZATION_ID`, `VITE_POLAR_PRODUCT_ID`, `VITE_POLAR_CHECKOUT_LINK` — Polar.sh billing
- `VITE_PUBLIC_POSTHOG_KEY`, `VITE_PUBLIC_POSTHOG_HOST` — PostHog analytics
- `VITE_GA_TRACKING_ID` — Google Analytics
- `VITE_PUBLIC_SITE_URL` — auth redirect URL
