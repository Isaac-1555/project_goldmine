#!/bin/bash

# Apply tag search fix to production Supabase database
# This script applies the migration that fixes the case-sensitivity issue in tag search

echo "🔧 Applying tag search case-sensitivity fix to production database..."
echo ""

# Check if we're in the right directory
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Please run this from the summarease directory."
    exit 1
fi

# Source the .env file to get Supabase URL
source .env

if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ Error: VITE_SUPABASE_URL not found in .env"
    exit 1
fi

echo "📍 Target database: $VITE_SUPABASE_URL"
echo ""

# Check if migration file exists
MIGRATION_FILE="supabase/migrations/20251003193000_fix_tag_search_case_sensitivity.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found at $MIGRATION_FILE"
    exit 1
fi

echo "📝 Migration file found: $MIGRATION_FILE"
echo ""
echo "⚠️  WARNING: This will update the production database!"
echo "   - Drop and recreate search functions with case-insensitive comparison"
echo "   - Convert any mixed-case tags to lowercase"
echo ""
read -p "Do you want to proceed? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ Migration cancelled."
    exit 0
fi

echo ""
echo "🚀 Applying migration to production..."

# Use npx supabase db push to apply the migration
npx supabase db push --linked

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Refresh your browser to get the updated frontend code"
    echo "2. Test searching for tags like 'architecture'"
    echo "3. Verify that search results are now appearing correctly"
else
    echo ""
    echo "❌ Migration failed. Please check the error messages above."
    echo ""
    echo "💡 Troubleshooting tips:"
    echo "1. Make sure you're logged in with: npx supabase login"
    echo "2. Check if the project is linked: npx supabase link"
    echo "3. Try applying the migration manually via the Supabase dashboard SQL editor"
    exit 1
fi