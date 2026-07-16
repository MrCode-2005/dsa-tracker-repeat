'use client'

import { useQuery } from '@tanstack/react-query'
import { getCalendarData } from '@/lib/queries/calendar'
import { getBookmarkFolders } from '@/lib/queries/bookmarks'
import { CalendarView } from '@/components/calendar/calendar-view'
import { Loader2 } from 'lucide-react'

export default function CalendarPage() {
  const { data: calendarData, isLoading: isLoadingCalendar } = useQuery({
    queryKey: ['calendarData'],
    queryFn: getCalendarData
  })

  const { data: bookmarkFolders, isLoading: isLoadingBookmarks } = useQuery({
    queryKey: ['bookmarkFolders'],
    queryFn: getBookmarkFolders
  })

  if (isLoadingCalendar || isLoadingBookmarks || !calendarData) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-4rem)] bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] -mt-6 -mx-4 md:-mx-8 overflow-hidden bg-background">
      <CalendarView 
        progressList={calendarData.progressList}
        revisionsList={calendarData.revisionsList}
        questionsList={calendarData.questionsList}
        bookmarkFolders={bookmarkFolders || []}
        debugInfo={calendarData.debug}
      />
    </div>
  )
}
