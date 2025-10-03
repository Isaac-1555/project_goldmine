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

async function checkAllData() {
  console.log('📊 Checking all data in the database...\n')
  
  // 1. Check files
  const { data: files, error: filesError } = await supabase
    .from('files')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (filesError) {
    console.error('Error fetching files:', filesError)
    return
  }
  
  console.log(`📁 Files table: ${files?.length || 0} records`)
  if (files && files.length > 0) {
    console.log('Sample files:')
    files.slice(0, 3).forEach(f => {
      console.log(`  - "${f.title}" (${f.file_type}, status: ${f.status})`)
    })
  }
  
  // 2. Check summaries
  const { data: summaries } = await supabase
    .from('summaries')
    .select('*')
  
  console.log(`\n📝 Summaries table: ${summaries?.length || 0} records`)
  
  // 3. Check summary_tags
  const { data: summaryTags } = await supabase
    .from('summary_tags')
    .select('*')
  
  console.log(`🏷️  Summary_tags table: ${summaryTags?.length || 0} records`)
  
  // 4. Check tags
  const { data: tags } = await supabase
    .from('tags')
    .select('*')
  
  console.log(`🔖 Tags table: ${tags?.length || 0} records`)
  
  // 5. Check transcripts
  const { data: transcripts } = await supabase
    .from('transcripts')
    .select('*')
  
  console.log(`📄 Transcripts table: ${transcripts?.length || 0} records`)
  
  // 6. Check if files have been processed
  console.log('\n🔍 Checking file processing status:')
  const processedFiles = files?.filter(f => f.status === 'completed') || []
  const processingFiles = files?.filter(f => f.status === 'processing') || []
  const failedFiles = files?.filter(f => f.status === 'failed') || []
  
  console.log(`  ✓ Completed: ${processedFiles.length}`)
  console.log(`  ⏳ Processing: ${processingFiles.length}`)
  console.log(`  ❌ Failed: ${failedFiles.length}`)
  
  // 7. Check for orphaned data
  console.log('\n⚠️  Checking for data issues:')
  
  // Files without summaries
  const filesWithSummaries = new Set(summaries?.map(s => s.file_id) || [])
  const filesWithoutSummaries = files?.filter(f => !filesWithSummaries.has(f.id)) || []
  console.log(`  Files without summaries: ${filesWithoutSummaries.length}`)
  if (filesWithoutSummaries.length > 0) {
    console.log('    Files missing summaries:')
    filesWithoutSummaries.slice(0, 5).forEach(f => {
      console.log(`      - "${f.title}"`)
    })
  }
  
  // 8. Test the RPC function
  console.log('\n🔧 Testing get_user_files_with_metadata RPC...')
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_user_files_with_metadata', {
        user_uuid: user.id
      })
    
    if (rpcError) {
      console.error('RPC Error:', rpcError)
    } else {
      console.log(`RPC returned ${rpcData?.length || 0} files`)
      if (rpcData && rpcData.length > 0) {
        console.log('Sample RPC result:')
        const sample = rpcData[0]
        console.log(`  Title: "${sample.title}"`)
        console.log(`  Status: ${sample.status}`)
        console.log(`  Summary: ${sample.summary_text ? 'Yes' : 'No'}`)
        console.log(`  Tags: ${sample.tags?.length > 0 ? sample.tags.join(', ') : 'None'}`)
      }
    }
  }
}

checkAllData().then(() => {
  console.log('\n✅ Check complete!')
  process.exit(0)
}).catch(error => {
  console.error('Check failed:', error)
  process.exit(1)
})