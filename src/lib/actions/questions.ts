'use server'

import { createClient, getSafeUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleQuestionSolved(questionId: string) {
  const supabase = await createClient()
  const user = await getSafeUser()

  // Check existing progress
  const { data: existing } = await supabase
    .from('user_question_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .single()

  const now = new Date().toISOString()

  if (!existing) {
    // First time solving — create progress row as solved
    const { error } = await supabase.from('user_question_progress').insert({
      user_id: user.id,
      question_id: questionId,
      status: 'solved',
      first_solved_at: now,
      last_solved_at: now,
      times_solved: 1,
    })
    if (error) throw error

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      question_id: questionId,
      activity_type: 'solve',
    })
  } else if (existing.status === 'unsolved') {
    // Marking as solved
    const updateData: Record<string, unknown> = {
      status: 'solved',
      last_solved_at: now,
      times_solved: existing.times_solved + 1,
      updated_at: now,
    }
    if (!existing.first_solved_at) {
      updateData.first_solved_at = now
    }

    const { error } = await supabase
      .from('user_question_progress')
      .update(updateData)
      .eq('id', existing.id)
    if (error) throw error

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      question_id: questionId,
      activity_type: 'solve',
    })
  } else {
    // Unmarking — set back to unsolved
    const { error } = await supabase
      .from('user_question_progress')
      .update({ status: 'unsolved', updated_at: now })
      .eq('id', existing.id)
    if (error) throw error
  }

  revalidatePath('/', 'layout')
}

export async function markRevisionComplete(revisionId: string, questionId: string) {
  const supabase = await createClient()
  const user = await getSafeUser()

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('revision_schedule')
    .update({ completed: true, completed_at: now })
    .eq('id', revisionId)
    .eq('user_id', user.id)
  if (error) throw error

  // Log revision activity
  await supabase.from('activity_log').insert({
    user_id: user.id,
    question_id: questionId,
    activity_type: 'revision',
  })

  revalidatePath('/', 'layout')
}

export async function updateQuestionNote(questionId: string, note: string) {
  const supabase = await createClient()
  const user = await getSafeUser()

  const now = new Date().toISOString()

  // Upsert progress with note
  const { data: existing } = await supabase
    .from('user_question_progress')
    .select('id')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .single()

  if (existing) {
    await supabase
      .from('user_question_progress')
      .update({ note, updated_at: now })
      .eq('id', existing.id)
  } else {
    await supabase.from('user_question_progress').insert({
      user_id: user.id,
      question_id: questionId,
      note,
    })
  }
}

export async function toggleBookmarkInFolder(questionId: string, folderId: string) {
  const supabase = await createClient()
  const user = await getSafeUser()

  // Check if already bookmarked in this folder
  const { data: existing } = await supabase
    .from('bookmark_items')
    .select('id')
    .eq('folder_id', folderId)
    .eq('question_id', questionId)
    .single()

  if (existing) {
    await supabase.from('bookmark_items').delete().eq('id', existing.id)
  } else {
    await supabase.from('bookmark_items').insert({
      folder_id: folderId,
      question_id: questionId,
      user_id: user.id,
    })
  }

  revalidatePath('/', 'layout')
}

export async function createBookmarkFolder(name: string, emoji?: string): Promise<{ id: string; user_id: string; name: string; emoji: string | null; created_at: string }> {
  const supabase = await createClient()
  const user = await getSafeUser()

  const { data, error } = await supabase
    .from('bookmark_folders')
    .insert({ user_id: user.id, name, emoji: emoji || '📌' })
    .select()
    .single()
  if (error) throw error

  revalidatePath('/', 'layout')
  return data as { id: string; user_id: string; name: string; emoji: string | null; created_at: string }
}

export async function deleteBookmarkFolder(folderId: string) {
  const supabase = await createClient()
  const user = await getSafeUser()

  await supabase.from('bookmark_folders').delete().eq('id', folderId).eq('user_id', user.id)
  revalidatePath('/', 'layout')
}

export async function scheduleQuestionRevision(questionId: string) {
  const supabase = await createClient()
  const user = await getSafeUser()

  const now = new Date()

  // Spaced repetition cycle: 1, 3, 7, 21 days
  const CYCLE_DAYS = [1, 3, 7, 21]

  // Check existing revision schedule for this question
  const { data: existing } = await supabase
    .from('revision_schedule')
    .select('cycle_stage')
    .eq('user_id', user.id)
    .eq('question_id', questionId)
    .eq('completed', false)
    .order('cycle_stage', { ascending: false })
    .limit(1)

  const lastStage = existing?.[0]?.cycle_stage || 0
  const nextStage = Math.min(lastStage + 1, CYCLE_DAYS.length)

  if (nextStage > CYCLE_DAYS.length) {
    // Already has all cycles scheduled — just confirm
    return
  }

  const daysUntilRevision = CYCLE_DAYS[nextStage - 1]
  const scheduledDate = new Date(now)
  scheduledDate.setDate(scheduledDate.getDate() + daysUntilRevision)

  const { error } = await supabase.from('revision_schedule').insert({
    user_id: user.id,
    question_id: questionId,
    scheduled_for: scheduledDate.toISOString().split('T')[0],
    cycle_stage: nextStage,
  })

  if (error) throw error
  revalidatePath('/', 'layout')
}
