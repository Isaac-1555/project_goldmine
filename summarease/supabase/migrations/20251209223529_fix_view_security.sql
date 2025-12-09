-- Fix security vulnerability where auth.users data was exposed via public view
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0002_auth_users_exposed

-- 1. Revoke public access to the view
REVOKE ALL ON public.lifetime_premium_users FROM anon;
REVOKE ALL ON public.lifetime_premium_users FROM authenticated;
REVOKE ALL ON public.lifetime_premium_users FROM public;

-- 2. Explicitly grant access only to service_role (for internal admin use)
GRANT SELECT ON public.lifetime_premium_users TO service_role;

-- 3. Enable security_invoker
-- This forces the view to execute with the permissions of the user calling it, 
-- rather than the view owner (definer). Since anon/authenticated users 
-- do not have access to auth.users, this provides a second layer of defense.
ALTER VIEW public.lifetime_premium_users SET (security_invoker = on);