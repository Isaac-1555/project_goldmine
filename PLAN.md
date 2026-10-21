# Sat-Brain Desktop Rework — Plan Moved

> **Active desktop work lives in the private repo
> [`Isaac-1555/satbrain-desktop`](https://github.com/Isaac-1555/satbrain-desktop).**
> The source of truth is `PLAN.md` in that repository.

## This repository

This repo remains the legacy React web app. It stays deployable while the desktop app is built separately.

## Desktop repo status snapshot

| Field | Value |
|---|---|
| Active plan | `satbrain-desktop/PLAN.md` |
| Current phase | Phase 3 — Offline-first data foundation |
| Completed | Phase 0 audit, Phase 1 Tauri shell |
| Partial | Phase 2 authentication, Phase 3 local repositories |
| Blocked | Supabase/Google provider setup, signing credentials |
| Next action | Finish local repositories and sync foundation |

## Rules for agents

- Do not implement the Rust + Tauri rework in this repository.
- Read and update `PLAN.md` in `satbrain-desktop` when working on desktop work.
- Keep this web app working; it is the fallback and production reference.
