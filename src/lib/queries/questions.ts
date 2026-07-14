import { createClient } from '@/lib/supabase/client'
import type { QuestionWithProgress } from '@/lib/types/database'

export interface QuestionFilters {
  search?: string
  status?: 'all' | 'solved' | 'unsolved'
  difficulty?: 'all' | 'Easy' | 'Medium' | 'Hard'
  companies?: string[]
  topic?: string
}

export async function getListQuestions(
  listId: string,
  filters: QuestionFilters = {}
): Promise<QuestionWithProgress[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // Get list question IDs
  const { data: listQuestions } = await supabase
    .from('list_questions')
    .select('question_id, position')
    .eq('list_id', listId)
    .order('position')

  if (!listQuestions || listQuestions.length === 0) return []

  const questionIds = listQuestions.map(lq => lq.question_id)

  // Get questions
  let questionQuery = supabase
    .from('questions')
    .select('*')
    .in('id', questionIds)

  if (filters.difficulty && filters.difficulty !== 'all') {
    questionQuery = questionQuery.eq('difficulty', filters.difficulty)
  }

  if (filters.topic && filters.topic !== 'all') {
    questionQuery = questionQuery.eq('topic', filters.topic)
  }

  if (filters.search) {
    const search = filters.search.trim()
    // Check if search is a number (leetcode number)
    const isNumber = /^\d+$/.test(search)
    if (isNumber) {
      questionQuery = questionQuery.eq('leetcode_number', parseInt(search))
    } else {
      questionQuery = questionQuery.ilike('title', `%${search}%`)
    }
  }

  if (filters.companies && filters.companies.length > 0) {
    questionQuery = questionQuery.overlaps('companies', filters.companies)
  }

  const { data: questions } = await questionQuery
  if (!questions) return []

  // Get progress for these questions
  const { data: progressData } = await supabase
    .from('user_question_progress')
    .select('*')
    .eq('user_id', user.id)
    .in('question_id', questions.map(q => q.id))

  // Get revision data
  const { data: revisionData } = await supabase
    .from('revision_schedule')
    .select('*')
    .eq('user_id', user.id)
    .in('question_id', questions.map(q => q.id))

  const progressMap = new Map(progressData?.map(p => [p.question_id, p]) || [])
  const revisionMap = new Map<string, { completed: number; total: number; current: typeof revisionData extends Array<infer T> ? T : never | null }>()

  const today = new Date().toISOString().split('T')[0]

  questions.forEach(q => {
    const revisions = revisionData?.filter(r => r.question_id === q.id) || []
    const completed = revisions.filter(r => r.completed).length
    const currentDue = revisions.find(r => !r.completed && r.scheduled_for <= today) || null
    revisionMap.set(q.id, { completed, total: revisions.length, current: currentDue })
  })

  // Build result with position ordering
  const positionMap = new Map(listQuestions.map(lq => [lq.question_id, lq.position]))

  let result: QuestionWithProgress[] = questions.map(q => ({
    ...q,
    progress: progressMap.get(q.id) || null,
    revision_count: revisionMap.get(q.id) || { completed: 0, total: 0 },
    current_revision: revisionMap.get(q.id)?.current || null,
  }))

  // Apply status filter
  if (filters.status === 'solved') {
    result = result.filter(q => q.progress?.status === 'solved')
  } else if (filters.status === 'unsolved') {
    result = result.filter(q => !q.progress || q.progress.status === 'unsolved')
  }

  // Sort by position
  result.sort((a, b) => (positionMap.get(a.id) || 0) - (positionMap.get(b.id) || 0))

  return result
}

export async function getAllCompanies(): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('questions')
    .select('companies')

  if (!data) return []

  const companiesSet = new Set<string>()
  data.forEach(q => {
    q.companies?.forEach((c: string) => companiesSet.add(c))
  })

  return Array.from(companiesSet).sort()
}
