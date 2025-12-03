# Trial Logic

This document describes **all trial and subscription logic** for the app, combining:

- A **7‑day local trial** owned by our own backend (Supabase + Edge Functions), **no credit card required**.
- A **30‑day Polar.sh trial** that starts **after a user adds a payment method** via Polar.
- The **pricing page UX**, including when to show/hide the “Start free trial” and “Add card” buttons.

> NOTE: This file is **product‑facing documentation**, not implementation notes. It is written so that product, design, and engineering can share the same mental model.

---

## 1. Goals

1. **Very low friction for students**
   - Let new users experience the product for 7 days without entering a credit card.
2. **Clear, honest upgrade path**
   - After (or during) the 7‑day trial, they can add a card via Polar to start a **fresh 30‑day Polar trial**. Any remaining local‑trial days do not extend that 30‑day window.
3. **Simple mental model**
   - App logic should be easy to reason about:
     - Our database controls the 7‑day local trial window.
     - Polar controls the paid subscription and 30‑day trial window.
4. **No surprise charges**
   - Copy and UX must make clear **when charges begin** and that users can cancel before the Polar trial ends.

---

## 2. Key Concepts & Entities

### 2.1 Plans

We expose two plans on the pricing page:

1. **Free plan**
   - Price: `$0 / month`
   - Example capabilities (can be tuned):
     - 3 summaries per week
     - Basic note‑taking
     - Document upload
     - Record lectures

2. **Premium plan**
   - Price: `$9.99 / month`
   - Capabilities:
     - Unlimited summaries
     - Graph / knowledge‑graph visualization
     - Infographics generation
     - Advanced study tools
     - Quiz generation
     - Flashcards
     - All Free features
     - Priority support

### 2.2 Trial Types

We support **two distinct trial mechanisms**:

1. **Local Trial (L7)** – handled entirely by Supabase / Edge Functions
   - Duration: **7 days** from the moment the user clicks **“Start free trial”**.
   - No credit card required.
   - Grants full Premium access for the 7‑day period.
   - Implemented using timestamps and status flags in our own database.

2. **Polar Trial (P30)** – handled by Polar.sh
   - Duration: **30 days** from the start date configured on the Polar product/plan.
   - Requires the user to **add a payment method via Polar**.
   - After 30 days, Polar will start charging unless the user cancels.
   - Implemented fully in Polar; our backend mirrors the state via webhooks.

### 2.3 User / Subscription Data (Conceptual)

Conceptually, we rely on the following fields (exact schema may differ, but the semantics should match):

- **User / Profile table**
  - `local_trial_started_at` (nullable timestamp)
  - `local_trial_expires_at` (nullable timestamp)
  - `local_trial_status` (enum: `not_started`, `active`, `expired`)

- **Subscriptions table (linked to Polar)**
  - `polar_customer_id`
  - `polar_subscription_id`
  - `status` (e.g. `none`, `trialing`, `active`, `past_due`, `canceled`)
  - `current_period_end` (timestamp from Polar, used for trial and billing)
  - `is_trial` (boolean flag indicating if the Polar subscription is currently in trial mode)

> These names are descriptive only. Implementation will map them to the actual schema.

---

## 3. High‑Level State Machine

From the app’s perspective, a user can be in one of the following **trial / subscription states**:

1. **No trial, no Polar subscription**
   - `local_trial_status = not_started`
   - No Polar subscription record, or `status = none`.

2. **In 7‑day Local Trial (L7 Active)**
   - `local_trial_status = active`
   - `now < local_trial_expires_at`
   - No Polar subscription yet.

3. **Local Trial Expired, No Polar Subscription**
   - `local_trial_status = expired`
   - No Polar subscription, or `status = none`.
   - User can still use the **Free plan** but cannot start L7 again.

4. **In 30‑day Polar Trial (P30 Active)**
   - Polar subscription exists with `status = trialing`.
   - Regardless of L7 status, the user has Premium access.

5. **Paid Premium (Active Subscription)**
   - Polar subscription with `status = active` (trial finished, successful billing).

6. **Subscription Canceled / Lapsed**
   - Polar subscription `status ∈ {canceled, past_due, unpaid}`.
   - L7 is either `not_started` (never used) or `expired`.
   - User reverts to Free plan only.

### 3.1 Determining Premium Access

For feature‑gating, the user has **Premium access** if **either** of these is true:

- Local trial is active: `local_trial_status = active` AND `now < local_trial_expires_at`.
- Polar subscription is trialing or active: `subscriptions.status ∈ {trialing, active}`.

So from the point of view of the app:

- `is_premium_user = local_trial_active OR polar_subscription_trialing_or_active`

We do **not** double‑count trials; this logic simply ensures that any valid trial or paid subscription grants Premium features.

### 3.2 Non‑stacking policy

