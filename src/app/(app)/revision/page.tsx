'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QuestionCard } from '@/components/question-card'
import { QuestionListSkeleton } from '@/components/loading-skeletons'
import { ErrorBoundary } from '@/components/error-boundary'
import { getRevisionsDue, getRevisionsUpcoming, getRevisionStats } from '@/lib/queries/revisions'

type DueRange = 'today' | 'week' | 'month' | 'year'
type UpcomingRange = 'today' | 'week' | 'month'

export default function RevisionPage() {
  const queryClient = useQueryClient()
  const [dueRange, setDueRange] = useState<DueRange>('today')
  const [upcomingRange, setUpcomingRange] = useState<UpcomingRange>('week')

  const { data: revisions, isLoading: revisionsLoading } = useQuery({
    queryKey: ['revisions-due', dueRange],
    queryFn: () => getRevisionsDue(dueRange),
  })

  const { data: upcoming, isLoading: upcomingLoading } = useQuery({
    queryKey: ['revisions-upcoming', upcomingRange],
    queryFn: () => getRevisionsUpcoming(upcomingRange),
  })

  const { data: stats } = useQuery({
    queryKey: ['revision-stats'],
    queryFn: getRevisionStats,
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['revisions'] })
    queryClient.invalidateQueries({ queryKey: ['revision-stats'] })
  }

  return (
    <div className="space-y-8 animate-in-up">
      <div>
        <h1 className="text-2xl font-bold">Revision Hub</h1>
        <p className="text-muted-foreground mt-1">Your spaced repetition schedule (1-3-7-21 day rule)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats?.total || 0, icon: Calendar, color: 'text-primary' },
          { label: 'Completed', value: stats?.completed || 0, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Pending', value: stats?.pending || 0, icon: Calendar, color: 'text-amber-400' },
          { label: 'Overdue', value: stats?.overdue || 0, icon: AlertTriangle, color: 'text-red-400' },
        ].map((s) => (
          <Card key={s.label} className="bg-card/50 border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <div>
                <p className="text-xl font-bold font-mono">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overdue Section */}
      <ErrorBoundary>
        {revisions?.overdue && revisions.overdue.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h2 className="text-lg font-semibold text-red-400">Overdue</h2>
              <Badge variant="destructive" className="text-xs">{revisions.overdue.length}</Badge>
            </div>
            <div className="space-y-2 border-l-2 border-red-500/30 pl-4">
              {revisions.overdue.map((r) => (
                <QuestionCard
                  key={r.id}
                  question={{
                    ...r.question,
                    progress: r.progress,
                    revision_count: { completed: 0, total: 4 },
                    current_revision: r,
                  }}
                  onUpdate={handleRefresh}
                />
              ))}
            </div>
          </div>
        )}
      </ErrorBoundary>

      {/* Due Section */}
      <ErrorBoundary>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Due Revisions</h2>
            <Tabs value={dueRange} onValueChange={(v) => setDueRange(v as DueRange)}>
              <TabsList className="h-8">
                <TabsTrigger value="today" className="text-xs px-3">Today</TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3">This Week</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-3">This Month</TabsTrigger>
                <TabsTrigger value="year" className="text-xs px-3">This Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {revisionsLoading ? (
            <QuestionListSkeleton count={5} />
          ) : revisions?.due && revisions.due.length > 0 ? (
            <div className="space-y-2">
              {revisions.due.map((r) => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="hidden sm:block w-12 flex-shrink-0 text-right pr-2">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Day {r.cycle_stage}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <QuestionCard
                      question={{
                        ...r.question,
                        progress: r.progress,
                        revision_count: { completed: 0, total: 4 },
                        current_revision: r,
                      }}
                      onUpdate={handleRefresh}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-sm font-medium">You&apos;re all caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">No revisions due for this period. Keep solving new questions!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ErrorBoundary>

      {/* Upcoming Section */}
      <ErrorBoundary>
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Upcoming Revisions</h2>
            <Tabs value={upcomingRange} onValueChange={(v) => setUpcomingRange(v as UpcomingRange)}>
              <TabsList className="h-8">
                <TabsTrigger value="today" className="text-xs px-3">Today</TabsTrigger>
                <TabsTrigger value="week" className="text-xs px-3">This Week</TabsTrigger>
                <TabsTrigger value="month" className="text-xs px-3">This Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {upcomingLoading ? (
            <QuestionListSkeleton count={3} />
          ) : upcoming && upcoming.length > 0 ? (
            <div className="space-y-2 opacity-70">
              {upcoming.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card/30">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  {r.question.leetcode_number && (
                    <span className="font-mono text-sm text-muted-foreground w-10 text-right">{r.question.leetcode_number}</span>
                  )}
                  <span className="text-sm flex-1 truncate">{r.question.title}</span>
                  <span className="text-xs font-mono text-muted-foreground">Day {r.cycle_stage}</span>
                  <span className="text-xs text-muted-foreground">{new Date(r.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No upcoming revisions in this range</p>
          )}
        </div>
      </ErrorBoundary>
    </div>
  )
}
