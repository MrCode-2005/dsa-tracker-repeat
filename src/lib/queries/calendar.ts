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

  // Ensure we only query valid UUIDs to prevent Supabase "Bad Request" errors
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const validQuestionIds = [
    ...pData.map(p => p.question_id),
    ...rData.map(r => r.question_id)
  ].filter(id => id && typeof id === 'string' && uuidRegex.test(id))

  const questionIds = Array.from(new Set(validQuestionIds))

  if (questionIds.length === 0) {
    return { 
      progressList: pData, 
      revisionsList: rData, 
      questionsList: [],
      debug: { err: "EMPTY_IDS" }
    }
  }

  // Fetch the actual questions in batches to prevent "400 Bad Request" from URL length limits (Vercel/Nginx limit is ~8KB)
  const chunkSize = 100
  let allQuestions: any[] = []
  
  const chunkPromises = []
  for (let i = 0; i < questionIds.length; i += chunkSize) {
    const chunk = questionIds.slice(i, i + chunkSize)
    chunkPromises.push(
      supabase
        .from('questions')
        .select('*')
        .in('id', chunk)
    )
  }

  const chunkResults = await Promise.all(chunkPromises)
  
  for (const result of chunkResults) {
    if (result.error) {
      console.error("GET CALENDAR DATA ERROR (Chunk):", result.error)
      return { 
        progressList: pData, 
        revisionsList: rData, 
        questionsList: [],
        debug: { err: result.error.message }
      }
    }
    if (result.data) {
      allQuestions.push(...result.data)
    }
  }

  const questions = allQuestions

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
      firstId: questionIds[0]
    }
  }
}
