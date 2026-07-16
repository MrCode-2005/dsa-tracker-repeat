'use client'

import { useState, useMemo } from 'react'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO
} from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QuestionWithProgress } from '@/lib/types/database'
import { DayDetails } from './day-details'

interface CalendarViewProps {
  progressList: any[]
  revisionsList: any[]
  questionsList: QuestionWithProgress[]
  bookmarkFolders: any[]
  debugInfo?: any
}

export function CalendarView({ progressList, revisionsList, questionsList, bookmarkFolders, debugInfo }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date()) // Default to today
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Memoize questions map for quick lookup
  const questionsMap = useMemo(() => {
    const map = new Map<string, QuestionWithProgress>()
    questionsList.forEach(q => map.set(q.id, q))
    return map
  }, [questionsList])

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  // Build calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  // Precompute activity per day
  const activityMap = useMemo(() => {
    const map = new Map<string, { solved: any[], revised: any[], due: any[] }>()
    
    // First setup empty lists for dates that have activity
    const addActivity = (dateStr: string, type: 'solved' | 'revised' | 'due', item: any) => {
      if (!map.has(dateStr)) map.set(dateStr, { solved: [], revised: [], due: [] })
      map.get(dateStr)![type].push(item)
    }

    progressList.forEach(p => {
      if (p.first_solved_at) {
        const dateStr = format(new Date(p.first_solved_at), 'yyyy-MM-dd')
        addActivity(dateStr, 'solved', p)
      }
    })

    revisionsList.forEach(r => {
      if (r.completed && r.completed_at) {
        const dateStr = format(new Date(r.completed_at), 'yyyy-MM-dd')
        addActivity(dateStr, 'revised', r)
      }
      if (!r.completed && r.scheduled_for) {
        // scheduled_for is just a date string, so avoid timezone shift by splitting directly
        const dateStr = r.scheduled_for.split('T')[0]
        addActivity(dateStr, 'due', r)
      }
    })

    return map
  }, [progressList, revisionsList])

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    setIsSidebarOpen(true)
  }

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* Main Calendar Area */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 ease-in-out",
        isSidebarOpen ? "pr-[400px] lg:pr-[450px]" : "pr-0"
      )}>
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/30 shrink-0">
          <h2 className="text-2xl font-bold">{format(currentMonth, 'MMMM yyyy')} <span className="text-[10px] text-red-500 max-w-[200px] truncate">IDS: {progressList.slice(0,2).map(p=>p.question_id).join(',')} | Qs: {questionsList.length}</span></h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
            <div className="flex items-center gap-1 bg-muted rounded-md p-1 border border-border">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={prevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-sm" onClick={nextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            {!isSidebarOpen && selectedDate && (
              <Button variant="secondary" size="sm" onClick={() => setIsSidebarOpen(true)} className="ml-2">
                Show Details
              </Button>
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col overflow-auto p-4 md:p-6 bg-background">
          <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden shadow-sm border border-border">
            {/* Days of week */}
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="bg-card/50 p-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {day}
              </div>
            ))}
            
            {/* Calendar Days */}
            {calendarDays.map((day, idx) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const activity = activityMap.get(dateStr)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const today = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "min-h-[120px] p-2 bg-card hover:bg-muted/50 cursor-pointer transition-colors border-t border-border flex flex-col gap-1 relative group",
                    !isCurrentMonth && "opacity-40",
                    isSelected && "bg-primary/5 ring-inset ring-2 ring-primary/50",
                    today && "bg-card shadow-[inset_0_0_20px_rgba(var(--primary),0.05)]"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className={cn(
                      "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                      today ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                      isSelected && !today && "bg-muted-foreground/20 text-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col gap-1 mt-1">
                    {activity?.solved && activity.solved.length > 0 && (
                      <div className="text-[11px] font-medium px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 truncate">
                        🔥 {activity.solved.length} Solved
                      </div>
                    )}
                    {activity?.revised && activity.revised.length > 0 && (
                      <div className="text-[11px] font-medium px-1.5 py-0.5 rounded-sm bg-blue-500/10 text-blue-500 border border-blue-500/20 truncate">
                        ✅ {activity.revised.length} Revised
                      </div>
                    )}
                    {activity?.due && activity.due.length > 0 && (
                      <div className="text-[11px] font-medium px-1.5 py-0.5 rounded-sm bg-amber-500/10 text-amber-500 border border-amber-500/20 truncate">
                        ⏳ {activity.due.length} Due
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className={cn(
        "absolute right-0 top-0 bottom-0 w-[400px] lg:w-[450px] bg-card border-l border-border flex flex-col shadow-2xl transition-transform duration-300 ease-in-out z-10",
        isSidebarOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div>
            <h3 className="font-semibold text-lg">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Details'}
            </h3>
            {selectedDate && isToday(selectedDate) && (
              <span className="text-xs text-primary font-medium">Today</span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(false)} className="rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {selectedDate && (
          <DayDetails 
            date={selectedDate}
            activity={activityMap.get(format(selectedDate, 'yyyy-MM-dd')) || { solved: [], revised: [], due: [] }}
            questionsMap={questionsMap}
            bookmarkFolders={bookmarkFolders}
          />
        )}
      </div>
    </div>
  )
}
