'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PRESET_LISTS } from '@/lib/types/database'
import { resolveLeetCodeData } from '@/lib/leetcode-api'

export async function createList(name: string, description?: string, color?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const headersList = await import('next/headers').then(m => m.headers())
  const headerUserId = headersList.get('x-user-id')
  const userId = user?.id || headerUserId
  if (!userId) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name,
      description: description || null,
      color: color || '#8B5CF6',
      source_type: 'custom',
    })
    .select()
    .single()
  if (error) throw error

  revalidatePath('/lists')
  return data
}

export async function adoptPresetList(preset: 'NEETCODE_150' | 'BLIND_75') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const headersList = await import('next/headers').then(m => m.headers())
  console.log("ACTION HEADERS:", Array.from(headersList.keys()))
  const headerUserId = headersList.get('x-user-id')
  
  const userId = user?.id || headerUserId
  console.log("USER ID:", userId)
  if (!userId) throw new Error('Unauthorized')

  const presetInfo = PRESET_LISTS[preset]

  // Create the list
  const { data: list, error: listError } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: presetInfo.name,
      description: presetInfo.description,
      color: presetInfo.color,
      source_type: 'preset',
    })
    .select()
    .single()
  if (listError) throw listError

  // Get questions to add
  let query = supabase.from('questions').select('id, leetcode_number')

  if (preset === 'BLIND_75') {
    query = query.in('leetcode_number', PRESET_LISTS.BLIND_75.leetcodeNumbers)
  }

  const { data: questions, error: qError } = await query
  if (qError) throw qError

  if (questions && questions.length > 0) {
    // Add all questions to the list
    const listQuestions = questions.map((q, idx) => ({
      list_id: list.id,
      question_id: q.id,
      position: idx + 1,
    }))

    const { error: lqError } = await supabase.from('list_questions').insert(listQuestions)
    if (lqError) throw lqError

    // Create progress rows for all questions (unsolved)
    const progressRows = questions.map((q) => ({
      user_id: userId,
      question_id: q.id,
    }))

    // Use upsert to avoid conflicts if progress already exists
    await supabase
      .from('user_question_progress')
      .upsert(progressRows, { onConflict: 'user_id,question_id', ignoreDuplicates: true })
  }

  revalidatePath('/lists')
  return list
}

export async function importListFromData(
  name: string,
  questions: Array<{
    leetcode_number?: number
    title: string
    slug?: string
    topic?: string
    difficulty?: 'Easy' | 'Medium' | 'Hard'
    is_solved?: boolean
    solved_date?: string
    youtube_url?: string
  }>,
  targetChannel?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const headersList = await import('next/headers').then(m => m.headers())
  const headerUserId = headersList.get('x-user-id')
  const userId = user?.id || headerUserId
  if (!userId) throw new Error('Unauthorized')

  // Create the list
  const { data: list, error: listError } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name,
      source_type: 'imported',
      color: '#6366F1',
    })
    .select()
    .single()
  if (listError) throw listError

  // Upsert questions into the master bank
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]

    // Auto-resolve missing metadata
    const resolved = await resolveLeetCodeData(q.title)
    if (resolved) {
      q.title = resolved.title
      q.difficulty = q.difficulty || resolved.difficulty
      q.leetcode_number = q.leetcode_number || resolved.leetcode_number
      q.slug = q.slug || resolved.slug
    }

    // Try to find existing question by leetcode_number
    let questionId: string | null = null

    if (q.leetcode_number) {
      const { data: existing } = await supabase
        .from('questions')
        .select('id, youtube_url, video_urls')
        .eq('leetcode_number', q.leetcode_number)
        .single()

      if (existing) {
        questionId = existing.id
        // If the CSV provided a youtube_url, update the existing question to include it
        if (q.youtube_url) {
          const newVideoUrls = existing.video_urls || {}
          if (targetChannel) {
            newVideoUrls[targetChannel] = q.youtube_url
          } else {
            newVideoUrls['default'] = q.youtube_url
          }
          await supabase.from('questions').update({ 
            youtube_url: q.youtube_url, // Keep fallback for now
            video_urls: newVideoUrls
          }).eq('id', existing.id)
        }
      }
    }

    if (!questionId) {
      // Insert new question
      const slug = q.slug || q.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      
      const payload: any = {
        leetcode_number: q.leetcode_number || null,
        title: q.title,
        slug,
        topic: q.topic || null,
        difficulty: q.difficulty || null,
      }
      
      if (q.youtube_url) {
        payload.youtube_url = q.youtube_url
        payload.video_urls = targetChannel ? { [targetChannel]: q.youtube_url } : { 'default': q.youtube_url }
      }

      const { data: newQ, error: qErr } = await supabase
        .from('questions')
        .upsert(payload, { onConflict: 'leetcode_number' })
        .select('id')
        .single()

      if (qErr) {
        // If upsert fails (no leetcode_number), try regular insert
        const fallbackPayload: any = {
          title: q.title,
          slug,
          topic: q.topic || null,
          difficulty: q.difficulty || null,
        }
        if (q.youtube_url) {
          fallbackPayload.youtube_url = q.youtube_url
          fallbackPayload.video_urls = targetChannel ? { [targetChannel]: q.youtube_url } : { 'default': q.youtube_url }
        }

        const { data: insertedQ } = await supabase
          .from('questions')
          .insert(fallbackPayload)
          .select('id')
          .single()
        questionId = insertedQ?.id || null
      } else {
        questionId = newQ?.id || null
      }
    }

    if (!questionId) continue

    // Add to list
    await supabase.from('list_questions').insert({
      list_id: list.id,
      question_id: questionId,
      position: i + 1,
    })

    // Create/update progress
    const progressData: Record<string, unknown> = {
      user_id: userId,
      question_id: questionId,
    }

    if (q.is_solved) {
      progressData.status = 'solved'
      progressData.first_solved_at = q.solved_date || new Date().toISOString()
      progressData.last_solved_at = q.solved_date || new Date().toISOString()
      progressData.times_solved = 1
    }

    await supabase
      .from('user_question_progress')
      .upsert(progressData as never, { onConflict: 'user_id,question_id' })

    // If solved, log activity
    if (q.is_solved) {
      await supabase.from('activity_log').insert({
        user_id: userId,
        question_id: questionId,
        activity_type: 'solve',
        activity_date: q.solved_date
          ? new Date(q.solved_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      })
    }
  }

  revalidatePath('/lists')
  return list
}

export async function deleteList(listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const headersList = await import('next/headers').then(m => m.headers())
  const headerUserId = headersList.get('x-user-id')
  const userId = user?.id || headerUserId
  if (!userId) throw new Error('Unauthorized')

  await supabase.from('lists').delete().eq('id', listId).eq('user_id', userId)
  revalidatePath('/lists')
}

export async function addQuestionToList(listId: string, questionId: string) {
  const supabase = await createClient()

  // Get max position
  const { data: maxPos } = await supabase
    .from('list_questions')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const position = (maxPos?.position || 0) + 1

  await supabase.from('list_questions').insert({
    list_id: listId,
    question_id: questionId,
    position,
  })

  revalidatePath(`/lists/${listId}`)
}
