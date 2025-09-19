# Storage Policies Setup (Manual)

Due to permission restrictions in hosted Supabase, the following storage policies need to be set up manually via the Supabase dashboard:

## Navigate to Storage Policies

1. Go to your Supabase project dashboard
2. Navigate to **Storage** → **Policies**
3. Select the `objects` table
4. Create the following policies for bucket 'files':

## Policies to Create

### 1. Upload Policy (INSERT)
- **Name**: "Users can upload their own files"
- **Action**: INSERT
- **Target roles**: authenticated  
- **WITH CHECK expression**:
```sql
bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
```

### 2. View Policy (SELECT)
- **Name**: "Users can view their own files"
- **Action**: SELECT
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
```

### 3. Update Policy (UPDATE)  
- **Name**: "Users can update their own files"
- **Action**: UPDATE
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
```
- **WITH CHECK expression**:
```sql
bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
```

### 4. Delete Policy (DELETE)
- **Name**: "Users can delete their own files"  
- **Action**: DELETE
- **Target roles**: authenticated
- **USING expression**:
```sql
bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]
```

## Notes
- These policies ensure users can only access files in folders named with their user ID
- The `storage.foldername(name)` function extracts the folder structure from file paths
- All policies are scoped to the 'files' bucket only