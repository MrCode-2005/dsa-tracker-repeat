'use client'

import { type LeaderboardEntry } from '@/lib/queries/leaderboard'
import { TierBadge } from './tier-badge'
import { Flame, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

const MEDAL_CONFIG = {
  1: {
    glow: 'shadow-yellow-500/30',
    border: 'border-yellow-500/50',
    bg: 'bg-gradient-to-b from-yellow-950/60 to-yellow-900/30',
    crown: 'text-yellow-400',
    ring: 'ring-2 ring-yellow-500/60',
    label: '1st',
    height: 'h-32',
    order: 'order-2',
    zIndex: 'z-10',
  },
  2: {
    glow: 'shadow-slate-400/20',
    border: 'border-slate-400/50',
    bg: 'bg-gradient-to-b from-slate-800/60 to-slate-700/30',
    crown: 'text-slate-300',
    ring: 'ring-2 ring-slate-400/50',
    label: '2nd',
    height: 'h-24',
    order: 'order-1',
    zIndex: 'z-0',
  },
  3: {
    glow: 'shadow-amber-700/20',
    border: 'border-amber-700/50',
    bg: 'bg-gradient-to-b from-amber-950/60 to-amber-900/30',
    crown: 'text-amber-600',
    ring: 'ring-2 ring-amber-700/50',
    label: '3rd',
    height: 'h-20',
    order: 'order-3',
    zIndex: 'z-0',
  },
} as const

function PodiumCard({ entry, isYou }: { entry: LeaderboardEntry; isYou: boolean }) {
  const pos = entry.rank as 1 | 2 | 3
  const cfg = MEDAL_CONFIG[pos]
  const initials = (entry.displayName || '?').slice(0, 2).toUpperCase()

  return (
    <div className={`flex flex-col items-center gap-2 ${cfg.order} ${cfg.zIndex} relative`}>
      {/* Crown + Avatar */}
      <div className="flex flex-col items-center gap-1">
        <Crown className={`w-5 h-5 ${cfg.crown}`} />
        <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold ${cfg.ring} ${isYou ? 'bg-primary/30 text-primary' : 'bg-card text-foreground'}`}>
          {initials}
        </div>
      </div>

      {/* Name + tier */}
      <div className="text-center max-w-[100px]">
        <p className={`text-sm font-semibold truncate ${isYou ? 'text-primary' : 'text-foreground'}`}>
          {entry.displayName}{isYou ? ' (You)' : ''}
        </p>
        <TierBadge tier={entry.tier} />
      </div>

      {/* Podium block */}
      <div className={`w-24 ${cfg.height} rounded-t-lg ${cfg.bg} border ${cfg.border} shadow-lg ${cfg.glow} flex flex-col items-center justify-start pt-2 gap-1`}>
        <span className="text-xs font-bold text-foreground/60">{cfg.label}</span>
        <span className="text-base font-bold text-foreground">{entry.score.toLocaleString()}</span>
        <span className="text-[10px] text-muted-foreground">XP</span>
        {entry.currentStreak > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
            <Flame className="w-3 h-3" />{entry.currentStreak}d
          </span>
        )}
      </div>
    </div>
  )
}

export function LeaderboardPodium({
  top3,
  currentUserId,
}: {
  top3: LeaderboardEntry[]
  currentUserId: string
}) {
  if (top3.length === 0) return null

  return (
    <div className="flex items-end justify-center gap-4 py-6 px-4">
      {top3.map(entry => (
        <PodiumCard
          key={entry.userId}
          entry={entry}
          isYou={entry.userId === currentUserId}
        />
      ))}
    </div>
  )
}
