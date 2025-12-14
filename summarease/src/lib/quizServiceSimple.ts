import { supabase } from './supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

/**
 * Calculate optimal question count based on content length
 */
function getOptimalQuestionCount(contentLength: number): number {
  if (contentLength < 500) {
    return 4 // Short content: 3-5 questions
  } else if (contentLength < 2000) {
    return 7 // Medium content: 5-10 questions
  } else if (contentLength < 5000) {
    return 15 // Long content: 10-20 questions
  } else {
    return Math.min(30, Math.floor(contentLength / 200)) // Very long: up to 30 questions
  }
}

/**
 * Remove duplicate questions based on similarity
 */
function removeDuplicateQuestions(questions: GeneratedQuizData[]): GeneratedQuizData[] {
  const uniqueQuestions: GeneratedQuizData[] = []
  const seenQuestions = new Set<string>()
  
  for (const question of questions) {
    // Normalize question text for comparison
    const normalizedQuestion = question.question.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '')
    
    // Check if this question is too similar to existing ones
    let isDuplicate = false
    for (const seen of seenQuestions) {
      // Simple similarity check - if 80% of words match, consider it a duplicate
      const similarity = calculateSimilarity(normalizedQuestion, seen)
      if (similarity > 0.8) {
        isDuplicate = true
        break
      }
    }
    
    if (!isDuplicate) {
      uniqueQuestions.push(question)
      seenQuestions.add(normalizedQuestion)
    }
  }
  
  return uniqueQuestions
}

/**
 * Calculate similarity between two strings (simple word-based approach)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(' ').filter(w => w.length > 2)
  const words2 = str2.split(' ').filter(w => w.length > 2)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  const commonWords = words1.filter(word => words2.includes(word))
  return commonWords.length / Math.max(words1.length, words2.length)
}

// Simple types that match the existing database schema
export interface SimpleQuiz {
  id: string
  summary_id: string
  question: string
  options: string[]
  correct_index: number
  created_at?: string
}

export interface SimpleQuizAttempt {
  id: string
  quiz_id: string
  user_id: string
  selected_index: number
  is_correct: boolean
  attempted_at: string
}

export interface SimpleQuizSet {
  id: string // This will be the first quiz's ID for simplicity
  title: string
  questions: SimpleQuiz[]
  created_at: string
  summary_id: string
}

export interface GeneratedQuizData {
  question: string
  options: string[]
  correctAnswerIndex: number
}

/**
 * Generate quiz questions using Gemini AI
 */