When a user begins the 30‑day Polar trial (by clicking **“Add card and get 30 days free”**), that 30‑day window is **always measured from the moment the card is added**, regardless of how many days are left in the 7‑day local trial. The earlier local‑trial days are separate and are **not** added on top of the 30‑day Polar trial.

---

## 4. Pricing Page UX & Button Logic

The pricing page (see screenshot) shows two main actions in the **Premium** card:

1. **Start free trial** – for the 7‑day local trial (L7).
2. **Add card & get 30 days free** – sends the user to Polar to start the 30‑day Polar trial (P30).

There is also a **“Go to Dashboard”** button on the Free plan card.

### 4.1 Buttons and Their Responsibilities

#### 4.1.1 “Start free trial” button (Local L7 trial)

- **Purpose**: Start a **7‑day, no‑card, local trial** controlled by our own backend.
- **Target audience**: New or existing Free users who have **never used** the 7‑day trial.
- **Behavior (conceptual)**:
  1. Button is clicked.
  2. Backend starts the local trial (sets `local_trial_started_at`, `local_trial_expires_at`, and `local_trial_status = active`).
  3. User is redirected to the dashboard with Premium access for 7 days.
  4. During this period, copy should explain that they can add a card at any time to unlock a 30‑day Polar trial.

- **Visibility rules**:
  - The button is **visible** if and only if:
    - User is authenticated, and
    - `local_trial_status = not_started`, and
    - There is **no active Polar subscription** (`status ∉ {trialing, active}`).
  - Once the user clicks it and the 7‑day window finishes (L7 expired), the button must **disappear permanently** for that user.

#### 4.1.2 “Add card and get 30 days free” button (Polar P30 trial)

- **Button label (exact)**: `Add card and get 30 days free`.
- **Purpose**: Send the user to Polar (hosted checkout / payment link) to **add a credit card** and start the **30‑day Polar trial**.
- **Target audience**:
  - Users who are still in their 7‑day local trial and want to continue Premium with a card‑backed trial.
  - Users who have finished their 7‑day trial but want more Premium time.
  - Users who prefer to skip the 7‑day local trial and go straight to a card‑backed Polar trial.

- **Behavior (conceptual)**:
  1. Button is clicked.
  2. If the user is not logged in, redirect to sign‑up / login, then back to the pricing page or directly into checkout.
  3. Backend creates or looks up a Polar customer and generates a **Polar payment / checkout link** tied to this user.
  4. Frontend redirects the user to that Polar URL.
  5. Polar handles card entry and the 30‑day free trial.
  6. On success, Polar sends a webhook back so we create/update the subscription record (`status = trialing`, `current_period_end = polar_trial_end`).

- **Visibility rules**:
  - The button is **visible as long as the user does not have an active Polar subscription**:
    - `subscriptions.status ∉ {trialing, active}`.
  - Once there is an active Polar subscription, this button should:
    - Either be hidden, **or**
    - Change to a “Manage subscription” / “Go to billing” button (product decision).

### 4.2 Combined Button Visibility Matrix (Logged‑in Users)

For a logged‑in user on the pricing page:

1. **State: No trial, no Polar subscription**
   - Show:
     - **Start free trial** (L7)
     - **Add card and get 30 days free** (P30)

2. **State: Local trial active (within 7 days), no Polar subscription yet**
   - Start‑trial button:
     - They already started L7, so **do not show a clickable “Start free trial” again**.
     - Options (UI decision):
       - Either hide it, or
       - Replace it with a non‑clickable label such as “Trial active – X days left”.
       - This doc assumes we either hide it or show a disabled/label version; it should **not** start another trial window.
  - Add‑card button:
     - **Visible** and primary call to action.
     - Copy example: “Add card and get 30 days free” (the 30‑day Polar trial always starts from the card‑add date; we don’t advertise stacked days).

3. **State: Local trial expired, no Polar subscription**
   - As requested:
     - **“Start free trial” button is completely hidden**. User has consumed their 7‑day local trial.
     - Only the **“Add card and get 30 days free”** button is visible.

4. **State: Polar trial active (P30)**
   - User is already in a Polar 30‑day trial.
   - Show:
     - No “Start free trial” (because Premium is already active and L7 is irrelevant now).
     - Optionally, a button like “Manage subscription” (link to billing / account settings).

5. **State: Paid Premium (active Polar subscription, not trial)**
   - Same as above: show only “Manage subscription” or nothing.

6. **State: Subscription canceled / lapsed**
   - If the user **never used** the 7‑day local trial (L7 `not_started`):
     - Consider allowing them to still use L7.
     - In this case, they would see:
       - “Start free trial” (L7) and
       - “Add card and get 30 days free” (P30) again.
   - If L7 is `expired`:
     - Hide “Start free trial”.
     - Show only “Add card and get 30 days free” to encourage them to re‑activate via Polar.

---

## 5. Timeline Examples

This section walks through common user journeys.

### 5.1 New user → 7‑day trial only → Free

