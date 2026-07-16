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
    const lastSolvedDate = existing.last_solved_at ? existing.last_solved_at.split('T')[0] : null
    const todayDate = now.split('T')[0]

    const updateData: Record<string, unknown> = {
      status: 'solved',
      updated_at: now,
    }

    if (!existing.first_solved_at) {
      updateData.first_solved_at = now
    }

    // Only increment times_solved if it's on a different day to prevent spam from rapid toggling
    if (lastSolvedDate !== todayDate) {
      updateData.last_solved_at = now
      updateData.times_solved = existing.times_solved + 1
    }

    const { error } = await supabase
      .from('user_question_progress')
      .update(updateData)
      .eq('id', existing.id)
    if (error) throw error

    // Log activity only if we actually incremented the count (or if it's somehow first solve)
    if (lastSolvedDate !== todayDate) {
      await supabase.from('activity_log').insert({
        user_id: user.id,
        question_id: questionId,
        activity_type: existing.times_solved > 0 ? 'revision' : 'solve',
      })
    }
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

export async function updateConfidenceRating(questionId: string, rating: number | null) {
  const supabase = await createClient()
  const user = await getSafeUser()

  // UPSERT pattern to ensure row exists
  const { error } = await supabase
    .from('user_question_progress')
    .upsert(
      {
        user_id: user.id,
        question_id: questionId,
        confidence_rating: rating,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,question_id' }
    )

  if (error) throw error
  revalidatePath('/', 'layout')
}

export async function updatePerceivedDifficulty(questionId: string, difficulty: 'too-easy' | 'easy' | 'moderate' | 'hard' | 'very-hard' | null) {
  const supabase = await createClient()
  const user = await getSafeUser()

  // UPSERT pattern to ensure row exists
  const { error } = await supabase
    .from('user_question_progress')
    .upsert(
      {
        user_id: user.id,
        question_id: questionId,
        perceived_difficulty: difficulty,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,question_id' }
    )

  if (error) throw error
  revalidatePath('/', 'layout')
}

export async function updateVideoUrls(questionId: string, videoUrls: Record<string, string>) {
  const supabase = await createClient()
  await getSafeUser() // just check auth

  const { error } = await supabase
    .from('questions')
    .update({ video_urls: videoUrls })
    .eq('id', questionId)

  if (error) throw error
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

export async function cancelQuestionRevision(questionId: string) {
  const supabase = await createClient()
  const user = await getSafeUser()

  const { error } = await supabase
    .from('revision_schedule')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', questionId)

  if (error) throw error
  revalidatePath('/', 'layout')
}

export async function createQuestionAndAddToList(
  listId: string,
  data: {
    title: string
    leetcode_number?: number
    slug?: string
    topic?: string
    difficulty: 'Easy' | 'Medium' | 'Hard'
    youtube_url?: string
  }
) {
  const supabase = await createClient()
  await getSafeUser() // Ensure authenticated

  let targetQuestionId: string | null = null

  // 1. Check if the question already exists by leetcode_number
  if (data.leetcode_number) {
    const { data: existing } = await supabase
      .from('questions')
      .select('id')
      .eq('leetcode_number', data.leetcode_number)
      .limit(1)
      .maybeSingle()
    if (existing) targetQuestionId = existing.id
  }

  // 2. Check if the question already exists by exact title (case-insensitive)
  if (!targetQuestionId) {
    const { data: existing } = await supabase
      .from('questions')
      .select('id')
      .ilike('title', data.title)
      .limit(1)
      .maybeSingle()
    if (existing) targetQuestionId = existing.id
  }

  // 3. If we still don't have a question, insert a new one
  if (!targetQuestionId) {
    const { data: newQuestion, error: qError } = await supabase
      .from('questions')
      .insert({
        title: data.title,
        leetcode_number: data.leetcode_number || null,
        slug: data.slug || null,
        topic: data.topic || null,
        difficulty: data.difficulty,
        youtube_url: data.youtube_url || null,
      })
      .select('id')
      .single()

    if (qError) {
      if (qError.code === '23505') throw new Error('A question with this number already exists.')
      throw new Error(qError.message)
    }
    targetQuestionId = newQuestion.id
  }

  // 4. Add to list
  const { error: lqError } = await supabase
    .from('list_questions')
    .insert({
      list_id: listId,
      question_id: targetQuestionId,
      position: Math.floor(Date.now() / 1000), // convert to seconds to fit in postgres int32
    })

  if (lqError) {
    if (lqError.code === '23505') {
      throw new Error('This question is already inside this list!')
    }
    throw new Error(lqError.message)
  }

  revalidatePath('/', 'layout')
  return { success: true, questionId: targetQuestionId }
}

export async function updateQuestion(
  questionId: string,
  data: {
    title: string
    leetcode_number?: number | null
    slug?: string | null
    topic?: string | null
    difficulty: 'Easy' | 'Medium' | 'Hard'
    youtube_url?: string | null
  }
) {
  const supabase = await createClient()
  await getSafeUser() // Ensure authenticated

  const { error } = await supabase
    .from('questions')
    .update({
      title: data.title,
      leetcode_number: data.leetcode_number || null,
      slug: data.slug || null,
      topic: data.topic || null,
      difficulty: data.difficulty,
      youtube_url: data.youtube_url || null,
    })
    .eq('id', questionId)

  if (error) {
    if (error.code === '23505') throw new Error('A question with this number already exists.')
    throw new Error(error.message)
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function removeQuestionFromList(listId: string, questionId: string) {
  const supabase = await createClient()
  await getSafeUser() // Ensure authenticated

  const { error } = await supabase
    .from('list_questions')
    .delete()
    .eq('list_id', listId)
    .eq('question_id', questionId)

  if (error) throw new Error(error.message)

  revalidatePath('/', 'layout')
  return { success: true }
}
