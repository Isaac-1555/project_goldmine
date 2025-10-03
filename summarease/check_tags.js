import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTags() {
  console.log('🔍 Checking tag data and search functions...\n')
  
  // 1. Check if there are mixed case tags
  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('*')
    .order('name')
  
  if (tagsError) {
    console.error('Error fetching tags:', tagsError)
    return
  }
  
  console.log('📌 Sample tags in database:')
  tags.slice(0, 10).forEach(tag => {
    console.log(`  - "${tag.name}" (ID: ${tag.id})`)
  })
  
  // Check for mixed case
  const mixedCaseTags = tags.filter(t => t.name !== t.name.toLowerCase())
  if (mixedCaseTags.length > 0) {
    console.log('\n⚠️  Found mixed-case tags that need fixing:')
    mixedCaseTags.forEach(t => console.log(`  - "${t.name}"`))
  } else {
    console.log('\n✓ All tags are lowercase')
  }
  
  // 2. Check actual tag search with specific tag
  const testTag = 'ai coding'
  console.log(`\n🧪 Testing search for tag "${testTag}"...`)
  
  // First check if this tag exists
  const { data: tagExists } = await supabase
    .from('tags')
    .select('*')
    .eq('name', testTag)
    .single()
  
  if (tagExists) {
    console.log(`✓ Tag "${testTag}" exists in database (ID: ${tagExists.id})`)
    
    // Check if it's linked to any summaries
    const { data: linkedSummaries } = await supabase
      .from('summary_tags')
      .select('summary_id')
      .eq('tag_id', tagExists.id)
    
    console.log(`✓ Tag is linked to ${linkedSummaries?.length || 0} summaries`)
  } else {
    console.log(`❌ Tag "${testTag}" not found in database`)
  }
  
  // 3. Try raw SQL query to test the function
  console.log('\n🔧 Testing search function directly...')
  
  // Need to login first to get user ID
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.log('❌ No user logged in. Cannot test search function.')
    console.log('Please login to the app first, then run this test.')
    return
  }
  
  console.log(`✓ User ID: ${user.id}`)
  
  // Test the search function
  const { data: searchResults, error: searchError } = await supabase
    .rpc('search_files_by_mixed_criteria', {
      user_uuid: user.id,
      tag_names: [testTag],
      filename_terms: [],
      tag_search_logic: 'or'
    })
  
  if (searchError) {
    console.error('❌ Search function error:', searchError)
  } else {
    console.log(`📊 Search results: ${searchResults?.length || 0} files found`)
    if (searchResults && searchResults.length > 0) {
      console.log('Sample result:', searchResults[0])
    }
  }
  
  // 4. Test with lowercase version
  const lowerTestTag = testTag.toLowerCase()
  console.log(`\n🔧 Testing with lowercase "${lowerTestTag}"...`)
  
  const { data: lowerResults, error: lowerError } = await supabase
    .rpc('search_files_by_mixed_criteria', {
      user_uuid: user.id,
      tag_names: [lowerTestTag],
      filename_terms: [],
      tag_search_logic: 'or'
    })
  
  if (lowerError) {
    console.error('❌ Lowercase search error:', lowerError)
  } else {
    console.log(`📊 Lowercase search results: ${lowerResults?.length || 0} files found`)
  }
}

checkTags().then(() => {
  console.log('\n✅ Check complete!')
  process.exit(0)
}).catch(error => {
  console.error('Check failed:', error)
  process.exit(1)
})