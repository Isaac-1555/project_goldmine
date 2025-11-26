# Guide: Granting Lifetime Premium Access

This guide explains how to give specific users permanent premium access without requiring them to pay.

---

## Step 1: Apply the Migration

The migration file `20251126034400_lifetime_premium_users.sql` adds the necessary database support.

### Option A: Via Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Click "New Query"
5. Copy the entire contents of `summarease/supabase/migrations/20251126034400_lifetime_premium_users.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Cmd+Enter)
8. Verify success: You should see "Success. No rows returned"

### Option B: Via Supabase CLI
```bash
cd /Users/user/dev/project_goldmine/summarease
supabase db push
```

---

## Step 2: Grant Lifetime Premium to Users

You have three ways to grant lifetime premium access:

### Method 1: Using Supabase SQL Editor (Easiest)

1. Go to Supabase Dashboard → SQL Editor
2. Run this query (replace with actual email):

```sql
SELECT * FROM public.grant_lifetime_premium('user@example.com');
```

**Expected output:**
```
success | message                                | user_id
--------|----------------------------------------|----------
true    | Lifetime premium granted successfully  | uuid-here
```

### Method 2: Using Supabase Functions (Programmatic)

If you want to do this from code or a script:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SERVICE_ROLE_KEY' // Important: Use service role key, not anon key
)

async function grantLifetimePremium(email: string) {
  const { data, error } = await supabase.rpc('grant_lifetime_premium', {
    user_email: email
  })
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Result:', data)
}

// Usage
await grantLifetimePremium('user@example.com')
```

### Method 3: Bulk Grant (Multiple Users at Once)

Run this SQL query to grant multiple users at once:

```sql
DO $$
DECLARE
  user_emails TEXT[] := ARRAY[
    'founder@example.com',
    'team@example.com',
    'investor@example.com'
  ];
  email TEXT;
  result RECORD;
BEGIN
  FOREACH email IN ARRAY user_emails LOOP
    SELECT * INTO result FROM public.grant_lifetime_premium(email);
    RAISE NOTICE 'User: %, Success: %, Message: %', 
      email, result.success, result.message;
  END LOOP;
END $$;
```

---

## Step 3: Verify Lifetime Premium Access

### Check Individual User
```sql
SELECT 
  email,
  s.status,
  s.is_lifetime_premium,
  s.trial_end,
  s.current_period_end
FROM auth.users u
JOIN public.subscriptions s ON u.id = s.user_id
WHERE u.email = 'user@example.com';
```

### View All Lifetime Premium Users
```sql
SELECT * FROM public.lifetime_premium_users;
```

This view shows:
- `email` - User's email address
- `user_id` - User's UUID
- `premium_granted_at` - When lifetime premium was granted
- `last_updated` - Last time subscription was updated

---

## Step 4: Test in the App

1. Log in as the user you granted lifetime premium to
2. Check subscription status:
   - Should show as "Premium" or "Subscribed" (not "Trial")
   - Should have unlimited summary generation
   - Trial end date should be ~100 years in the future

---

## Revoking Lifetime Premium (If Needed)

If you need to remove lifetime premium access from a user:

```sql
SELECT * FROM public.revoke_lifetime_premium('user@example.com');
```

This will:
- Set `is_lifetime_premium` to FALSE
- Change status to 'canceled'
- Expire their trial immediately

---

## Quick Reference: SQL Functions

### grant_lifetime_premium(email)
- **Purpose**: Grant permanent premium access to a user
- **Parameters**: `user_email TEXT` - Email address of the user
- **Returns**: Table with `success BOOLEAN`, `message TEXT`, `user_id UUID`
- **Example**: `SELECT * FROM grant_lifetime_premium('user@example.com');`

### revoke_lifetime_premium(email)
- **Purpose**: Remove lifetime premium access from a user
- **Parameters**: `user_email TEXT` - Email address of the user
- **Returns**: Table with `success BOOLEAN`, `message TEXT`, `user_id UUID`
- **Example**: `SELECT * FROM revoke_lifetime_premium('user@example.com');`

### has_active_subscription(user_id)
- **Purpose**: Check if a user has active subscription (includes lifetime premium)
- **Parameters**: `user_uuid UUID` - User's ID
- **Returns**: `BOOLEAN` - TRUE if user has access
- **Example**: `SELECT has_active_subscription('uuid-here');`

---

## Common Use Cases

### Founders / Team Members
Grant your team permanent access:

```sql
SELECT * FROM grant_lifetime_premium('founder@yourcompany.com');
SELECT * FROM grant_lifetime_premium('developer@yourcompany.com');
SELECT * FROM grant_lifetime_premium('designer@yourcompany.com');
```

### Beta Testers / Early Supporters
Reward early users:

```sql
SELECT * FROM grant_lifetime_premium('earlyadopter@example.com');
```

### Special Promotions
Grant access to contest winners, influencers, etc.

---

## Troubleshooting

### "User not found with email: ..."
**Problem**: The email doesn't exist in your auth.users table  
**Solution**: Make sure the user has signed up first. Lifetime premium can only be granted to existing users.

### "No subscription found for user"
**Problem**: When trying to revoke, user doesn't have a subscription record  
**Solution**: This is actually fine - they don't have premium anyway. The function will still update if a record exists.

### User still sees "Free Trial" in app
**Problem**: Frontend might be caching old subscription data  
**Solutions**:
1. Log out and log back in
2. Refresh the page
3. Check browser developer console for errors
4. Verify database was actually updated (run the verification query)

### Migration already applied error
**Problem**: "column already exists" or similar  
**Solution**: The migration was already applied. Skip to Step 2.

---

## Security Notes

- ⚠️ The `grant_lifetime_premium` function uses `SECURITY DEFINER`, meaning it runs with elevated privileges
- ⚠️ Only grant access through the SQL editor or with service role key
- ⚠️ Regular users cannot call this function (it's restricted to service role)
- ⚠️ Keep a list of who you've granted lifetime access to for your records

---

## Example: Complete Workflow

Here's a complete example of granting lifetime premium to three users:

```sql
-- Step 1: Apply the migration (if not done already)
-- Copy and run: summarease/supabase/migrations/20251126034400_lifetime_premium_users.sql

-- Step 2: Grant lifetime premium to specific users
SELECT * FROM grant_lifetime_premium('founder@summarease.com');
SELECT * FROM grant_lifetime_premium('cofounder@summarease.com');
SELECT * FROM grant_lifetime_premium('investor@summarease.com');

-- Step 3: Verify it worked
SELECT * FROM lifetime_premium_users;

-- Step 4: Check a specific user
SELECT 
  u.email,
  s.status,
  s.is_lifetime_premium,
  s.trial_end > NOW() as has_trial_time,
  has_active_subscription(u.id) as has_access
FROM auth.users u
LEFT JOIN subscriptions s ON u.id = s.user_id
WHERE u.email = 'founder@summarease.com';
```

Expected output for Step 4:
```
email                    | status | is_lifetime_premium | has_trial_time | has_access
-------------------------|--------|---------------------|----------------|------------
founder@summarease.com   | active | true                | true           | true
```

Done! The user now has permanent premium access. 🎉
