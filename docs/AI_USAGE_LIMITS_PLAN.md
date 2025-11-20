# AI Usage Limits & Profitability Plan

## Overview

Goal: design AI usage limits for paid users at **$4.99/month** using **Gemini 2.5 Flash** such that:

- Typical users can comfortably use the app without hitting limits.
- Even if a user **maxes out their quota**, AI costs stay low enough to maintain **≥ 50% profit margin** (on revenue vs. AI cost).
- Implementation is based on **token-based limits**, plus optional **feature-level caps**.

Target per-user AI cost (safety bound): **≤ ~$2.25/month**.

---

## Gemini 2.5 Flash Pricing (Text/Image/Video)

Paid tier (standard, per 1M tokens):

- **Input tokens**: $0.30 / 1,000,000 tokens
- **Output tokens**: $2.50 / 1,000,000 tokens

Output tokens are much more expensive than input tokens, so they dominate cost.

This plan focuses on **limiting output tokens** and treating input tokens as a smaller overhead.

---

## User Behavior & Token Usage Assumptions

Based on observed/expected behavior, users fall into four segments (per month):

### 1. Light Users (≈35%)

- 8 pages of lecture notes/week (selected difficult lectures)
- 15 pages of textbook content/week
- 10 brief queries/interactions/week

Approximate monthly tokens:

- ~38k input tokens
- ~38k output tokens
- **Total: ~76k tokens/month**

### 2. Regular Users (≈40%)

- 20 pages of lecture notes/week (most lectures)
- 40 pages of textbook content/week
- 25 queries/interactions/week

Approximate monthly tokens:

- ~100k input tokens
- ~100k output tokens
- **Total: ~200k tokens/month**

### 3. Heavy Users (≈20%)

- 35 pages of lecture notes/week (all lectures)
- 75 pages of textbook/reading materials/week
- 50+ queries/interactions/week

Approximate monthly tokens:

- ~200k input tokens
- ~200k output tokens
- **Total: ~400k tokens/month**

### 4. Power Users (≈5%)

- 50+ pages of notes/week
- 120+ pages of reading materials/week
- 80+ queries/interactions/week

Approximate monthly tokens:

- ~335k input tokens
- ~335k output tokens
- **Total: ~670k tokens/month**

### Summary vs. Proposed Limit

- Most users (Light, Regular, Heavy) are well below **400k tokens/month** total.
- Even **Power Users** are around **670k tokens/month**, which is still under the proposed **800k-token cap**.

This makes **800k tokens/month** a good ceiling: generous enough for power users but bounded for cost control.

---

## Revenue vs. Cost and Profit Target

**Subscription price:** $4.99/month.

Profit margin:

> margin = (revenue − cost) / revenue

To ensure ≥ 50% margin:

> (4.99 − cost) / 4.99 ≥ 0.5  
> 4.99 − cost ≥ 2.495  
> **cost ≤ 2.495**

We treat **AI cost budget per user** as roughly **≤ $2.00–$2.25**, leaving room for infrastructure, payment fees, etc.

---

## Deriving the 800k Token Limit

We limit **output tokens** per user per month and sanity-check input tokens.

Let:

- `output_tokens_limit = 800,000` per user/month.
- Assume worst case: **input tokens ≈ output tokens** (conservative).

### Output Token Cost

Output cost:

> cost_output = (output_tokens_limit / 1,000,000) × $2.50

For 800k:

> cost_output = (800,000 / 1,000,000) × 2.50  
> cost_output = 0.8 × 2.50  
> **cost_output ≈ $2.00**

### Input Token Cost (Conservative)

Assume input tokens also ~800k:

> cost_input = (800,000 / 1,000,000) × $0.30  
> cost_input = 0.8 × 0.30  
> **cost_input ≈ $0.24**

### Total AI Cost at Full Usage

> cost_total ≈ cost_output + cost_input  
> cost_total ≈ 2.00 + 0.24  
> **cost_total ≈ $2.24 per user/month** (worst-case heavy usage)

Profit margin on AI costs alone:

> margin_AI_only = (4.99 − 2.24) / 4.99  
> ≈ 2.75 / 4.99  
> **≈ 55% margin**

This satisfies the ≥ 50% profit requirement, even when a user maxes out their 800k-token quota.