export async function generateQuizWithAI(
  combinedSummaryText: string
): Promise<GeneratedQuizData[]> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key') {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file')
  }

  if (!combinedSummaryText.trim()) {
    throw new Error('No content provided for quiz generation')
  }

  const contentLength = combinedSummaryText.length
  console.log(`Generating quiz from ${contentLength} characters of content`)

  // Dynamic question count based on content length
  const estimatedQuestionCount = getOptimalQuestionCount(contentLength)
  
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  // Updated prompt that allows flexible question count
  const prompt = `You are an expert exam creator. Your task is to generate a multiple-choice quiz based on the provided text summary.

**Instructions:**
1. Read the text summary carefully.
2. Generate as many UNIQUE, NON-REPETITIVE multiple-choice questions as you can based on the content.
3. Aim for approximately ${estimatedQuestionCount} questions, but prioritize quality and uniqueness over hitting an exact number.
4. DO NOT create duplicate or very similar questions.
5. Each question must have exactly 4 options.
6. One of the options must be the correct answer.
7. Questions should cover different aspects and topics from the content.
8. The output **MUST** be a valid JSON array of objects.
9. Do not include any text, explanations, or markdown formatting outside of the main JSON array.

**Content Guidelines:**
- For short content (< 500 chars): Generate 3-5 questions
- For medium content (500-2000 chars): Generate 5-10 questions  
- For long content (2000-5000 chars): Generate 10-20 questions
- For very long content (> 5000 chars): Generate 20+ questions

**Quality over Quantity:**
- If the content only supports 3 unique questions, generate only 3
- If the content supports 25 unique questions, generate all 25
- Never repeat questions or create near-duplicates

**JSON Object Structure:**
Each object in the array must have the following keys:
- "question": A string containing the question text.
- "options": An array of 4 strings, representing the possible answers.
- "correctAnswerIndex": An integer (0, 1, 2, or 3) representing the index of the correct answer in the "options" array.

**Example of the required JSON output format:**
[
  {
    "question": "What is the primary pigment used in photosynthesis?",
    "options": [
      "Chlorophyll",
      "Carotene", 
      "Xanthophyll",
      "Anthocyanin"
    ],
    "correctAnswerIndex": 0
  }
]

---
**Text Summary to use:**

${combinedSummaryText}
---

Now, generate the quiz based on the text summary above. Remember: prioritize unique, high-quality questions over hitting a specific number.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    let responseText = response.text()

    // Clean the response to ensure it's a clean JSON string
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim()

    // Parse and validate the response
    let quizData: GeneratedQuizData[]
    try {
      quizData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText)
      throw new Error('AI returned malformed JSON response')
    }

    // Validate the structure
    if (!Array.isArray(quizData)) {
      throw new Error('AI response is not an array')
    }

    if (quizData.length === 0) {
      throw new Error('No questions were generated')
    }

    for (const [index, question] of quizData.entries()) {
      if (!question.question || typeof question.question !== 'string') {
        throw new Error(`Question ${index + 1}: Missing or invalid question text`)
      }
      
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        throw new Error(`Question ${index + 1}: Must have exactly 4 options`)
      }

      if (typeof question.correctAnswerIndex !== 'number' || 
          question.correctAnswerIndex < 0 || 
          question.correctAnswerIndex > 3) {
        throw new Error(`Question ${index + 1}: Invalid correctAnswerIndex (must be 0-3)`)
      }

      // Ensure all options are strings
      question.options = question.options.map(opt => String(opt).trim())
    }

    // Remove any duplicate questions
    const uniqueQuestions = removeDuplicateQuestions(quizData)
    
    console.log(`Generated ${quizData.length} questions, ${uniqueQuestions.length} unique questions after deduplication`)
    
    if (uniqueQuestions.length === 0) {
      throw new Error('No unique questions could be generated from the content')
    }

    return uniqueQuestions

  } catch (error: any) {
    console.error('Error generating quiz with AI:', error)
    throw new Error(`Failed to generate quiz: ${error.message}`)
  }
}

/**
 * Create a quiz from multiple summaries - simplified version
 */
export async function createSimpleQuiz(
  summaryTexts: string[],
  fileIds: string[],
  title: string
): Promise<SimpleQuizSet> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // Get the first file's summary ID for storage (simplified approach)
    const { data: summaries, error: summariesError } = await supabase
      .from('summaries')
      .select('id')
      .in('file_id', fileIds)
      .limit(1)

    if (summariesError) throw summariesError
    
    if (!summaries || summaries.length === 0) {
      throw new Error('No summaries found for selected files')
    }

    const summaryId = summaries[0].id

    // Merge all summary texts
    const combinedSummaryText = summaryTexts.join('\n\n--- --- ---\n\n')
    
    // Generate questions using AI
    const generatedQuestions = await generateQuizWithAI(combinedSummaryText)

    if (generatedQuestions.length === 0) {
      throw new Error('No questions were generated')
    }

    // Insert questions into the database
    const insertedQuestions: SimpleQuiz[] = []
    
    for (const generatedQ of generatedQuestions) {
      const { data: insertedQ, error: insertError } = await supabase
        .from('quizzes')
        .insert({
          summary_id: summaryId,
          question: generatedQ.question,
          options: generatedQ.options,
          correct_index: generatedQ.correctAnswerIndex
        })
        .select()
        .single()

      if (insertError) throw insertError
      insertedQuestions.push(insertedQ)
    }

    // Create the quiz set object with the first question's ID as the set ID
    const quizSet: SimpleQuizSet = {
      id: insertedQuestions[0].id, // Use first question's ID as quiz set ID
      title,
      questions: insertedQuestions,
      created_at: insertedQuestions[0].created_at || new Date().toISOString(),
      summary_id: summaryId
    }

    return quizSet

  } catch (error: any) {
    console.error('Error creating simple quiz:', error)
    throw error
  }
}

/**
 * Get user's quiz sets (grouped by related questions)
 */
export async function getUserSimpleQuizzes(): Promise<SimpleQuizSet[]> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // Get all quizzes for summaries owned by the user
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        summaries!inner(
          file_id,
          created_at,
          files!inner(
            id,
            user_id,
            title
          )
        )
      `)
      .eq('summaries.files.user_id', user.user.id)

    if (error) throw error

    if (!quizzes || quizzes.length === 0) {
      return []
    }

    // Group quizzes by summary_id and create quiz sets
    const quizGroups: { [key: string]: SimpleQuiz[] } = {}
    const fileInfo: { [key: string]: { title: string; created_at: string } } = {}

    for (const quiz of quizzes) {
      const summaryId = quiz.summary_id
      if (!quizGroups[summaryId]) {
        quizGroups[summaryId] = []
      }
      quizGroups[summaryId].push(quiz)
      
      if (!fileInfo[summaryId] && quiz.summaries) {
        const file = (quiz.summaries as any).files
        const summary = quiz.summaries as any
        fileInfo[summaryId] = {
          title: `Quiz: ${file.title}`,
          created_at: quiz.created_at || summary.created_at || new Date().toISOString() // Use quiz's created_at, fallback to summary, then current time
        }
      }
    }

    // Convert groups to quiz sets
    const quizSets: SimpleQuizSet[] = []
    for (const [summaryId, questions] of Object.entries(quizGroups)) {
      if (questions.length > 0) {
        const info = fileInfo[summaryId] || { title: 'Quiz', created_at: new Date().toISOString() }
        quizSets.push({
          id: questions[0].id, // Use first question ID as set ID
          title: info.title,
          questions,
          created_at: info.created_at,
          summary_id: summaryId
        })
      }
    }

    return quizSets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  } catch (error: any) {
    console.error('Error fetching user quizzes:', error)
    return []
  }
}

