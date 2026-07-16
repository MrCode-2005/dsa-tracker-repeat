import { useMemo } from 'react'
import { QuestionCard } from '@/components/question-card'
import type { QuestionWithProgress } from '@/lib/types/database'
import { ScrollArea } from '@/components/ui/scroll-area'


interface DayDetailsProps {
  date: Date
  activity: { solved: any[], revised: any[], due: any[] }
  questionsMap: Map<string, QuestionWithProgress>
  bookmarkFolders: any[]
}

export function DayDetails({ date, activity, questionsMap, bookmarkFolders }: DayDetailsProps) {
  
  const solvedQuestions = useMemo(() => {
    return activity.solved.map(s => questionsMap.get(s.question_id)).filter(Boolean) as QuestionWithProgress[]
  }, [activity.solved, questionsMap])

  const revisedQuestions = useMemo(() => {
    return activity.revised.map(r => questionsMap.get(r.question_id)).filter(Boolean) as QuestionWithProgress[]
  }, [activity.revised, questionsMap])

  const dueQuestions = useMemo(() => {
    return activity.due.map(d => questionsMap.get(d.question_id)).filter(Boolean) as QuestionWithProgress[]
  }, [activity.due, questionsMap])

  const totalActivity = solvedQuestions.length + revisedQuestions.length + dueQuestions.length

  if (totalActivity === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <div className="text-4xl mb-4 opacity-50">📅</div>
        <h4 className="font-medium text-foreground mb-1">No Activity</h4>
        <p className="text-sm">You didn&apos;t solve or revise any questions on this date, and no revisions are due.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="flex-1">
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
                  />
                ))}
              </div>
            </details>
          )}
          
        </div>
      </div>
    </ScrollArea>
  )
}
