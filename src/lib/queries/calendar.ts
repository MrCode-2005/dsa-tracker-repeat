import { createClient } from '@/lib/supabase/server'
import type { QuestionWithProgress } from '@/lib/types/database'

export interface CalendarData {
  progressList: any[]
  revisionsList: any[]
  questionsList: QuestionWithProgress[]
  debug?: any
}

export async function getCalendarData(): Promise<CalendarData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { progressList: [], revisionsList: [], questionsList: [] }

  const [
    { data: progressData },
    { data: revisionData }
  ] = await Promise.all([
    supabase.from('user_question_progress').select('*').eq('user_id', user.id),
    supabase.from('revision_schedule').select('*').eq('user_id', user.id)
  ])

  const pData = progressData || []
  const rData = revisionData || []

  const validQuestionIds = [
    ...pData.map(p => p.question_id),
    ...rData.map(r => r.question_id)
  ].filter(Boolean)

  const questionIds = Array.from(new Set(validQuestionIds))

  if (questionIds.length === 0) {
    return { progressList: pData, revisionsList: rData, questionsList: [] }
  }

  // Fetch the actual questions in batches if needed, but supabase can handle large IN clauses
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .in('id', questionIds)

  if (error) {
    console.error("GET CALENDAR DATA ERROR:", error)
  }

  if (!questions) {
    return { progressList: pData, revisionsList: rData, questionsList: [] }
  }

  const today = new Date().toISOString().split('T')[0]
  
  // To form QuestionWithProgress, we need to map them properly
  const progressMap = new Map(pData.map(p => [p.question_id, p]))
  
  // Calculate revision stats per question
  const revisionStatsMap = new Map<string, { completed: number; total: number; current: any }>()
  
  questions.forEach(q => {
    const revisions = rData.filter(r => r.question_id === q.id)
    const completed = revisions.filter(r => r.completed).length
    const currentDue = revisions.find(r => !r.completed && r.scheduled_for <= today) || null
    revisionStatsMap.set(q.id, { completed, total: revisions.length, current: currentDue })
  })

  const questionsList = questions.map(q => ({
    ...q,
    progress: progressMap.get(q.id) || null,
    revision_count: revisionStatsMap.get(q.id) || { completed: 0, total: 0 },
    current_revision: revisionStatsMap.get(q.id)?.current || null,
  }))

  return {
    progressList: pData,
    revisionsList: rData,
    questionsList,
    debug: {
      qCount: questions?.length,
      idCount: questionIds.length,
      firstId: questionIds[0],
      err: (error as any)?.message
    }
  }
}
