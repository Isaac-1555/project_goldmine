import { supabase } from './supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

// Types for quiz functionality
export interface QuizQuestion {
  id: string
  quiz_set_id: string
  question_text: string
  question_type: 'mcq' | 'true-false' | 'fill-blank' | 'short-answer'
  options: string[]
  correct_answer_index: number
  explanation?: string
  difficulty_level: 'easy' | 'medium' | 'hard'
  question_order: number
  created_at: string
}

export interface QuizSet {
  id: string
  user_id: string
  title: string
  summary_ids: string[]
  question_count: number
  difficulty_level: 'easy' | 'medium' | 'hard' | 'mixed'
  question_types: string[]
  created_at: string
  updated_at: string
  questions?: QuizQuestion[]
}

export interface QuizSession {
  id: string
  quiz_set_id: string
  user_id: string
  started_at: string
  completed_at?: string
  total_questions: number
  correct_answers: number
  score_percentage?: number
  time_spent_seconds?: number
  session_status: 'in_progress' | 'completed' | 'abandoned'
  created_at: string
}

export interface QuizQuestionAttempt {
  id: string
  quiz_session_id: string
  quiz_question_id: string
  user_answer_index?: number
  is_correct?: boolean
  time_spent_seconds?: number
  attempted_at: string
}

export interface QuizGenerationRequest {
  summaryTexts: string[]
  summaryIds: string[]
  title: string
  questionCount?: number
  questionTypes?: string[]
  difficultyLevel?: 'easy' | 'medium' | 'hard' | 'mixed'
}

export interface GeneratedQuizData {
  question: string
  options: string[]
  correctAnswerIndex: number
  explanation?: string
}

export interface QuizStatistics {
  total_quizzes_created: number
  total_quizzes_taken: number
  total_sessions: number
  completed_sessions: number
  average_score: number
  total_questions_answered: number
  total_correct_answers: number
  accuracy_percentage: number
  total_time_spent_minutes: number
  average_session_time_minutes: number
}

export interface RecentQuizPerformance {
  session_id: string
  quiz_title: string
  completed_at: string
  score_percentage: number
  time_spent_minutes: number
  total_questions: number
  correct_answers: number
}

/**
 * Generate quiz questions using Gemini AI
 */
export async function generateQuizWithAI(
  combinedSummaryText: string,
  questionCount: number = 5
): Promise<GeneratedQuizData[]> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your-gemini-api-key') {
    throw new Error('Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file')
  }

  if (!combinedSummaryText.trim()) {
    throw new Error('No content provided for quiz generation')
  }

  console.log(`Generating quiz from ${combinedSummaryText.length} characters of content`)

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  // Use the structured prompt from the spec document
  const prompt = `You are an expert exam creator. Your task is to generate a multiple-choice quiz based on the provided text summary.

**Instructions:**
1. Read the text summary carefully.
2. Generate exactly ${questionCount} multiple-choice questions.
3. Each question must have exactly 4 options.
4. One of the options must be the correct answer.
5. The output **MUST** be a valid JSON array of objects.
6. Do not include any text, explanations, or markdown formatting outside of the main JSON array. The entire response body must be parseable as JSON.

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

Now, generate the quiz based on the text summary above.`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    let responseText = response.text()

    // Clean the response to ensure it's a clean JSON string
    // Gemini might wrap the JSON in markdown backticks
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

    if (quizData.length !== questionCount) {
      console.warn(`Expected ${questionCount} questions, got ${quizData.length}`)
    }

    return quizData

  } catch (error: any) {
    console.error('Error generating quiz with AI:', error)
    throw new Error(`Failed to generate quiz: ${error.message}`)
  }
}

/**
 * Create and save a complete quiz set with questions
 */
export async function createQuizSet(request: QuizGenerationRequest): Promise<QuizSet> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // Merge all summary texts
    const combinedSummaryText = request.summaryTexts.join('\n\n--- --- ---\n\n')
    
    // Generate questions using AI
    const generatedQuestions = await generateQuizWithAI(
      combinedSummaryText,
      request.questionCount || 5
    )

    if (generatedQuestions.length === 0) {
      throw new Error('No questions were generated')
    }

    // Create the quiz set
    const { data: quizSet, error: quizSetError } = await supabase
      .from('quiz_sets')
      .insert({
        user_id: user.user.id,
        title: request.title,
        summary_ids: request.summaryIds,
        question_count: generatedQuestions.length,
        difficulty_level: request.difficultyLevel || 'mixed',
        question_types: request.questionTypes || ['mcq']
      })
      .select()
      .single()

    if (quizSetError) throw quizSetError

    // Create individual questions
    const questionsToInsert = generatedQuestions.map((q, index) => ({
      quiz_set_id: quizSet.id,
      question_text: q.question,
      question_type: 'mcq' as const,
      options: q.options,
      correct_answer_index: q.correctAnswerIndex,
      explanation: q.explanation || null,
      difficulty_level: 'medium' as const, // Default for now
      question_order: index + 1
    }))

    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert)
      .select()

    if (questionsError) {
      // Cleanup: delete the quiz set if questions failed to insert
      await supabase.from('quiz_sets').delete().eq('id', quizSet.id)
      throw questionsError
    }

    return {
      ...quizSet,
      questions: questions
    }

  } catch (error: any) {
    console.error('Error creating quiz set:', error)
    throw error
  }
}

