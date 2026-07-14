'use client'

import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakCounterProps {
  currentStreak: number
  highestStreak: number
  className?: string
}

export function StreakCounter({ currentStreak, highestStreak, className }: StreakCounterProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex items-center gap-2">
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-xl',
          currentStreak > 0
            ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400'
            : 'bg-muted text-muted-foreground'
        )}>
          <Flame className={cn('w-5 h-5', currentStreak > 0 && 'animate-pulse')} />
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              'text-2xl font-bold font-mono tabular-nums',
              currentStreak > 0 ? 'text-amber-400 streak-bump' : 'text-muted-foreground'
            )}>
              {currentStreak}
            </span>
            <span className="text-xs text-muted-foreground">days</span>
          </div>
          <p className="text-xs text-muted-foreground">Current streak</p>
        </div>
      </div>

      <div className="w-px h-8 bg-border" />

      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold font-mono tabular-nums text-foreground/80">
            {highestStreak}
          </span>
          <span className="text-xs text-muted-foreground">days</span>
        </div>
        <p className="text-xs text-muted-foreground">Best streak</p>
      </div>
    </div>
  )
}
