import { supabase } from './supabase'

export interface FeedbackData {
  message: string
  category: string
  userEmail?: string
}

export interface FeedbackResponse {
  success: boolean
  message?: string
  error?: string
}

/**
 * Submit user feedback via Supabase Edge Function
 */
export async function submitFeedback(data: FeedbackData): Promise<FeedbackResponse> {
  try {
    const { data: result, error } = await supabase.functions.invoke('send-feedback', {
      body: {
        message: data.message,
        category: data.category,
        userEmail: data.userEmail,
      },
    })

    if (error) {
      console.error('Error invoking feedback function:', error)
      return {
        success: false,
        error: error.message || 'Failed to send feedback',
      }
    }

    return {
      success: true,
      message: result?.message || 'Feedback sent successfully',
    }
  } catch (error) {
    console.error('Error submitting feedback:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    }
  }
}
