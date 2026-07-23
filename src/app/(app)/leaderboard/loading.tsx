import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading leaderboard...</p>
      </div>
    </div>
  )
}
