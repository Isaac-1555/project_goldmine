# Filename Search Bug Fix

## Problem Description

The search bar feature for searching by filename was malfunctioning:
- **Symptoms**: When typing a filename like "Taj Mahal", the search suggestions would correctly show the file
- **Bug**: After selecting the filename from suggestions, the main list would show "Found 0 summaries matching filename" - the file would not appear in the results

## Root Cause

The issue was in the PostgreSQL function `search_files_by_mixed_criteria` in the database migration files. The function was using unsafe string concatenation to build dynamic SQL queries for filename searches:

```sql
filename_condition := 'f.title ILIKE ''%' || filename_terms[1] || '%''';
```

This approach had two major problems:
1. **SQL Injection Vulnerability**: User input was directly concatenated into SQL strings
2. **String Handling Issues**: The dynamic query construction didn't properly handle special characters or whitespace in filenames

## Solution

Created a new migration (`20251005000000_fix_filename_search_params.sql`) that rewrites the `search_files_by_mixed_criteria` function to use safe, parameterized queries instead of string concatenation.

### Key Changes:

1. **Replaced unsafe string concatenation** with PostgreSQL's `unnest()` function and `EXISTS` clause:
   ```sql
   WHERE EXISTS (
     SELECT 1
     FROM unnest(filename_terms) AS term
     WHERE f.title ILIKE '%' || term || '%'
   )
   ```

2. **Updated return type** from `TEXT[]` to `JSONB` for tags to support the new tag type system:
   ```sql
   tags JSONB  -- Changed from TEXT[] to support tag types
   ```

3. **Fixed all four search cases**:
   - Case 1: Only filename search
   - Case 2: Only tag search (AND/OR logic)
   - Case 3: Combined tag and filename search (OR logic between types)
   - Case 4: No search criteria

## Files Modified

1. **New Migration**: `supabase/migrations/20251005000000_fix_filename_search_params.sql`
   - Drops and recreates `search_files_by_mixed_criteria` with safe parameterization
   - Updates return type to JSONB for better tag support

2. **Fixed Migration**: `supabase/migrations/20251003200300_add_tag_types.sql`
   - Added `DROP FUNCTION` statements before `CREATE OR REPLACE` to allow return type changes

## Testing Recommendations

After deploying this fix, test the following scenarios:

1. ✅ Search by filename with spaces (e.g., "Taj Mahal")
2. ✅ Search by partial filename (e.g., "Taj")
3. ✅ Search by filename with special characters
4. ✅ Search combining tags and filenames
5. ✅ Case sensitivity variations (e.g., "taj mahal", "TAJ MAHAL")

## Deployment

The fix has been applied to the database using:
```bash
supabase db push --linked
```

Users should refresh their browser to ensure they're using the updated code. No frontend code changes were required as the TypeScript code in `tagSearchService.ts` already handled both JSONB and TEXT[] tag formats.

## Security Impact

This fix eliminates a SQL injection vulnerability that existed in the previous implementation. All user inputs are now properly parameterized and sanitized by PostgreSQL's query engine.
