import { createClient } from '@/lib/supabase/client'
import type { RevisionWithQuestion } from '@/lib/types/database'

export async function getRevisionsDue(range: 'today' | 'week' | 'month' | 'year' | 'custom' = 'today', customStart?: string, customEnd?: string): Promise<{ overdue: RevisionWithQuestion[]; due: RevisionWithQuestion[] }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { overdue: [], due: [] }

  const today = new Date().toISOString().split('T')[0]

  let startDate = today
  let endDate = today

  if (range === 'week') {
    const d = new Date()
    d.setDate(d.getDate() + 6)
    endDate = d.toISOString().split('T')[0]
  } else if (range === 'month') {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    endDate = d.toISOString().split('T')[0]
  } else if (range === 'year') {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    endDate = d.toISOString().split('T')[0]
  } else if (range === 'custom' && customStart && customEnd) {
    startDate = customStart
    endDate = customEnd
  }

  // Get overdue (past due, not completed)
  const { data: overdueData } = await supabase
    .from('revision_schedule')
    .select('*, question:questions(*)')
    .eq('user_id', user.id)
    .eq('completed', false)
    .lt('scheduled_for', today)
    .order('scheduled_for', { ascending: true })

  // Get due in range
  const { data: dueData } = await supabase
    .from('revision_schedule')
    .select('*, question:questions(*)')
    .eq('user_id', user.id)
    .eq('completed', false)
    .gte('scheduled_for', startDate)
    .lte('scheduled_for', endDate)
    .order('scheduled_for', { ascending: true })

  // Get progress for all questions
  const allQuestionIds = [
    ...(overdueData?.map(r => r.question_id) || []),
    ...(dueData?.map(r => r.question_id) || []),
  ]

  const { data: progressData } = await supabase
    .from('user_question_progress')
    .select('*')
    .eq('user_id', user.id)
    .in('question_id', allQuestionIds)

  const progressMap = new Map(progressData?.map(p => [p.question_id, p]) || [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRevision = (r: any): RevisionWithQuestion => ({
    ...r,
    question: r.question as RevisionWithQuestion['question'],
    progress: progressMap.get(r.question_id) || null,
  })

  return {
    overdue: overdueData?.map(mapRevision) || [],
    due: dueData?.map(mapRevision) || [],
  }
}

export async function getRevisionsUpcoming(range: 'today' | 'week' | 'month' | 'custom' = 'week', customStart?: string, customEnd?: string): Promise<RevisionWithQuestion[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const today = new Date().toISOString().split('T')[0]
  let startDate = today
  let endDate = today

  if (range === 'week') {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    endDate = d.toISOString().split('T')[0]
  } else if (range === 'month') {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    endDate = d.toISOString().split('T')[0]
  } else if (range === 'custom' && customStart && customEnd) {
    startDate = customStart
    endDate = customEnd
  }

  let query = supabase
    .from('revision_schedule')
    .select('*, question:questions(*)')
    .eq('user_id', user.id)
    .eq('completed', false)
    .order('scheduled_for', { ascending: true })

  if (range === 'custom') {
    query = query.gte('scheduled_for', startDate).lte('scheduled_for', endDate)
  } else {
    query = query.gt('scheduled_for', today).lte('scheduled_for', endDate)
  }

  const { data } = await query

  return (data?.map(r => ({
    ...r,
    question: r.question as unknown as RevisionWithQuestion['question'],
    progress: null,
  })) || [])
}

export async function getRevisionStats() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { total: 0, completed: 0, pending: 0, overdue: 0 }

  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('revision_schedule')
    .select('completed, scheduled_for')
    .eq('user_id', user.id)

  if (!data) return { total: 0, completed: 0, pending: 0, overdue: 0 }

  const total = data.length
  const completed = data.filter(r => r.completed).length
  const overdue = data.filter(r => !r.completed && r.scheduled_for < today).length
  const pending = total - completed - overdue

  return { total, completed, pending, overdue }
}
