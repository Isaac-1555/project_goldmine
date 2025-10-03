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

// Sample data matching what's shown in the UI
const sampleFiles = [
  {
    title: 'Taj Mahal',
    file_type: 'pdf',
    summary: 'The Taj Mahal is an ivory-white marble mausoleum on the right bank of the Yamuna river in the Indian city of Agra. It was commissioned in 1632 by the Mughal emperor Shah Jahan to house the tomb of his favorite wife, Mumtaz Mahal.',
    tags: ['taj mahal', 'mughal architecture', 'eternal love', 'india', 'world heritage', 'architecture']
  },
  {
    title: 'Burj Khalifa', 
    file_type: 'pdf',
    summary: 'The Burj Khalifa is a skyscraper in Dubai, United Arab Emirates. It is the tallest building in the world, standing at 828 meters (2,717 feet). The building was designed by Adrian Smith and completed in 2010.',
    tags: ['tallest building', 'dubai', 'engineering', 'construction', 'tourism', 'architecture', 'technology']
  },
  {
    title: 'UT 3',
    file_type: 'pdf', 
    summary: 'A comprehensive analysis of urban transport systems focusing on sustainability and efficiency in modern cities.',
    tags: ['indoor gardening', 'grow kit', 'sustainability', 'go-to-market', 'target market', 'budget']
  },
  {
    title: 'AR 1',
    file_type: 'pdf',
    summary: 'An exploration of augmented reality applications in software development and web technologies.',
    tags: ['vibs coding', 'ai coding', 'ai agents', 'software development', 'app development', 'web dev']
  }
]

async function populateSampleData() {
  console.log('🚀 Populating sample data...\n')
  
  // Get or create a user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.log('❌ No user logged in. Please login to the app first.')
    console.log('You can sign up/login at: http://localhost:5173')
    return
  }
  
  console.log(`✓ User ID: ${user.id}\n`)
  
  for (const fileData of sampleFiles) {
    console.log(`📁 Creating file: "${fileData.title}"...`)
    
    // 1. Create file record
    const { data: file, error: fileError } = await supabase
      .from('files')
      .insert({
        title: fileData.title,
        file_type: fileData.file_type,
        status: 'completed',
        user_id: user.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (fileError) {
      console.error(`  ❌ Error creating file:`, fileError)
      continue
    }
    
    console.log(`  ✓ File created (ID: ${file.id})`)
    
    // 2. Create summary
    const { data: summary, error: summaryError } = await supabase
      .from('summaries')
      .insert({
        file_id: file.id,
        summary_text: fileData.summary,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (summaryError) {
      console.error(`  ❌ Error creating summary:`, summaryError)
      continue
    }
    
    console.log(`  ✓ Summary created`)
    
    // 3. Create/link tags
    for (const tagName of fileData.tags) {
      // Check if tag exists
      let { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('name', tagName.toLowerCase())
        .single()
      
      let tagId
      if (existingTag) {
        tagId = existingTag.id
      } else {
        // Create new tag
        const { data: newTag, error: tagError } = await supabase
          .from('tags')
          .insert({ name: tagName.toLowerCase() })
          .select('id')
          .single()
        
        if (tagError) {
          console.error(`    ❌ Error creating tag "${tagName}":`, tagError)
          continue
        }
        tagId = newTag.id
      }
      
      // Link tag to summary
      const { error: linkError } = await supabase
        .from('summary_tags')
        .insert({
          summary_id: summary.id,
          tag_id: tagId
        })
      
      if (linkError && !linkError.message.includes('duplicate')) {
        console.error(`    ❌ Error linking tag "${tagName}":`, linkError)
      }
    }
    
    console.log(`  ✓ Tags linked: ${fileData.tags.join(', ')}\n`)
  }
  
  console.log('✅ Sample data populated successfully!')
  console.log('\nYou can now:')
  console.log('1. Refresh the browser')
  console.log('2. Search for tags like "architecture", "ai coding", etc.')
  console.log('3. The search should now return results!')
}

populateSampleData().then(() => {
  process.exit(0)
}).catch(error => {
  console.error('Population failed:', error)
  process.exit(1)
})