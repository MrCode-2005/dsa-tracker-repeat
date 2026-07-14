import { Skeleton } from '@/components/ui/skeleton'

export function QuestionCardSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card/30">
      <Skeleton className="h-5 w-5 rounded-full" />
      <Skeleton className="h-4 w-10" />
      <Skeleton className="h-4 flex-1 max-w-64" />
      <Skeleton className="h-5 w-16 rounded-full" />
      <div className="flex gap-1">
        <Skeleton className="h-7 w-7 rounded" />
        <Skeleton className="h-7 w-7 rounded" />
        <Skeleton className="h-7 w-7 rounded" />
      </div>
    </div>
  )
}

export function QuestionListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <QuestionCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="p-6 rounded-xl border border-border bg-card/50">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-32" />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="p-6 rounded-xl border border-border bg-card/50">
      <Skeleton className="h-5 w-40 mb-6" />
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 80 + 20}%` }}
          />
        ))}
      </div>
    </div>
  )
}

export function HeatmapSkeleton() {
  return (
    <div className="p-6 rounded-xl border border-border bg-card/50">
      <Skeleton className="h-5 w-48 mb-4" />
      <div className="grid grid-cols-[repeat(53,1fr)] gap-1">
        {Array.from({ length: 7 * 53 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-sm" style={{ opacity: Math.random() * 0.5 + 0.1 }} />
        ))}
      </div>
    </div>
  )
}

export function ListCardSkeleton() {
  return (
    <div className="p-6 rounded-xl border border-border bg-card/50 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-1" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}
