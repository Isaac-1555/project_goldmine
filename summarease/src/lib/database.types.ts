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
    }
    Enums: {
      [_ in never]: never
    }
  }
}