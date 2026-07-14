import { createClient } from '@/lib/supabase/client'
import type { BookmarkFolderWithCount, QuestionWithProgress } from '@/lib/types/database'

export async function getBookmarkFolders(): Promise<BookmarkFolderWithCount[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: folders } = await supabase
    .from('bookmark_folders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!folders) return []

  // Get counts for each folder
  const { data: items } = await supabase
    .from('bookmark_items')
    .select('folder_id')
    .eq('user_id', user.id)

  const countMap = new Map<string, number>()
  items?.forEach(item => {
    countMap.set(item.folder_id, (countMap.get(item.folder_id) || 0) + 1)
  })

  return folders.map(f => ({
    ...f,
    item_count: countMap.get(f.id) || 0,
  }))
}

export async function getBookmarkFolderQuestions(folderId: string): Promise<QuestionWithProgress[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: items } = await supabase
    .from('bookmark_items')
    .select('question_id')
    .eq('folder_id', folderId)
    .eq('user_id', user.id)

  if (!items || items.length === 0) return []

  const questionIds = items.map(i => i.question_id)

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .in('id', questionIds)

  const { data: progressData } = await supabase
    .from('user_question_progress')
    .select('*')
    .eq('user_id', user.id)
    .in('question_id', questionIds)

  const { data: revisionData } = await supabase
    .from('revision_schedule')
    .select('*')
    .eq('user_id', user.id)
    .in('question_id', questionIds)

  const progressMap = new Map(progressData?.map(p => [p.question_id, p]) || [])
  const today = new Date().toISOString().split('T')[0]

  return (questions || []).map(q => {
    const revisions = revisionData?.filter(r => r.question_id === q.id) || []
    const completed = revisions.filter(r => r.completed).length
    const currentDue = revisions.find(r => !r.completed && r.scheduled_for <= today) || null

    return {
      ...q,
      progress: progressMap.get(q.id) || null,
      revision_count: { completed, total: revisions.length },
      current_revision: currentDue,
    }
  })
}

export async function getQuestionBookmarkFolders(questionId: string): Promise<string[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('bookmark_items')
    .select('folder_id')
    .eq('question_id', questionId)
    .eq('user_id', user.id)

  return data?.map(d => d.folder_id) || []
}
