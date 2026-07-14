'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, CheckCircle2, List, RotateCcw, ArrowRight, Flame } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StreakCounter } from '@/components/streak-counter'
import { QuestionCard } from '@/components/question-card'
import { StatCardSkeleton, QuestionCardSkeleton } from '@/components/loading-skeletons'
import { ErrorBoundary } from '@/components/error-boundary'
import { createClient } from '@/lib/supabase/client'
import { getRevisionsDue } from '@/lib/queries/revisions'
import { getQuickStats } from '@/lib/queries/analytics'
import type { Profile } from '@/lib/types/database'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
      setProfile(data)
    }
    fetchProfile()
  }, [])

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['quick-stats'],
    queryFn: getQuickStats,
  })

  const { data: revisions, isLoading: revisionsLoading } = useQuery({
    queryKey: ['revisions-today'],
    queryFn: () => getRevisionsDue('today'),
  })

  const todayCount = (revisions?.due?.length || 0) + (revisions?.overdue?.length || 0)

  return (
    <div className="space-y-8 animate-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s your practice overview for today</p>
      </div>

      {/* Streak */}
      <ErrorBoundary>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <StreakCounter
              currentStreak={profile?.current_streak || 0}
              highestStreak={profile?.highest_streak || 0}
            />
          </CardContent>
        </Card>
      </ErrorBoundary>

      {/* Stats Grid */}
      <ErrorBoundary>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <Card className="bg-card/50 border-border glow-hover">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-medium uppercase tracking-wider">Solved</span>
                  </div>
                  <p className="text-3xl font-bold font-mono">{stats?.totalSolved || 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">of {stats?.totalQuestions || 0} questions</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border glow-hover">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <List className="w-4 h-4 text-primary" />
                    <span className="text-xs font-medium uppercase tracking-wider">Lists</span>
                  </div>
                  <p className="text-3xl font-bold font-mono">{stats?.listsActive || 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">active lists</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border glow-hover">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-medium uppercase tracking-wider">Revisions</span>
                  </div>
                  <p className="text-3xl font-bold font-mono">{stats?.revisionsCompleted || 0}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">completed</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 border-border glow-hover">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Flame className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-medium uppercase tracking-wider">Due Today</span>
                  </div>
                  <p className="text-3xl font-bold font-mono">{todayCount}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">revisions pending</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ErrorBoundary>

      {/* Today's Revisions */}
      <ErrorBoundary>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Today&apos;s Revisions</h2>
            <Button variant="ghost" size="sm" render={<Link href="/revision" />} nativeButton={false}>
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {revisionsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <QuestionCardSkeleton key={i} />)}
            </div>
          ) : todayCount === 0 ? (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-sm font-medium">You&apos;re all caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">No revisions due today. Keep solving to build your schedule.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {revisions?.overdue?.slice(0, 3).map((r) => (
                <QuestionCard
                  key={r.id}
                  question={{
                    ...r.question,
                    progress: r.progress,
                    revision_count: { completed: 0, total: 4 },
                    current_revision: r,
                  }}
                />
              ))}
              {revisions?.due?.slice(0, 5).map((r) => (
                <QuestionCard
                  key={r.id}
                  question={{
                    ...r.question,
                    progress: r.progress,
                    revision_count: { completed: 0, total: 4 },
                    current_revision: r,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </ErrorBoundary>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/lists" className="group">
          <Card className="bg-card/50 border-border glow-hover h-full">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <List className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">My Lists</p>
                <p className="text-xs text-muted-foreground">Browse & practice</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/analytics" className="group">
          <Card className="bg-card/50 border-border glow-hover h-full">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Analytics</p>
                <p className="text-xs text-muted-foreground">Track progress</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/revision" className="group">
          <Card className="bg-card/50 border-border glow-hover h-full">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <RotateCcw className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Revision Hub</p>
                <p className="text-xs text-muted-foreground">Spaced repetition</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:translate-x-1 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
