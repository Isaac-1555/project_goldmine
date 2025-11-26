-- Check if payment_customer_id exists (new column name)
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
  AND table_schema = 'public'
  AND column_name LIKE '%customer%';