/**
 * Get a specific quiz set by ID
 */
export async function getSimpleQuizById(quizId: string): Promise<SimpleQuizSet | null> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // First get the quiz to find its summary_id
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('summary_id')
      .eq('id', quizId)
      .single()

    if (quizError) throw quizError

    // Get all questions for this summary
    const { data: questions, error: questionsError } = await supabase
      .from('quizzes')
      .select(`
        *,
        summaries!inner(
          file_id,
          created_at,
          files!inner(
            user_id,
            title
          )
        )
      `)
      .eq('summary_id', quiz.summary_id)
      .eq('summaries.files.user_id', user.user.id)

    if (questionsError) throw questionsError

    if (!questions || questions.length === 0) {
      return null
    }

    const file = (questions[0].summaries as any).files
    const summary = questions[0].summaries as any
    
    return {
      id: questions[0].id,
      title: `Quiz: ${file.title}`,
      questions,
      created_at: summary.created_at, // Use summary's created_at
      summary_id: quiz.summary_id
    }

  } catch (error: any) {
    console.error('Error fetching quiz by ID:', error)
    return null
  }
}

/**
 * Submit a quiz attempt
 */
export async function submitQuizAttempt(
  quizId: string,
  selectedIndex: number
): Promise<SimpleQuizAttempt> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // Get the correct answer for validation
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('correct_index')
      .eq('id', quizId)
      .single()

    if (quizError) throw quizError

    const isCorrect = selectedIndex === quiz.correct_index

    // Insert the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({
        quiz_id: quizId,
        user_id: user.user.id,
        selected_index: selectedIndex,
        is_correct: isCorrect
      })
      .select()
      .single()

    if (attemptError) throw attemptError

    return attempt

  } catch (error: any) {
    console.error('Error submitting quiz attempt:', error)
    throw error
  }
}

/**
 * Get user's quiz attempts for a specific quiz
 */
export async function getQuizAttempts(quizId: string): Promise<SimpleQuizAttempt[]> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('user_id', user.user.id)
      .order('attempted_at', { ascending: false })

    if (error) throw error
    return attempts || []

  } catch (error: any) {
    console.error('Error fetching quiz attempts:', error)
    return []
  }
}

/**
 * Delete a quiz set (all questions for a given summary_id)
 */
export async function deleteSimpleQuiz(summaryId: string): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // First, verify the user owns these quizzes
    const { data: quizzes, error: verifyError } = await supabase
      .from('quizzes')
      .select(`
        id,
        summaries!inner(
          files!inner(
            user_id
          )
        )
      `)
      .eq('summary_id', summaryId)
      .eq('summaries.files.user_id', user.user.id)

    if (verifyError) throw verifyError
    
    if (!quizzes || quizzes.length === 0) {
      throw new Error('Quiz not found or you do not have permission to delete it')
    }

    const quizIds = quizzes.map(q => q.id)

    // Delete all quiz attempts for these questions first
    const { error: attemptsError } = await supabase
      .from('quiz_attempts')
      .delete()
      .in('quiz_id', quizIds)

    if (attemptsError) throw attemptsError

    // Delete all quiz questions for this summary
    const { error: quizzesError } = await supabase
      .from('quizzes')
      .delete()
      .eq('summary_id', summaryId)

    if (quizzesError) throw quizzesError

  } catch (error: any) {
    console.error('Error deleting quiz:', error)
    throw error
  }
}
