import { type LeaderboardEntry } from '@/lib/queries/leaderboard'

const TIER_CONFIG = {
  bronze: { label: 'Bronze', bg: 'bg-amber-900/40', text: 'text-amber-400', border: 'border-amber-700/50', dot: 'bg-amber-500' },
  silver: { label: 'Silver', bg: 'bg-slate-700/40', text: 'text-slate-300', border: 'border-slate-500/50', dot: 'bg-slate-400' },
  gold:   { label: 'Gold',   bg: 'bg-yellow-900/40', text: 'text-yellow-400', border: 'border-yellow-600/50', dot: 'bg-yellow-400' },
  diamond:{ label: 'Diamond',bg: 'bg-cyan-900/40',   text: 'text-cyan-400',  border: 'border-cyan-500/50',   dot: 'bg-cyan-400' },
}

export function TierBadge({ tier }: { tier: LeaderboardEntry['tier'] }) {
  const cfg = TIER_CONFIG[tier]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
