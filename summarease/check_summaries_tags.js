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

async function checkSummariesAndTags() {
  console.log('🔍 Checking summaries and their tags...\n')
  
  // Get all summaries with their tags
  const { data: summariesWithTags, error } = await supabase
    .from('summaries')
    .select(`
      id,
      file_id,
      created_at,
      summary_text,
      files!inner (
        title,
        status
      ),
      summary_tags (
        tags (
          name
        )
      )
    `)
    .limit(10)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching summaries:', error)
    return
  }
  
  console.log(`📊 Found ${summariesWithTags?.length || 0} summaries\n`)
  
  summariesWithTags?.forEach((summary, index) => {
    console.log(`${index + 1}. File: "${summary.files.title}"`)
    console.log(`   Status: ${summary.files.status}`)
    console.log(`   Summary ID: ${summary.id}`)
    console.log(`   Created: ${new Date(summary.created_at).toLocaleString()}`)
    
    const tags = summary.summary_tags?.map(st => st.tags?.name).filter(Boolean) || []
    console.log(`   Tags (${tags.length}): ${tags.length > 0 ? tags.join(', ') : 'NO TAGS'}`)
    console.log('')
  })
  
  // Check for summaries without any tags
  const { data: summariesWithoutTags } = await supabase
    .from('summaries')
    .select(`
      id,
      files!inner (title)
    `)
    .is('id', null, { referencedTable: 'summary_tags', referencedColumn: 'summary_id' })
  
  // This query might not work, let's try a different approach
  const { data: allSummaries } = await supabase
    .from('summaries')
    .select('id')
  
  const { data: summariesWithTagsIds } = await supabase
    .from('summary_tags')
    .select('summary_id')
    .order('summary_id')
  
  const summaryIdsWithTags = new Set(summariesWithTagsIds?.map(s => s.summary_id) || [])
  const summariesWithoutTagsList = allSummaries?.filter(s => !summaryIdsWithTags.has(s.id)) || []
  
  console.log(`\n⚠️  Summaries without tags: ${summariesWithoutTagsList.length}`)
  console.log(`✓ Summaries with tags: ${summaryIdsWithTags.size}`)
  
  // Check specific files that should have tags
  console.log('\n🔍 Checking files that appear to have tags in the UI...')
  const testFiles = ['Taj Mahal', 'Burj Khalifa', 'UT 3', 'AR 1']
  
  for (const fileName of testFiles) {
    const { data: file } = await supabase
      .from('files')
      .select(`
        id,
        title,
        summaries (
          id,
          summary_tags (
            tags (name)
          )
        )
      `)
      .ilike('title', `%${fileName}%`)
      .single()
    
    if (file) {
      const tags = file.summaries?.[0]?.summary_tags?.map(st => st.tags?.name).filter(Boolean) || []
      console.log(`  "${file.title}": ${tags.length > 0 ? tags.join(', ') : 'NO TAGS FOUND'}`)
    }
  }
}

checkSummariesAndTags().then(() => {
  console.log('\n✅ Check complete!')
  process.exit(0)
}).catch(error => {
  console.error('Check failed:', error)
  process.exit(1)
})