/**
 * Get all quiz sets for the current user
 */
export async function getUserQuizSets(): Promise<QuizSet[]> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase
      .from('quiz_sets')
      .select('*')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []

  } catch (error: any) {
    console.error('Error fetching user quiz sets:', error)
    return []
  }
}

/**
 * Get a specific quiz set with its questions
 */
export async function getQuizSetById(quizSetId: string): Promise<QuizSet | null> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data: quizSet, error: quizSetError } = await supabase
      .from('quiz_sets')
      .select('*')
      .eq('id', quizSetId)
      .eq('user_id', user.user.id) // Ensure user owns this quiz
      .single()

    if (quizSetError) throw quizSetError

    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_set_id', quizSetId)
      .order('question_order')

    if (questionsError) throw questionsError

    return {
      ...quizSet,
      questions: questions
    }

  } catch (error: any) {
    console.error('Error fetching quiz set:', error)
    return null
  }
}

/**
 * Start a new quiz session
 */
export async function startQuizSession(quizSetId: string): Promise<QuizSession> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // Get quiz set to validate and get question count
    const quizSet = await getQuizSetById(quizSetId)
    if (!quizSet) {
      throw new Error('Quiz set not found')
    }

    const { data: session, error } = await supabase
      .from('quiz_sessions')
      .insert({
        quiz_set_id: quizSetId,
        user_id: user.user.id,
        total_questions: quizSet.question_count,
        session_status: 'in_progress'
      })
      .select()
      .single()

    if (error) throw error
    return session

  } catch (error: any) {
    console.error('Error starting quiz session:', error)
    throw error
  }
}

/**
 * Submit an answer for a question in a quiz session
 */
export async function submitQuestionAnswer(
  sessionId: string,
  questionId: string,
  answerIndex: number,
  timeSpent: number
): Promise<QuizQuestionAttempt> {
  try {
    // First, get the question to check the correct answer
    const { data: question, error: questionError } = await supabase
      .from('quiz_questions')
      .select('correct_answer_index')
      .eq('id', questionId)
      .single()

    if (questionError) throw questionError

    const isCorrect = answerIndex === question.correct_answer_index

    // Insert or update the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_question_attempts')
      .upsert({
        quiz_session_id: sessionId,
        quiz_question_id: questionId,
        user_answer_index: answerIndex,
        is_correct: isCorrect,
        time_spent_seconds: timeSpent
      })
      .select()
      .single()

    if (attemptError) throw attemptError
    return attempt

  } catch (error: any) {
    console.error('Error submitting question answer:', error)
    throw error
  }
}

/**
 * Complete a quiz session
 */
export async function completeQuizSession(
  sessionId: string,
  totalTimeSpent: number
): Promise<QuizSession> {
  try {
    const { data: session, error } = await supabase
      .from('quiz_sessions')
      .update({
        completed_at: new Date().toISOString(),
        time_spent_seconds: totalTimeSpent,
        session_status: 'completed'
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return session

  } catch (error: any) {
    console.error('Error completing quiz session:', error)
    throw error
  }
}

/**
 * Get quiz session with all attempts
 */
export async function getQuizSessionDetails(sessionId: string) {
  try {
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .select(`
        *,
        quiz_sets (
          title,
          question_count
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError) throw sessionError

    const { data: attempts, error: attemptsError } = await supabase
      .from('quiz_question_attempts')
      .select(`
        *,
        quiz_questions (
          question_text,
          options,
          correct_answer_index,
          explanation,
          question_order
        )
      `)
      .eq('quiz_session_id', sessionId)
      .order('quiz_questions(question_order)')

    if (attemptsError) throw attemptsError

    return {
      session,
      attempts
    }

  } catch (error: any) {
    console.error('Error fetching quiz session details:', error)
    throw error
  }
}

/**
 * Get user quiz statistics
 */
export async function getUserQuizStatistics(): Promise<QuizStatistics | null> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase.rpc('get_user_quiz_statistics', {
      user_uuid: user.user.id
    })

    if (error) throw error
    return data && data.length > 0 ? data[0] : null

  } catch (error: any) {
    console.error('Error fetching quiz statistics:', error)
    return null
  }
}

/**
 * Get user's recent quiz performance
 */
export async function getUserRecentQuizPerformance(): Promise<RecentQuizPerformance[]> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    const { data, error } = await supabase.rpc('get_user_recent_quiz_performance', {
      user_uuid: user.user.id
    })

    if (error) throw error
    return data || []

  } catch (error: any) {
    console.error('Error fetching recent quiz performance:', error)
    return []
  }
}

/**
 * Delete a quiz set and all related data
 */
export async function deleteQuizSet(quizSetId: string): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) {
      throw new Error('User not authenticated')
    }

    // Delete the quiz set (cascading deletes will handle related data)
    const { error } = await supabase
      .from('quiz_sets')
      .delete()
      .eq('id', quizSetId)
      .eq('user_id', user.user.id) // Ensure user owns this quiz

    if (error) throw error
    return true

  } catch (error: any) {
    console.error('Error deleting quiz set:', error)
    return false
  }
}