---

## Token Limit vs. Behavior Segments

- **Light users (~76k total tokens)**  
  - Well under 800k; cost << budget; usage unlikely to hit any limit.
- **Regular users (~200k total tokens)**  
  - ~25% of the 800k cap; cost still very low.
- **Heavy users (~400k total tokens)**  
  - ~50% of the cap; still comfortably within margin.
- **Power users (~670k total tokens)**  
  - ~84% of the 800k cap; represent the main cost drivers but are still within the safe budget.

Overall, most users will never hit the 800k limit; only the top few percent (extreme power users) might approach it.

---

## Recommended Limits

### Core Token Limits (Internal)

Per user, per billing month:

- **Monthly output token limit**: `800,000` output tokens
- **Daily output token limit** (soft throttle): `~25,000` output tokens
  - Simple choice: 25,000 rather than 26,666 for easier communication and implementation.
- **Per-request max output tokens**: `1,000` (or 1,500) output tokens

Input tokens are not hard-limited separately, but the app should:

- Impose **input size constraints** (max characters/pages per call).
- Monitor input tokens for analytics and sanity checks.

### Feature-Level Limits (Optional)

On top of raw token limits, add **per-feature caps** to protect against edge cases:

- **Full document pipeline** (summary + flashcards + quiz per document):
  - Assume ~1,500 output tokens per full pipeline.
  - Theoretical max from tokens alone: 800k / 1,500 ≈ ~533 pipelines.
  - Suggested cap for UX & stability: **300 full pipelines/month**.

- **Large-document pipelines per day**:
  - Suggested: **15 per day**.

- **Short tasks (Q&A, small summaries)**:
  - Governed only by daily token limit; no separate count needed.

These feature caps are mostly there to:

- Avoid extreme small-percentage users from spamming heavy operations.
- Keep UX predictable.

---

## Implementation Notes (High Level)

### Data to Track per User per Billing Period

- `output_tokens_used` (primary limiter)
- `input_tokens_used` (for analysis)
- Optional counters:
  - `doc_pipelines_used` (full pipelines/month)
  - `doc_pipelines_used_today`

### Basic Enforcement Flow for an AI Call

1. Resolve the users **current billing period** from subscription info.
2. Load that users usage record:
   - `output_tokens_used`
   - `output_tokens_used_today`
3. Compute remaining allowance:
   - `monthly_remaining = MONTHLY_OUTPUT_LIMIT − output_tokens_used`
   - `daily_remaining = DAILY_OUTPUT_LIMIT − output_tokens_used_today`
4. Compute allowed tokens for this request:
   - `allowed_max = min(requested_max_output_tokens, monthly_remaining, daily_remaining)`
5. If `allowed_max <= 0`:
   - Block the request; show a clear message explaining the limit and reset date.
6. Otherwise:
   - Call Gemini with `maxOutputTokens = allowed_max`.
   - On response, read actual `output_tokens_used` and `input_tokens_used` from usage metadata.
   - Update stored counters accordingly.

### Billing Period Alignment

- Align usage limits with the **subscription billing cycle** (e.g., month from subscription start or calendar month, depending on billing provider semantics).
- On renewal:
  - Reset usage counters to 0 for the new period.

---

## UX Guidelines Around Limits

To keep users happy and reduce churn:

- **Transparency**:
  - Show AI usage progress: e.g., Youve used 120k / 800k monthly AI tokens (15%).
- **Early Warnings**:
  - Notify at ~70% and ~90% of monthly quota.
- **On hitting limits**:
  - Provide a clear message: when limits reset, what options they have (wait for reset, or in future, upgrade/add-on).

---

## Summary

- **800k output tokens/month** per user is a good ceiling given current Gemini 2.5 Flash pricing and observed behavior.
- Worst-case AI cost at that limit is ~**$2.24 per user/month**, giving ~**55% margin** at **$4.99/month** revenue, satisfying the requirement for ≥50% profit.
- Real-world usage data (Light, Regular, Heavy, Power) suggests most users will not reach 800k, so the actual average AI cost per user should be significantly lower.
- Combine **token-based limits**, **daily throttling**, and optional **feature-level caps** for a robust and sustainable limiter system.
