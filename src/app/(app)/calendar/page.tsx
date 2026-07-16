import { getCalendarData } from '@/lib/queries/calendar'
import { getBookmarkFolders } from '@/lib/queries/bookmarks'
import { CalendarView } from '@/components/calendar/calendar-view'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Calendar | Repeat DSA Tracker',
  description: 'Track your DSA progress and spaced repetition schedule.',
}

export default async function CalendarPage() {
  const [calendarData, bookmarkFolders] = await Promise.all([
    getCalendarData(),
    getBookmarkFolders(),
  ])

  // Map to simple JSON-serializable structure
  const progressList = calendarData.progressList
  const revisionsList = calendarData.revisionsList
  const questionsList = calendarData.questionsList
  console.log("CALENDAR PAGE DATA:", {
    progress: progressList.length,
    revisions: revisionsList.length,
    questions: questionsList.length,
  })

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] -mt-6 -mx-4 md:-mx-8 overflow-hidden bg-background">
      <CalendarView 
        progressList={progressList}
        revisionsList={revisionsList}
        questionsList={questionsList}
        bookmarkFolders={bookmarkFolders}
        debugInfo={calendarData.debug}
      />
    </div>
  )
}
