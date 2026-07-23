'use client'

import { useState, useEffect, useTransition } from 'react'
import { fetchLeaderboard, type LeaderboardEntry, type TimeFilter } from '@/lib/actions/leaderboard'
import { LeaderboardPodium } from '@/components/leaderboard/leaderboard-podium'
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table'
import { Loader2, Trophy, Users, Zap, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: 'alltime', label: 'All Time' },
  { value: 'month', label: 'This Month' },
  { value: 'week', label: 'This Week' },
]

function ScoreLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Easy +10</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Medium +30</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Hard +70</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Revision +25</span>
      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />Streak ×multiplier</span>
    </div>
  )
}

export default function LeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('alltime')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  const loadData = (filter: TimeFilter) => {
    startTransition(async () => {
      const data = await fetchLeaderboard(filter)
      setEntries(data.entries)
      setCurrentUserId(data.currentUserId)
      setIsInitialLoading(false)
    })
  }

  useEffect(() => {
    loadData('alltime')
  }, [])

  const handleFilterChange = (filter: TimeFilter) => {
    setTimeFilter(filter)
    loadData(filter)
  }

  const top3 = entries.filter(e => e.rank <= 3)
  const rest = entries.filter(e => e.rank > 3)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Leaderboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Compete with everyone on the platform. Score is based on solves, streaks, and revision consistency.
          </p>
        </div>

        {/* Time filter tabs */}
        <div className="flex items-center bg-muted rounded-lg p-1 gap-1 self-start">
          {TIME_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleFilterChange(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                timeFilter === f.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Score legend */}
      <Card className="bg-card/30 border-border/50">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <ScoreLegend />
        </CardContent>
      </Card>

      {/* Loading state */}
      {isInitialLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading leaderboard...</p>
          </div>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Users className="w-12 h-12 opacity-30" />
          <p className="font-medium">No users yet</p>
          <p className="text-sm">Start solving problems to appear on the leaderboard!</p>
        </div>
      ) : (
        <div className={`transition-opacity duration-200 ${isPending ? 'opacity-50' : 'opacity-100'}`}>
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="bg-card/50 border-border">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-foreground">{entries.length}</div>
                <div className="text-xs text-muted-foreground">Competitors</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-foreground">
                  {entries.reduce((s, e) => s + e.totalSolves, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Solves</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border">
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-foreground">
                  {Math.max(...entries.map(e => e.currentStreak))}🔥
                </div>
                <div className="text-xs text-muted-foreground">Best Streak</div>
              </CardContent>
            </Card>
          </div>

          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <Card className="bg-gradient-to-b from-card/80 to-card/40 border-border mb-6 overflow-hidden">
              <CardContent className="p-0">
                <LeaderboardPodium top3={top3} currentUserId={currentUserId} />
              </CardContent>
            </Card>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground px-1">Rankings</h2>
              <LeaderboardTable entries={entries} currentUserId={currentUserId} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
