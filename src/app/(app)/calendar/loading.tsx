import { Loader2 } from 'lucide-react'

export default function CalendarLoading() {
  return (
    <div className="flex-1 flex items-center justify-center h-[calc(100vh-4rem)] bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  )
}
