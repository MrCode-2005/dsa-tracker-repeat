'use server'

import { createClient, getSafeUser } from '@/lib/supabase/server'
import { getLeaderboardData, type TimeFilter, type LeaderboardEntry } from '@/lib/queries/leaderboard'

export { type LeaderboardEntry, type TimeFilter }

export async function fetchLeaderboard(timeFilter: TimeFilter): Promise<{
  entries: LeaderboardEntry[]
  currentUserId: string
}> {
  const supabase = await createClient()
  const user = await getSafeUser()
  
  const entries = await getLeaderboardData(timeFilter)
  
  return {
    entries,
    currentUserId: user.id,
  }
}
