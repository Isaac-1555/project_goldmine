import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testTagSearch() {
  try {
    console.log('🔍 Testing tag search functionality...\n')
    
    // Get a sample user (you'll need to login first or hardcode a user ID)
    const { data: authUser } = await supabase.auth.getUser()
    if (!authUser.user) {
      console.log('❌ No authenticated user. Please login first.')
      // For testing, you might want to hardcode a user ID here
      return
    }
    
    const userId = authUser.user.id
    console.log('✓ User ID:', userId)
    
    // 1. Check if tags exist in the database
    console.log('\n1. Checking existing tags...')
    const { data: allTags, error: tagsError } = await supabase
      .from('tags')
      .select('*')
      .limit(20)
    
    if (tagsError) {
      console.error('Error fetching tags:', tagsError)
    } else {
      console.log('Found tags:', allTags.map(t => t.name))
    }
    
    // 2. Check tag suggestions for "architecture"
    console.log('\n2. Testing tag suggestions for "architecture"...')
    const { data: suggestions, error: suggError } = await supabase
      .rpc('get_tag_suggestions', {
        search_term: 'architecture'
      })
    
    if (suggError) {
      console.error('Error getting suggestions:', suggError)
    } else {
      console.log('Tag suggestions:', suggestions)
    }
    
    // 3. Check if there are any summaries with tags
    console.log('\n3. Checking summaries with tags...')
    const { data: summariesWithTags, error: summariesError } = await supabase
      .from('summary_tags')
      .select(`
        summary_id,
        tags (name)
      `)
      .limit(10)
    
    if (summariesError) {
      console.error('Error fetching summaries with tags:', summariesError)
    } else {
      console.log('Summaries with tags:', summariesWithTags)
    }
    
    // 4. Test searching by exact tag name
    console.log('\n4. Testing search by exact tag name "architecture"...')
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_files_by_tags', {
        user_uuid: userId,
        tag_names: ['architecture'],
        search_logic: 'or'
      })
    
    if (searchError) {
      console.error('Error searching files by tags:', searchError)
    } else {
      console.log('Search results for "architecture":', searchResults?.length || 0, 'files')
      if (searchResults && searchResults.length > 0) {
        console.log('First result:', searchResults[0])
      }
    }
    
    // 5. Check for case sensitivity issues
    console.log('\n5. Checking for case sensitivity issues...')
    const tagVariants = ['architecture', 'Architecture', 'ARCHITECTURE']
    for (const variant of tagVariants) {
      const { data: variantTags, error: variantError } = await supabase
        .from('tags')
        .select('*')
        .eq('name', variant)
      
      if (!variantError && variantTags) {
        console.log(`Found tag "${variant}":`, variantTags.length > 0)
      }
    }
    
    // 6. Test the mixed criteria search function
    console.log('\n6. Testing mixed criteria search...')
    const { data: mixedResults, error: mixedError } = await supabase
      .rpc('search_files_by_mixed_criteria', {
        user_uuid: userId,
        tag_names: ['architecture'],
        filename_terms: [],
        tag_search_logic: 'or'
      })
    
    if (mixedError) {
      console.error('Error with mixed criteria search:', mixedError)
    } else {
      console.log('Mixed search results:', mixedResults?.length || 0, 'files')
    }
    
    console.log('\n✅ Testing complete!')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the test
console.log('Starting Supabase tag search test...')
console.log('URL:', supabaseUrl)
console.log('-----------------------------------')

testTagSearch().then(() => {
  console.log('\n🎉 Test finished!')
  process.exit(0)
}).catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})