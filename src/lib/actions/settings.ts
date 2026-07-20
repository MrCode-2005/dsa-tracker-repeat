'use server'

import { createClient, getSafeUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function clearAllRevisions() {
  const supabase = await createClient()
  const user = await getSafeUser()

  const { error } = await supabase
    .from('revision_schedule')
    .delete()
    .eq('user_id', user.id)

  if (error) throw error

  // Clear revision history from activity log
  await supabase
    .from('activity_log')
    .delete()
    .eq('user_id', user.id)
    .eq('activity_type', 'revision')

  revalidatePath('/', 'layout')
}

export async function removeProblemFromRevisions(questionId: string) {
  const supabase = await createClient()
  const user = await getSafeUser()

  const { error } = await supabase
    .from('revision_schedule')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', questionId)

  if (error) throw error

  // Clear revision history for this problem
  await supabase
    .from('activity_log')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .eq('activity_type', 'revision')

  revalidatePath('/', 'layout')
}

export async function resetProblemRevisionCount(questionId: string) {
  const supabase = await createClient()
  const user = await getSafeUser()

  // First fetch the progress
  const { data: progress, error: fetchError } = await supabase
    .from('user_question_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .single()

  if (fetchError || !progress) throw new Error('Progress not found')

  const { error } = await supabase
    .from('user_question_progress')
    .update({
      times_solved: 1,
      last_solved_at: progress.first_solved_at || progress.created_at,
    })
    .eq('id', progress.id)

  if (error) throw error

  // Clear revision history for this problem
  await supabase
    .from('activity_log')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .eq('activity_type', 'revision')

  revalidatePath('/', 'layout')
}

export async function unsolveProblem(questionId: string) {
  const supabase = await createClient()
  const user = await getSafeUser()

  const { error } = await supabase
    .from('user_question_progress')
    .update({
      status: 'unsolved',
      times_solved: 0,
      first_solved_at: null,
      last_solved_at: null,
    })
    .eq('user_id', user.id)
    .eq('question_id', questionId)

  if (error) throw error

  // Clear all activity history for this problem
  await supabase
    .from('activity_log')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', questionId)

  revalidatePath('/', 'layout')
}
export async function getManagedData() {
  const supabase = await createClient()
  const user = await getSafeUser()

  // We want to find questions that have EITHER:
  // 1. An entry in revision_schedule
  // 2. An entry in user_question_progress with times_solved > 1

  // Get revision schedule
  const { data: revisions } = await supabase
    .from('revision_schedule')
    .select('question_id, completed, cycle_stage')
    .eq('user_id', user.id)

  // Get progress where times_solved > 1
  const { data: progress } = await supabase
    .from('user_question_progress')
    .select('question_id, times_solved')
    .eq('user_id', user.id)
    .gt('times_solved', 1)

  // Collect unique question IDs
  const questionIds = new Set<string>()
  revisions?.forEach(r => questionIds.add(r.question_id))
  progress?.forEach(p => questionIds.add(p.question_id))

  if (questionIds.size === 0) return []

  // Fetch the actual questions
  const { data: questions } = await supabase
    .from('questions')
    .select('id, title, difficulty')
    .in('id', Array.from(questionIds))

  if (!questions) return []

  // Combine the data
  return questions.map(q => {
    const qRevs = revisions?.filter(r => r.question_id === q.id) || []
    const qProg = progress?.find(p => p.question_id === q.id)

    return {
      id: q.id,
      title: q.title,
      difficulty: q.difficulty,
      revisionsCount: qRevs.length,
      hasActiveRevision: qRevs.some(r => !r.completed),
      timesSolved: qProg?.times_solved || 1,
    }
  })
}

export async function clearAllTestData() {
  const supabase = await createClient()
  const user = await getSafeUser()

  // Delete all activity logs
  await supabase.from('activity_log').delete().eq('user_id', user.id)
  
  // Delete all revision schedules
  await supabase.from('revision_schedule').delete().eq('user_id', user.id)
  
  // Delete all question progress (unsolves everything)
  await supabase.from('user_question_progress').delete().eq('user_id', user.id)

  revalidatePath('/', 'layout')
}

export async function clearAnalyticsAndStreaks() {
  const supabase = await createClient()
  const user = await getSafeUser()

  // Delete all activity logs (this clears the heatmap and cumulative graph)
  await supabase.from('activity_log').delete().eq('user_id', user.id)
  
  // Reset streaks
  await supabase.from('profiles').update({
    current_streak: 0,
    highest_streak: 0,
    last_activity_date: null
  }).eq('id', user.id)

  revalidatePath('/', 'layout')
}

export async function clearHeatmap() {
  const supabase = await createClient()
  const user = await getSafeUser()

  // Delete all activity logs
  await supabase.from('activity_log').delete().eq('user_id', user.id)

  revalidatePath('/', 'layout')
}
