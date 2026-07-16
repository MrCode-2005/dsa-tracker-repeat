import { createClient } from '@/lib/supabase/client'
import type { QuestionWithProgress } from '@/lib/types/database'

export interface CalendarData {
  progressList: any[]
  revisionsList: any[]
  questionsList: QuestionWithProgress[]
  debug?: any
}

export async function getCalendarData(): Promise<CalendarData> {
  const supabase = createClient()
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

  return {
    progressList: pData,
    revisionsList: rData,
    questionsList: [], // Now fetched lazily on the client in DayDetails
    debug: { err: null }
  }
}
