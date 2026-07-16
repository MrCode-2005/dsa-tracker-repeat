import { useState, useEffect, useMemo } from 'react'
import { QuestionCard } from '@/components/question-card'
import type { QuestionWithProgress } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

interface DayDetailsProps {
  date: Date
  activity: { solved: any[], revised: any[], due: any[] }
  progressList: any[]
  revisionsList: any[]
  bookmarkFolders: any[]
}

export function DayDetails({ date, activity, progressList, revisionsList, bookmarkFolders }: DayDetailsProps) {
  const [questionsMap, setQuestionsMap] = useState<Map<string, QuestionWithProgress>>(new Map())
  const [isLoading, setIsLoading] = useState(false)

  const neededIds = useMemo(() => {
    return Array.from(new Set([
      ...activity.solved.map(s => s.question_id),
      ...activity.revised.map(r => r.question_id),
      ...activity.due.map(d => d.question_id)
    ]))
  }, [activity])

  useEffect(() => {
    if (neededIds.length === 0) {
      setQuestionsMap(new Map())
      return
    }

    async function fetchQuestions() {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('questions')
          .select('*')
          .in('id', neededIds)

        if (data) {
          const today = new Date().toISOString().split('T')[0]
          
          const progressMap = new Map(progressList.map(p => [p.question_id, p]))
          
          const revisionStatsMap = new Map<string, { completed: number; total: number; current: any }>()
          
          data.forEach(q => {
            const revisions = revisionsList.filter(r => r.question_id === q.id)
            const completed = revisions.filter(r => r.completed).length
            const currentDue = revisions.find(r => !r.completed && r.scheduled_for <= today) || null
            revisionStatsMap.set(q.id, { completed, total: revisions.length, current: currentDue })
          })

          const mappedQuestions = data.map(q => ({
            ...q,
            progress: progressMap.get(q.id) || null,
            revision_count: revisionStatsMap.get(q.id) || { completed: 0, total: 0 },
            current_revision: revisionStatsMap.get(q.id)?.current || null
          }))

          const map = new Map<string, QuestionWithProgress>()
          mappedQuestions.forEach(q => map.set(q.id, q))
          setQuestionsMap(map)
        }
      } catch (err) {
        console.error("Error fetching day questions:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestions()
  }, [neededIds.join(',')]) // Join neededIds for stable dependency

  const solvedQuestions = useMemo(() => {
    return activity.solved.map(s => questionsMap.get(s.question_id)).filter(Boolean) as QuestionWithProgress[]
  }, [activity.solved, questionsMap])

  const revisedQuestions = useMemo(() => {
    return activity.revised.map(r => questionsMap.get(r.question_id)).filter(Boolean) as QuestionWithProgress[]
  }, [activity.revised, questionsMap])

  const dueQuestions = useMemo(() => {
    return activity.due.map(d => questionsMap.get(d.question_id)).filter(Boolean) as QuestionWithProgress[]
  }, [activity.due, questionsMap])

  const totalActivity = activity.solved.length + activity.revised.length + activity.due.length

  if (totalActivity === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="text-4xl mb-4 opacity-50">📅</div>
        <h4 className="font-medium text-foreground mb-1">No Activity</h4>
        <p className="text-sm">You didn&apos;t solve or revise any questions on this date, and no revisions are due.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p className="text-sm">Loading questions...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="p-4 space-y-6 pb-20">
        
        <div className="w-full space-y-4">
          
          {dueQuestions.length > 0 && (
            <details open className="group border-b border-border pb-4">
              <summary className="flex items-center justify-between cursor-pointer list-none outline-none py-2 font-medium hover:text-foreground/80 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-medium">⏳ Due Revisions</span>
                  <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-0.5 rounded-full">{dueQuestions.length}</span>
                </div>
                <div className="text-muted-foreground group-open:rotate-180 transition-transform duration-200">
                  ▼
                </div>
              </summary>
              <div className="pt-4 pb-2 space-y-3">
                {dueQuestions.map(q => (
                  <QuestionCard 
                    key={q.id} 
                    question={q} 
                    bookmarkFolders={bookmarkFolders} 
                    onUpdate={() => window.location.reload()}
                    variant="compact"
                  />
                ))}
              </div>
            </details>
          )}

          {solvedQuestions.length > 0 && (
            <details open className="group border-b border-border pb-4">
              <summary className="flex items-center justify-between cursor-pointer list-none outline-none py-2 font-medium hover:text-foreground/80 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500 font-medium">🔥 New Solves</span>
                  <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-0.5 rounded-full">{solvedQuestions.length}</span>
                </div>
                <div className="text-muted-foreground group-open:rotate-180 transition-transform duration-200">
                  ▼
                </div>
              </summary>
              <div className="pt-4 pb-2 space-y-3">
                {solvedQuestions.map(q => (
                  <QuestionCard 
                    key={q.id} 
                    question={q} 
                    bookmarkFolders={bookmarkFolders} 
                    onUpdate={() => window.location.reload()}
                    variant="compact"
                  />
                ))}
              </div>
            </details>
          )}

          {revisedQuestions.length > 0 && (
            <details open className="group border-b border-border pb-4">
              <summary className="flex items-center justify-between cursor-pointer list-none outline-none py-2 font-medium hover:text-foreground/80 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-blue-500 font-medium">✅ Revisions Completed</span>
                  <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-0.5 rounded-full">{revisedQuestions.length}</span>
                </div>
                <div className="text-muted-foreground group-open:rotate-180 transition-transform duration-200">
                  ▼
                </div>
              </summary>
              <div className="pt-4 pb-2 space-y-3">
                {revisedQuestions.map(q => (
                  <QuestionCard 
                    key={q.id} 
                    question={q} 
                    bookmarkFolders={bookmarkFolders} 
                    onUpdate={() => window.location.reload()}
                    variant="compact"
                  />
                ))}
              </div>
            </details>
          )}
          
        </div>
      </div>
    </div>
  )
}
