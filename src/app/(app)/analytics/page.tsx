'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarHeatmap } from '@/components/heatmap'
import { StreakCounter } from '@/components/streak-counter'
import { getEffectiveStreak } from '@/lib/utils'
import { ErrorBoundary } from '@/components/error-boundary'
import { HeatmapSkeleton, ChartSkeleton, StatCardSkeleton } from '@/components/loading-skeletons'
import { getActivityLog, getProgressByDifficulty, getProgressByTopic, getCumulativeSolves, getQuickStats } from '@/lib/queries/analytics'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { getUserLists } from '@/lib/queries/lists'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from 'recharts'
import type { Profile } from '@/lib/types/database'

const DIFF_COLORS: Record<string, string> = { Easy: '#22c55e', Medium: '#f59e0b', Hard: '#ef4444' }
const CHART_COLORS = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#06b6d4', '#f97316']

export default function AnalyticsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [selectedYear, setSelectedYear] = useState('current')

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

  const { data: activity, isLoading: activityLoading } = useQuery({ queryKey: ['activity-log'], queryFn: () => getActivityLog() })
  const { data: diffProgress, isLoading: diffLoading } = useQuery({ queryKey: ['progress-difficulty'], queryFn: getProgressByDifficulty })
  const { data: topicProgress, isLoading: topicLoading } = useQuery({ queryKey: ['progress-topic'], queryFn: getProgressByTopic })
  const { data: cumulative, isLoading: cumulativeLoading } = useQuery({ queryKey: ['cumulative-solves'], queryFn: getCumulativeSolves })
  const { data: stats } = useQuery({ queryKey: ['quick-stats'], queryFn: getQuickStats })
  const { data: lists } = useQuery({ queryKey: ['user-lists'], queryFn: getUserLists })

  const pieData = diffProgress?.map(d => ({ name: d.difficulty, value: d.solved, total: d.total })) || []

  return (
    <div className="space-y-8 animate-in-up">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Your practice progress at a glance</p>
      </div>

      {/* Streak */}
      <ErrorBoundary>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6">
            <StreakCounter 
              currentStreak={getEffectiveStreak(profile?.current_streak || 0, profile?.last_activity_date, profile?.timezone)} 
              highestStreak={profile?.highest_streak || 0} 
            />
          </CardContent>
        </Card>
      </ErrorBoundary>

      {/* Heatmap */}
      <ErrorBoundary>
        {activityLoading ? <HeatmapSkeleton /> : (
          <Card className="bg-card/50 border-border">
            <CardContent className="p-6">
              <CalendarHeatmap 
                data={activity || []} 
                year={selectedYear}
                onYearChange={setSelectedYear}
                years={['current', new Date().getFullYear().toString(), (new Date().getFullYear() - 1).toString()]}
              />
            </CardContent>
          </Card>
        )}
      </ErrorBoundary>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty donut */}
        <ErrorBoundary>
          {diffLoading ? <ChartSkeleton /> : (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold mb-4">Solved by Difficulty</h3>
                <div className="flex items-center gap-6">
                  <div className="w-40 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                          {pieData.map((entry) => (
                            <Cell key={entry.name} fill={DIFF_COLORS[entry.name || 'Easy']} />
                          ))}
                        </Pie>
                        <RTooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2e2e4e', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 flex-1">
                    {diffProgress?.map(d => (
                      <div key={d.difficulty} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DIFF_COLORS[d.difficulty] }} />
                        <span className="text-sm flex-1">{d.difficulty}</span>
                        <span className="font-mono text-sm">{d.solved}/{d.total}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border">
                      <span className="font-mono text-sm font-bold">{stats?.totalSolved || 0} total solved</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </ErrorBoundary>

        {/* Topic bar chart */}
        <ErrorBoundary>
          {topicLoading ? <ChartSkeleton /> : (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold mb-4">Solved by Topic</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topicProgress?.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 8 }}>
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis type="category" dataKey="topic" width={120} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <RTooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2e2e4e', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }} />
                      <Bar dataKey="solved" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </ErrorBoundary>
      </div>

      {/* Cumulative chart */}
      <ErrorBoundary>
        {cumulativeLoading ? <ChartSkeleton /> : cumulative && cumulative.length > 0 ? (
          <Card className="bg-card/50 border-border">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-4">Cumulative Solves Over Time</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulative}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2e2e4e" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <RTooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2e2e4e', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0' }} />
                    <Area type="monotone" dataKey="cumulative" stroke="#8b5cf6" fill="#8b5cf630" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </ErrorBoundary>

      {/* Per-list progress */}
      {lists && lists.length > 0 && (
        <ErrorBoundary>
          <Card className="bg-card/50 border-border">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold mb-4">Progress by List</h3>
              <div className="space-y-4">
                {lists.map((list, i) => {
                  const pct = list.total_count > 0 ? Math.round((list.solved_count / list.total_count) * 100) : 0
                  return (
                    <div key={list.id} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{list.name}</span>
                        <span className="font-mono text-muted-foreground">{list.solved_count}/{list.total_count}</span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </ErrorBoundary>
      )}
    </div>
  )
}
