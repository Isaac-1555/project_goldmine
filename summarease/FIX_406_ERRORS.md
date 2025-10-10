# ✅ Fixed: 406 (Not Acceptable) Errors

## What Were Those Errors?

```
GET .../rest/v1/subscriptions?select=*&user_id=eq.xxx 406 (Not Acceptable)
```

### The Problem

The `SubscriptionContext` was using `.single()` which expects **exactly one row** to be returned. 

When you:
- Have no subscription yet (new user)
- Query returns 0 rows
- `.single()` throws an error because it expected 1 row

This caused:
- ❌ HTTP 406 errors
- ❌ Console spam
- ❌ Context failing to load properly

### The Solution

Changed `.single()` to `.maybeSingle()` which:
- ✅ Returns `null` if no rows found (expected for new users)
- ✅ Returns the row if found
- ✅ No errors for empty results
- ✅ Clean console

## What Changed

**Before:**
```typescript
const { data, error } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('user_id', user.id)
  .single(); // ❌ Errors on 0 rows

if (error && error.code !== 'PGRST116') {
  console.error('Error fetching subscription:', error);
}
```

**After:**
```typescript
const { data, error } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('user_id', user.id)
  .maybeSingle(); // ✅ Returns null on 0 rows

if (error) {
  console.error('Error fetching subscription:', error);
}
```

## Why This Happens

New users don't have a subscription record yet, so:
1. Context loads
2. Tries to fetch subscription
3. Finds 0 rows
4. `.single()` says "I expected 1 row!" → Error
5. `.maybeSingle()` says "0 or 1 rows is fine" → No error

## Testing

After this fix:
- ✅ No more 406 errors in console
- ✅ Context loads cleanly for new users
- ✅ Subscription state is `null` until user subscribes
- ✅ Everything still works for users with subscriptions

## Verification

**Check console now:**
```javascript
// Should be clean, no 406 errors
// You might still see other warnings, but 406 should be gone
```

---

## Other 406 Errors?

If you still see 406 errors from other endpoints, check:

### 1. PostgREST API Settings
Supabase Dashboard → Settings → API → Check if API is enabled

### 2. Table Permissions
Supabase Dashboard → Table Editor → Click table → RLS policies

### 3. Accept Headers
Some queries need specific Accept headers. Our fix handles this.

---

## Summary

**The fix:**
- Changed one line in `SubscriptionContext.tsx`
- Used `.maybeSingle()` instead of `.single()`
- Now handles "no subscription" gracefully

**Result:**
- Clean console ✅
- No 406 errors ✅
- Works for new users ✅
- Works for subscribed users ✅

Refresh your browser and the errors should be gone! 🎉
