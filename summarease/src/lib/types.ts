// Shared types to avoid circular dependencies

export interface Tag {
  name: string
  type: 'general' | 'specific' | 'user_added'
  id?: string // Optional ID for database records
}
