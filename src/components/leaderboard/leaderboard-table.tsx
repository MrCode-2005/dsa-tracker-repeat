'use client'

import { type LeaderboardEntry } from '@/lib/queries/leaderboard'
import { TierBadge } from './tier-badge'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

function DifficultyPills({ easy, medium, hard }: { easy: number; medium: number; hard: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-900/40 text-emerald-400">{easy}E</span>
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-900/40 text-yellow-400">{medium}M</span>
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-900/40 text-red-400">{hard}H</span>
    </div>
  )
}

function LeaderboardRow({
  entry,
  isYou,
}: {
  entry: LeaderboardEntry
  isYou: boolean
}) {
  const initials = (entry.displayName || '?').slice(0, 2).toUpperCase()

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
        isYou
          ? 'bg-primary/10 border border-primary/30 shadow-sm shadow-primary/10'
          : 'bg-card/50 border border-border/50 hover:bg-card hover:border-border'
      )}
    >
      {/* Rank */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
        isYou ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
      )}>
        {entry.rank}
      </div>

      {/* Avatar */}
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
        isYou ? 'bg-primary/30 text-primary' : 'bg-muted text-foreground'
      )}>
        {initials}
      </div>

      {/* Name + tier */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-sm font-semibold truncate', isYou && 'text-primary')}>
            {entry.displayName}
            {isYou && <span className="text-primary/70 text-xs ml-1">(You)</span>}
          </span>
          <TierBadge tier={entry.tier} />
        </div>
        {/* Difficulty pills — hidden on very small screens */}
        <div className="hidden sm:block mt-0.5">
          <DifficultyPills easy={entry.easyCount} medium={entry.mediumCount} hard={entry.hardCount} />
        </div>
      </div>

      {/* Streak */}
      {entry.currentStreak > 0 && (
        <div className="flex items-center gap-1 text-orange-400 text-xs font-medium shrink-0">
          <Flame className="w-3.5 h-3.5" />
          {entry.currentStreak}
        </div>
      )}

      {/* Score */}
      <div className="text-right shrink-0">
        <div className={cn('text-sm font-bold', isYou ? 'text-primary' : 'text-foreground')}>
          {entry.score.toLocaleString()}
        </div>
        <div className="text-[10px] text-muted-foreground">XP</div>
      </div>
    </div>
  )
}

export function LeaderboardTable({
  entries,
  currentUserId,
}: {
  entries: LeaderboardEntry[]
  currentUserId: string
}) {
  // entries starting from rank 4
  const rest = entries.filter(e => e.rank > 3)
  const you = entries.find(e => e.userId === currentUserId)
  const youIsInRest = you && you.rank > 3

  return (
    <div className="space-y-2">
      {rest.map(entry => (
        <LeaderboardRow
          key={entry.userId}
          entry={entry}
          isYou={entry.userId === currentUserId}
        />
      ))}

      {/* Sticky "you" row if you're ranked 4+ and not already visible at top */}
      {youIsInRest && you.rank > 8 && (
        <div className="pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground text-center pb-1">Your Position</div>
          <LeaderboardRow entry={you} isYou={true} />
        </div>
      )}
    </div>
  )
}
