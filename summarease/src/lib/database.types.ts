// TypeScript types for Supabase database schema
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
      }
      folders: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
      }
      files: {
        Row: {
          id: string
          user_id: string
          folder_id: string | null
          title: string
          file_type: 'audio' | 'pdf' | 'docx' | 'mixed' | 'notebook'
          storage_path: string
          status: 'processing' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          folder_id?: string | null
          title: string
          file_type: 'audio' | 'pdf' | 'docx' | 'mixed' | 'notebook'
          storage_path: string
          status?: 'processing' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          folder_id?: string | null
          title?: string
          file_type?: 'audio' | 'pdf' | 'docx' | 'mixed' | 'notebook'
          storage_path?: string
          status?: 'processing' | 'completed' | 'failed'
          created_at?: string
        }
      }
      transcripts: {
        Row: {
          id: string
          file_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          file_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          file_id?: string
          content?: string
          created_at?: string
        }
      }
      summaries: {
        Row: {
          id: string
          file_id: string
          summary_text: string
          created_at: string
        }
        Insert: {
          id?: string
          file_id: string
          summary_text: string
          created_at?: string
        }
        Update: {
          id?: string
          file_id?: string
          summary_text?: string
          created_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
      }
      summary_tags: {
        Row: {
          summary_id: string
          tag_id: string
        }
        Insert: {
          summary_id: string
          tag_id: string
        }
        Update: {
          summary_id?: string
          tag_id?: string
        }
      }
      flashcards: {
        Row: {
          id: string
          summary_id: string
          front_text: string
          back_text: string
        }
        Insert: {
          id?: string
          summary_id: string
          front_text: string
          back_text: string
        }
        Update: {
          id?: string
          summary_id?: string
          front_text?: string
          back_text?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          summary_id: string
          question: string
          options: string[]
          correct_index: number
        }
        Insert: {
          id?: string
          summary_id: string
          question: string
          options: string[]
          correct_index: number
        }
        Update: {
          id?: string
          summary_id?: string
          question?: string
          options?: string[]
          correct_index?: number
        }
      }
      quiz_attempts: {
        Row: {
          id: string
          quiz_id: string
          user_id: string
          selected_index: number
          is_correct: boolean
          attempted_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          user_id: string
          selected_index: number
          is_correct: boolean
          attempted_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          user_id?: string
          selected_index?: number
          is_correct?: boolean
          attempted_at?: string
        }
      }
      quiz_sets: {
        Row: {
          id: string
          user_id: string
          title: string
          summary_ids: string[]
          question_count: number
          difficulty_level: string
          question_types: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          summary_ids: string[]
          question_count?: number
          difficulty_level?: string
          question_types?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          summary_ids?: string[]
          question_count?: number
          difficulty_level?: string
          question_types?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      quiz_questions: {
        Row: {
          id: string
          quiz_set_id: string
          question_text: string
          question_type: string
          options: string[]
          correct_answer_index: number
          explanation: string | null
          difficulty_level: string
          question_order: number
          created_at: string
        }
        Insert: {
          id?: string
          quiz_set_id: string
          question_text: string
          question_type?: string
          options: string[]
          correct_answer_index: number
          explanation?: string | null
          difficulty_level?: string
          question_order: number
          created_at?: string
        }
        Update: {
          id?: string
          quiz_set_id?: string
          question_text?: string
          question_type?: string
          options?: string[]
          correct_answer_index?: number
          explanation?: string | null
          difficulty_level?: string
          question_order?: number
          created_at?: string
        }
      }
      quiz_sessions: {
        Row: {
          id: string
          quiz_set_id: string
          user_id: string
          started_at: string
          completed_at: string | null
          total_questions: number
          correct_answers: number
          score_percentage: number | null
          time_spent_seconds: number | null
          session_status: string
          created_at: string
        }
        Insert: {
          id?: string
          quiz_set_id: string
          user_id: string
          started_at?: string
          completed_at?: string | null
          total_questions: number
          correct_answers?: number
          score_percentage?: number | null
          time_spent_seconds?: number | null
          session_status?: string
          created_at?: string
        }
        Update: {
          id?: string
          quiz_set_id?: string
          user_id?: string
          started_at?: string
          completed_at?: string | null
          total_questions?: number
          correct_answers?: number
          score_percentage?: number | null
          time_spent_seconds?: number | null
          session_status?: string
          created_at?: string
        }
      }
      quiz_question_attempts: {
        Row: {
          id: string
          quiz_session_id: string
          quiz_question_id: string
          user_answer_index: number | null
          is_correct: boolean | null
          time_spent_seconds: number | null
          attempted_at: string
        }
        Insert: {
          id?: string
          quiz_session_id: string
          quiz_question_id: string
          user_answer_index?: number | null
          is_correct?: boolean | null
          time_spent_seconds?: number | null
          attempted_at?: string
        }
        Update: {
          id?: string
          quiz_session_id?: string
          quiz_question_id?: string
          user_answer_index?: number | null
          is_correct?: boolean | null
          time_spent_seconds?: number | null
          attempted_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_files_with_metadata: {
        Args: {
          user_uuid: string
        }
        Returns: {
          file_id: string
          title: string
          file_type: string
          status: string
          created_at: string
          folder_name: string | null
          summary_text: string | null
          tags: string[] | null
        }[]
      }
      get_knowledge_graph_data: {
        Args: {
          user_uuid: string
        }
        Returns: {
          summary_id: string
          file_title: string
          summary_text: string
          tags: string[]
        }[]
      }
      get_user_quiz_statistics: {
        Args: {
          user_uuid: string
        }
        Returns: {
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
        }[]
      }
      get_user_recent_quiz_performance: {
        Args: {
          user_uuid: string
        }
        Returns: {
          session_id: string
          quiz_title: string
          completed_at: string
          score_percentage: number
          time_spent_minutes: number
          total_questions: number
          correct_answers: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}