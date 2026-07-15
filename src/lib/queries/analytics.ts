import { createClient } from '@/lib/supabase/client'

export async function getActivityLog(year?: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const targetYear = year || new Date().getFullYear()
  const startDate = `${targetYear}-01-01`
  const endDate = `${targetYear}-12-31`

  const { data } = await supabase
    .from('activity_log')
    .select('activity_date, activity_type')
    .eq('user_id', user.id)
    .gte('activity_date', startDate)
    .lte('activity_date', endDate)

  // Aggregate by date
  const dateMap = new Map<string, { count: number; solves: number; revisions: number }>()
  data?.forEach(a => {
    const existing = dateMap.get(a.activity_date) || { count: 0, solves: 0, revisions: 0 }
    existing.count++
    if (a.activity_type === 'solve') existing.solves++
    if (a.activity_type === 'revision') existing.revisions++
    dateMap.set(a.activity_date, existing)
  })

  return Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    ...data,
  }))
}

export async function getProgressByDifficulty() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('user_question_progress')
    .select('status, question:questions(difficulty)')
    .eq('user_id', user.id)

  if (!data) return []

  const difficultyMap = new Map<string, { solved: number; total: number }>()

  data.forEach(item => {
    const difficulty = (item.question as unknown as { difficulty: string })?.difficulty || 'Unknown'
    const existing = difficultyMap.get(difficulty) || { solved: 0, total: 0 }
    existing.total++
    if (item.status === 'solved') existing.solved++
    difficultyMap.set(difficulty, existing)
  })

  return Array.from(difficultyMap.entries()).map(([difficulty, stats]) => ({
    difficulty,
    ...stats,
  }))
}

export async function getProgressByTopic() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('user_question_progress')
    .select('status, question:questions(topic)')
    .eq('user_id', user.id)

  if (!data) return []

  const topicMap = new Map<string, { solved: number; total: number }>()

  data.forEach(item => {
    const topic = (item.question as unknown as { topic: string })?.topic || 'Other'
    const existing = topicMap.get(topic) || { solved: 0, total: 0 }
    existing.total++
    if (item.status === 'solved') existing.solved++
    topicMap.set(topic, existing)
  })

  return Array.from(topicMap.entries())
    .map(([topic, stats]) => ({ topic, ...stats }))
    .sort((a, b) => b.solved - a.solved)
}

export async function getCumulativeSolves() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('activity_log')
    .select('activity_date')
    .eq('user_id', user.id)
    .eq('activity_type', 'solve')
    .order('activity_date', { ascending: true })

  if (!data || data.length === 0) return []

  // Group by date and compute cumulative
  const dateMap = new Map<string, number>()
  data.forEach(a => {
    dateMap.set(a.activity_date, (dateMap.get(a.activity_date) || 0) + 1)
  })

  let cumulative = 0
  return Array.from(dateMap.entries()).map(([date, count]) => {
    cumulative += count
    return { date, count, cumulative }
  })
}

export async function getQuickStats() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { totalSolved: 0, totalQuestions: 0, listsActive: 0, revisionsCompleted: 0 }

  const [
    { count: totalSolved },
    { count: totalQuestions },
    { count: listsActive },
    { count: revisionsCompleted },
  ] = await Promise.all([
    supabase.from('user_question_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'solved'),
    supabase.from('user_question_progress').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('lists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('revision_schedule').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('completed', true),
  ])

  return {
    totalSolved: totalSolved || 0,
    totalQuestions: totalQuestions || 0,
    listsActive: listsActive || 0,
    revisionsCompleted: revisionsCompleted || 0,
  }
}

export async function getLeetCodeSessionStats() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      easy: { solved: 0, total: 0 },
      medium: { solved: 0, total: 0 },
      hard: { solved: 0, total: 0 },
      totalSolved: 0,
      totalQuestions: 0
    }
  }

  // 1. Get all questions in user's lists
  const { data: listQuestions } = await supabase
    .from('list_questions')
    .select('question:questions(id, difficulty), list:lists!inner(user_id)')
    .eq('list.user_id', user.id)

  // Deduplicate questions to get distinct questions
  const distinctQuestions = new Map<string, string>() // id -> difficulty
  if (listQuestions) {
    listQuestions.forEach(lq => {
      const q = lq.question as any
      if (q && q.id && q.difficulty) {
        distinctQuestions.set(q.id, q.difficulty)
      }
    })
  }

  // 2. Get all solved progress for the user
  const { data: solvedProgress } = await supabase
    .from('user_question_progress')
    .select('question_id')
    .eq('user_id', user.id)
    .eq('status', 'solved')

  const solvedSet = new Set<string>()
  if (solvedProgress) {
    solvedProgress.forEach(p => solvedSet.add(p.question_id))
  }

  // 3. Calculate stats
  const stats = {
    easy: { solved: 0, total: 0 },
    medium: { solved: 0, total: 0 },
    hard: { solved: 0, total: 0 },
    totalSolved: 0,
    totalQuestions: distinctQuestions.size
  }

  distinctQuestions.forEach((difficulty, qId) => {
    const isSolved = solvedSet.has(qId)
    const diffKey = difficulty.toLowerCase() as 'easy' | 'medium' | 'hard'
    
    if (stats[diffKey]) {
      stats[diffKey].total++
      if (isSolved) {
        stats[diffKey].solved++
        stats.totalSolved++
      }
    }
  })

  return stats
}
