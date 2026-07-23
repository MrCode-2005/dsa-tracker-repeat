import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface RankDeltaProps {
  delta: number // positive = moved up, negative = moved down
}

export function RankDelta({ delta }: RankDeltaProps) {
  if (delta === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" />
      </span>
    )
  }
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-500">
        <TrendingUp className="w-3 h-3" />
        +{delta}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium text-red-500">
      <TrendingDown className="w-3 h-3" />
      {delta}
    </span>
  )
}
