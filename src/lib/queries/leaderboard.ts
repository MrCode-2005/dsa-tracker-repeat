import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type TimeFilter = 'week' | 'month' | 'alltime'

export interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  currentStreak: number
  highestStreak: number
  lastActivityDate: string | null
  // Solve counts
  easyCount: number
  mediumCount: number
  hardCount: number
  totalSolves: number
  // This period solves (for week/month filters)
  periodSolves: number
  // Revision stats
  revisionsCompleted: number
  // Computed score
  score: number
  tier: 'bronze' | 'silver' | 'gold' | 'diamond'
  // Rank (added after sorting)
  rank: number
}

function getTier(score: number): LeaderboardEntry['tier'] {
  if (score >= 3001) return 'diamond'
  if (score >= 1501) return 'gold'
  if (score >= 501) return 'silver'
  return 'bronze'
}

/**
 * Scoring Formula (research-backed):
 * All-Time Rating = (10 × E) + (30 × M) + (70 × H) + (25 × revisionsCompleted) + (15 × highestStreak)
 *
 * Weekly/Monthly = same formula but only counts activity within the period
 */
function computeScore(
  easy: number,
  medium: number,
  hard: number,
  revisionsCompleted: number,
  highestStreak: number,
  currentStreak: number
): number {
  const solveScore = (easy * 10) + (medium * 30) + (hard * 70)
  const revisionScore = revisionsCompleted * 25
  const streakBonus = highestStreak * 15

  // Streak multiplier: 1 + 0.1 × ln(1 + currentStreak), capped at 1.5
  const streakMultiplier = Math.min(1.5, 1 + 0.1 * Math.log(1 + currentStreak))

  return Math.round((solveScore + revisionScore + streakBonus) * streakMultiplier)
}

export async function getLeaderboardData(timeFilter: TimeFilter): Promise<LeaderboardEntry[]> {
  // Determine date cutoff for period filters
  const now = new Date()
  let cutoffDate: string | null = null

  if (timeFilter === 'week') {
    const weekAgo = new Date(now)
    weekAgo.setDate(weekAgo.getDate() - 7)
    cutoffDate = weekAgo.toISOString().split('T')[0]
  } else if (timeFilter === 'month') {
    const monthAgo = new Date(now)
    monthAgo.setDate(monthAgo.getDate() - 30)
    cutoffDate = monthAgo.toISOString().split('T')[0]
  }

  // 1. Fetch all profiles
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, avatar_url, current_streak, highest_streak, last_activity_date')

  if (profilesError) throw profilesError
  if (!profiles || profiles.length === 0) return []

  const userIds = profiles.map(p => p.id)

  // 2. Fetch solve counts by difficulty — all time
  const { data: allTimeSolves } = await supabaseAdmin
    .from('user_question_progress')
    .select('user_id, question_id, status, questions!inner(difficulty)')
    .in('user_id', userIds)
    .eq('status', 'solved')

  // 3. Fetch period activity (for week/month filters)
  let periodActivityMap: Record<string, number> = {}
  if (cutoffDate) {
    const { data: periodActivity } = await supabaseAdmin
      .from('activity_log')
      .select('user_id, activity_type, activity_date')
      .in('user_id', userIds)
      .eq('activity_type', 'solve')
      .gte('activity_date', cutoffDate)

    if (periodActivity) {
      for (const row of periodActivity) {
        periodActivityMap[row.user_id] = (periodActivityMap[row.user_id] || 0) + 1
      }
    }
  }

  // 4. Fetch completed revisions
  const { data: revisions } = await supabaseAdmin
    .from('revision_schedule')
    .select('user_id')
    .in('user_id', userIds)
    .eq('completed', true)

  // Build lookup maps
  const solvesByUser: Record<string, { easy: number; medium: number; hard: number }> = {}
  if (allTimeSolves) {
    for (const row of allTimeSolves) {
      if (!solvesByUser[row.user_id]) {
        solvesByUser[row.user_id] = { easy: 0, medium: 0, hard: 0 }
      }
      const diff = (row.questions as any)?.difficulty
      if (diff === 'Easy') solvesByUser[row.user_id].easy++
      else if (diff === 'Medium') solvesByUser[row.user_id].medium++
      else if (diff === 'Hard') solvesByUser[row.user_id].hard++
    }
  }

  const revisionsByUser: Record<string, number> = {}
  if (revisions) {
    for (const row of revisions) {
      revisionsByUser[row.user_id] = (revisionsByUser[row.user_id] || 0) + 1
    }
  }

  // 5. Build leaderboard entries
  const entries: Omit<LeaderboardEntry, 'rank'>[] = profiles.map(profile => {
    const solves = solvesByUser[profile.id] || { easy: 0, medium: 0, hard: 0 }
    const revisionsCompleted = revisionsByUser[profile.id] || 0
    const periodSolves = cutoffDate
      ? (periodActivityMap[profile.id] || 0)
      : (solves.easy + solves.medium + solves.hard)

    const score = computeScore(
      solves.easy,
      solves.medium,
      solves.hard,
      revisionsCompleted,
      profile.highest_streak || 0,
      profile.current_streak || 0
    )

    return {
      userId: profile.id,
      displayName: profile.display_name || 'Anonymous',
      avatarUrl: profile.avatar_url,
      currentStreak: profile.current_streak || 0,
      highestStreak: profile.highest_streak || 0,
      lastActivityDate: profile.last_activity_date,
      easyCount: solves.easy,
      mediumCount: solves.medium,
      hardCount: solves.hard,
      totalSolves: solves.easy + solves.medium + solves.hard,
      periodSolves,
      revisionsCompleted,
      score,
      tier: getTier(score),
    }
  })

  // 6. Sort by score descending, add rank
  entries.sort((a, b) => b.score - a.score)

  return entries.map((entry, idx) => ({ ...entry, rank: idx + 1 }))
}