1. User signs up and lands on the pricing page.
2. Sees both buttons on the Premium card.
3. Clicks **“Start free trial”**.
4. Backend starts L7 and redirects to dashboard.
5. For 7 days, user has Premium access (no card on file).
6. After 7 days:
   - `local_trial_status` becomes `expired`.
   - User reverts to Free plan capabilities.
   - On the pricing page: “Start free trial” is no longer visible; only “Add card and get 30 days free” shows.

### 5.2 New user → 7‑day trial → mid‑trial adds card → Polar 30‑day trial → Paid

1. Same as above until L7 is active.
2. On day 3, user clicks **“Add card and get 30 days free”** on pricing page or upgrade banner.
3. Redirect to Polar checkout, user adds card; Polar starts a fresh 30‑day trial counted from this moment.
4. Polar webhook updates our subscription row: `status = trialing`, `current_period_end = polar_trial_end`.
5. User now has Premium access due to Polar trial (even if L7 still has 4 days left). From a business perspective, their free period is treated as a single 30‑day Polar trial from the card‑add date; remaining local‑trial days are ignored and not added on top.
6. After 30 days of Polar trial, Polar charges the first invoice; `status` becomes `active`.
7. If payment succeeds, Premium continues. If it fails and is not resolved, status becomes `past_due` / `unpaid` and we revert them to Free capabilities.

### 5.3 New user → skips L7 → direct Polar 30‑day trial

1. New user signs up and lands on pricing.
2. Instead of starting the 7‑day trial, they click **“Add card and get 30 days free”**.
3. We **do not** automatically start the 7‑day local trial; they go straight into the Polar‑managed 30‑day trial.
4. App behavior is identical to any other Polar trial user.

### 5.4 Returning user after L7 expiration (no card yet)

1. User completed the 7‑day local trial previously; `local_trial_status = expired`.
2. They revisit pricing later.
3. Pricing shows only the **“Add card and get 30 days free”** button on the Premium card.
4. Clicking it takes them to Polar checkout to start P30.

---

## 6. Copy & Messaging Guidelines

To avoid confusion, the textual copy should match the actual logic:

- Top headline suggestion:
  - Instead of “Start with a 30‑day free trial, no credit card required”, we should clarify:
    - Example: “Start with a **7‑day free Premium trial, no credit card required**. Add a card any time for **30 extra days free** before paying.”
- On the Premium card, near the price:
  - Highlight: “First **7 days free**, no card required. Add a card to extend your trial to **30 days**.”
- On the Add‑card button:
  - Clear CTA (exact label): “Add card and get 30 days free”.
- In the dashboard during local trial:
  - Banner explaining:
    - “You’re on a 7‑day free trial. Add your card to extend Premium to 30 days total and avoid losing access to advanced tools.”

---

## 7. Edge Cases & Constraints

1. **Multiple accounts / trial abuse**
   - Because the 7‑day local trial does not require a card, users might create multiple accounts.
   - Basic mitigations (future work):
     - Require email verification.
     - Prefer or incentivize school emails.
     - Potentially rate‑limit trials per IP or device.

2. **Clock skew / time zones**
   - All timestamps should be stored and evaluated in UTC.
   - Frontend can display local time / “X days left” strings derived from UTC.

3. **Webhooks reliability**
   - If Polar webhooks are delayed or briefly unavailable, the app might temporarily think a user is not on a trial.
   - For a student‑friendly experience, we should bias towards **allowing access** for a short grace period if subscription status is temporarily unclear.

4. **Changing trial durations in the future**
   - The logic should be parameterized so we can adjust:
     - Local trial length (e.g. from 7 → 3 days).
     - Polar trial length (e.g. from 30 → 14 days in Polar product settings).

---

## 8. Summary of Responsibilities

- **Supabase / Edge Functions (Local L7 Trial)**
  - Owns the **7‑day no‑card trial**.
  - Tracks `local_trial_started_at`, `local_trial_expires_at`, and `local_trial_status`.
  - Grants Premium access while L7 is active.
  - Ensures the pricing page hides “Start free trial” once L7 has expired.

- **Polar.sh (P30 Trial + Billing)**
  - Owns the **30‑day card‑based trial** and all paid billing thereafter.
  - Manages payment methods, invoices, and subscription state.
  - Sends webhooks so we can mirror `status` and `current_period_end`.

- **Frontend / Pricing Page**
  - Renders:
    - **“Start free trial”** → triggers local L7 trial.
    - **“Add card and get 30 days free”** → redirects to Polar payment / checkout link.
  - Applies the visibility rules so that:
    - Users can only start the 7‑day local trial once.
    - After L7 expires, only the Add‑card button remains visible.
    - Once a Polar subscription is active, trial buttons are hidden or replaced with a manage‑subscription entry point.

This document should remain the single source of truth for how trials and pricing‑page buttons behave. Any future changes to durations, copy, or business rules should be reflected here first and then implemented in code.
