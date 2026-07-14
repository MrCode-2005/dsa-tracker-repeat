import { createClient } from '@/lib/supabase/client'
import type { ListWithProgress, Database } from '@/lib/types/database'

export async function getUserLists(): Promise<ListWithProgress[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: lists } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!lists) return []

  // Get question counts and solved counts per list
  const results = await Promise.all(
    lists.map(async (list) => {
      const { data: listQuestions } = await supabase
        .from('list_questions')
        .select('question_id')
        .eq('list_id', list.id)

      const total = listQuestions?.length || 0

      if (total === 0) {
        return { ...list, total_count: 0, solved_count: 0 }
      }

      const questionIds = listQuestions!.map(lq => lq.question_id)

      const { count: solvedCount } = await supabase
        .from('user_question_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'solved')
        .in('question_id', questionIds)

      return {
        ...list,
        total_count: total,
        solved_count: solvedCount || 0,
      }
    })
  )

  return results
}

export async function getListDetails(listId: string): Promise<Database['public']['Tables']['lists']['Row'] | null> {
  const supabase = createClient()

  const { data } = await supabase
    .from('lists')
    .select('*')
    .eq('id', listId)
    .single()

  return data as Database['public']['Tables']['lists']['Row'] | null
}
