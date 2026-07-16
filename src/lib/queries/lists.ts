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

  if (!lists || lists.length === 0) return []

  // Batch query 1: Get all list_questions for all lists belonging to the user
  const { data: allListQuestions } = await supabase
    .from('list_questions')
    .select('list_id, question_id')
    .in('list_id', lists.map(l => l.id))

  // Map to store question IDs per list
  const listQuestionMap = new Map<string, string[]>()
  // Set to store all unique question IDs across all lists
  const allQuestionIds = new Set<string>()

  allListQuestions?.forEach(lq => {
    if (!listQuestionMap.has(lq.list_id)) listQuestionMap.set(lq.list_id, [])
    listQuestionMap.get(lq.list_id)!.push(lq.question_id)
    allQuestionIds.add(lq.question_id)
  })

  // Batch query 2: Get all solved questions for the user that are in any list
  let userSolvedQuestions = new Set<string>()
  if (allQuestionIds.size > 0) {
    const { data: solvedProgress } = await supabase
      .from('user_question_progress')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('status', 'solved')
      .in('question_id', Array.from(allQuestionIds))
    
    solvedProgress?.forEach(p => userSolvedQuestions.add(p.question_id))
  }

  const results = lists.map(list => {
    const questionIds = listQuestionMap.get(list.id) || []
    const total = questionIds.length
    const solvedCount = questionIds.filter(id => userSolvedQuestions.has(id)).length

    return {
      ...list,
      total_count: total,
      solved_count: solvedCount,
    }
  })

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
