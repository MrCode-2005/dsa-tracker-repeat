export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          leetcode_username: string | null
          avatar_url: string | null
          current_streak: number
          highest_streak: number
          last_activity_date: string | null
          created_at: string
          youtube_channels: { name: string; color: string }[] | null
        }
        Insert: {
          id: string
          display_name?: string | null
          leetcode_username?: string | null
          avatar_url?: string | null
          current_streak?: number
          highest_streak?: number
          last_activity_date?: string | null
          created_at?: string
          youtube_channels?: { name: string; color: string }[] | null
        }
        Update: {
          id?: string
          display_name?: string | null
          leetcode_username?: string | null
          avatar_url?: string | null
          current_streak?: number
          highest_streak?: number
          last_activity_date?: string | null
          created_at?: string
          youtube_channels?: { name: string; color: string }[] | null
        }
      }
      questions: {
        Row: {
          id: string
          leetcode_number: number | null
          title: string
          slug: string | null
          topic: string | null
          difficulty: 'Easy' | 'Medium' | 'Hard' | null
          companies: string[] | null
          youtube_url: string | null
          video_urls: any | null
          created_at: string
        }
        Insert: {
          id?: string
          leetcode_number?: number | null
          title: string
          slug?: string | null
          topic?: string | null
          difficulty?: 'Easy' | 'Medium' | 'Hard' | null
          companies?: string[] | null
          youtube_url?: string | null
          video_urls?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          leetcode_number?: number | null
          title?: string
          slug?: string | null
          topic?: string | null
          difficulty?: 'Easy' | 'Medium' | 'Hard' | null
          companies?: string[] | null
          youtube_url?: string | null
          video_urls?: any | null
          created_at?: string
        }
      }
      lists: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          source_type: 'preset' | 'imported' | 'custom'
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          source_type?: 'preset' | 'imported' | 'custom'
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          source_type?: 'preset' | 'imported' | 'custom'
          color?: string | null
          created_at?: string
        }
      }
      list_questions: {
        Row: {
          id: string
          list_id: string
          question_id: string
          position: number | null
        }
        Insert: {
          id?: string
          list_id: string
          question_id: string
          position?: number | null
        }
        Update: {
          id?: string
          list_id?: string
          question_id?: string
          position?: number | null
        }
      }
      user_question_progress: {
        Row: {
          id: string
          user_id: string
          question_id: string
          status: 'unsolved' | 'solved'
          first_solved_at: string | null
          last_solved_at: string | null
          times_solved: number
          note: string | null
          is_bookmarked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          status?: 'unsolved' | 'solved'
          first_solved_at?: string | null
          last_solved_at?: string | null
          times_solved?: number
          note?: string | null
          is_bookmarked?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          status?: 'unsolved' | 'solved'
          first_solved_at?: string | null
          last_solved_at?: string | null
          times_solved?: number
          note?: string | null
          is_bookmarked?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      revision_schedule: {
        Row: {
          id: string
          user_id: string
          question_id: string
          cycle_stage: 1 | 3 | 7 | 21
          scheduled_for: string
          completed: boolean
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          cycle_stage: 1 | 3 | 7 | 21
          scheduled_for: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          cycle_stage?: 1 | 3 | 7 | 21
          scheduled_for?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
        }
      }
      bookmark_folders: {
        Row: {
          id: string
          user_id: string
          name: string
          emoji: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          emoji?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          emoji?: string | null
          created_at?: string
        }
      }
      bookmark_items: {
        Row: {
          id: string
          folder_id: string
          question_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          folder_id: string
          question_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          folder_id?: string
          question_id?: string
          user_id?: string
          created_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          user_id: string
          question_id: string
          activity_type: 'solve' | 'revision'
          activity_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          question_id: string
          activity_type: 'solve' | 'revision'
          activity_date?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          question_id?: string
          activity_type?: 'solve' | 'revision'
          activity_date?: string
          created_at?: string
        }
      }
    }
    Views: {
      v_progress_by_difficulty: {
        Row: {
          user_id: string
          difficulty: 'Easy' | 'Medium' | 'Hard' | null
          solved_count: number
          total_count: number
        }
      }
      v_progress_by_topic: {
        Row: {
          user_id: string
          topic: string | null
          solved_count: number
          total_count: number
        }
      }
      v_progress_by_list: {
        Row: {
          list_id: string
          user_id: string
          list_name: string
          color: string | null
          source_type: string
          total_count: number
          solved_count: number
        }
      }
      v_daily_activity: {
        Row: {
          user_id: string
          activity_date: string
          activity_count: number
          solve_count: number
          revision_count: number
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type List = Database['public']['Tables']['lists']['Row']
export type ListQuestion = Database['public']['Tables']['list_questions']['Row']
export type UserQuestionProgress = Database['public']['Tables']['user_question_progress']['Row']
export type RevisionSchedule = Database['public']['Tables']['revision_schedule']['Row']
export type BookmarkFolder = Database['public']['Tables']['bookmark_folders']['Row']
export type BookmarkItem = Database['public']['Tables']['bookmark_items']['Row']
export type ActivityLog = Database['public']['Tables']['activity_log']['Row']

// Extended types for joined queries
export type QuestionWithProgress = Question & {
  progress: UserQuestionProgress | null
  revision_count: { completed: number; total: number }
  current_revision: RevisionSchedule | null
}

export type ListWithProgress = List & {
  total_count: number
  solved_count: number
}

export type RevisionWithQuestion = RevisionSchedule & {
  question: Question
  progress: UserQuestionProgress | null
}

export type BookmarkFolderWithCount = BookmarkFolder & {
  item_count: number
}

// Preset list definitions (for adoption flow)
export const PRESET_LISTS = {
  NEETCODE_150: {
    name: 'NeetCode 150',
    description: 'The 150 essential coding interview questions curated by NeetCode',
    color: '#8B5CF6',
    questionCount: 150,
  },
  BLIND_75: {
    name: 'Blind 75',
    description: 'The original 75 must-do LeetCode questions for coding interviews',
    color: '#10B981',
    questionCount: 75,
    leetcodeNumbers: [1,3,5,7,11,15,19,20,21,23,25,33,39,42,46,48,49,51,53,54,55,56,57,62,66,70,72,73,76,78,79,84,91,97,98,100,102,104,105,115,121,124,125,127,128,130,131,133,134,136,139,141,143,146,152,153,155,167,190,191,198,200,206,207,208,210,211,212,213,215,217,226,230,235,238,242,252,253,261,268,269,271,287,295,297,300,309,312,322,323,329,338,347,371,417,424,435,494,518,572,647,678,695,703,739,746,763,787,846,875,981,994,1046,1143,1448,1584,1851,1899,2013],
  },
} as const
