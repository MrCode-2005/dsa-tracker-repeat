'use client'

import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface HeatmapData {
  date: string
  count: number
  solves: number
  revisions: number
}

interface CalendarHeatmapProps {
  data: HeatmapData[]
  year?: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function getColor(count: number): string {
  if (count === 0) return 'var(--color-heatmap-0)'
  if (count <= 2) return 'var(--color-heatmap-1)'
  if (count <= 4) return 'var(--color-heatmap-2)'
  if (count <= 6) return 'var(--color-heatmap-3)'
  return 'var(--color-heatmap-4)'
}

export function CalendarHeatmap({ data, year }: CalendarHeatmapProps) {
  const targetYear = year || new Date().getFullYear()

  const { cells, monthLabels } = useMemo(() => {
    const dataMap = new Map(data.map(d => [d.date, d]))

    // Find the first day of the year
    const startDate = new Date(targetYear, 0, 1)
    const endDate = new Date(targetYear, 11, 31)

    // Align to start of week (Sunday)
    const firstSunday = new Date(startDate)
    firstSunday.setDate(firstSunday.getDate() - firstSunday.getDay())

    const cells: Array<{
      date: string
      count: number
      solves: number
      revisions: number
      col: number
      row: number
      isCurrentYear: boolean
    }> = []

    const monthLabels: Array<{ month: string; col: number }> = []
    let lastMonth = -1

    const current = new Date(firstSunday)
    let col = 0

    while (current <= endDate || current.getDay() !== 0) {
      if (current > endDate && current.getDay() === 0 && col > 0) break

      const dateStr = current.toISOString().split('T')[0]
      const row = current.getDay()
      const isCurrentYear = current.getFullYear() === targetYear

      const entry = dataMap.get(dateStr)

      cells.push({
        date: dateStr,
        count: entry?.count || 0,
        solves: entry?.solves || 0,
        revisions: entry?.revisions || 0,
        col,
        row,
        isCurrentYear,
      })

      // Track month labels
      if (isCurrentYear && current.getMonth() !== lastMonth) {
        monthLabels.push({ month: MONTHS[current.getMonth()], col })
        lastMonth = current.getMonth()
      }

      current.setDate(current.getDate() + 1)
      if (current.getDay() === 0) col++
    }

    return { cells, monthLabels }
  }, [data, targetYear])

  const maxCol = Math.max(...cells.map(c => c.col))
  const svgWidth = (maxCol + 1) * 14 + 30
  const svgHeight = 7 * 14 + 30

  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <svg width={svgWidth} height={svgHeight} className="min-w-fit">
        {/* Day labels */}
        {DAYS.map((day, i) => (
          <text
            key={`day-${i}`}
            x={8}
            y={28 + i * 14}
            className="fill-muted-foreground"
            style={{ fontSize: '9px', fontFamily: 'var(--font-mono)' }}
            dominantBaseline="middle"
          >
            {day}
          </text>
        ))}

        {/* Month labels */}
        {monthLabels.map((m, i) => (
          <text
            key={`month-${i}`}
            x={30 + m.col * 14}
            y={10}
            className="fill-muted-foreground"
            style={{ fontSize: '9px', fontFamily: 'var(--font-mono)' }}
          >
            {m.month}
          </text>
        ))}

        {/* Cells */}
        {cells.map((cell, i) => (
          <Tooltip key={i}>
            <TooltipTrigger>
              <rect
                x={30 + cell.col * 14}
                y={18 + cell.row * 14}
                width={11}
                height={11}
                rx={2}
                ry={2}
                fill={cell.isCurrentYear ? getColor(cell.count) : 'transparent'}
                className="transition-colors duration-100 hover:stroke-foreground/30"
                strokeWidth={cell.isCurrentYear ? 0 : 0}
              />
            </TooltipTrigger>
            {cell.isCurrentYear && (
              <TooltipContent side="top" className="text-xs">
                <div className="font-medium">
                  {new Date(cell.date + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-muted-foreground">
                  {cell.count === 0
                    ? 'No activity'
                    : `${cell.count} ${cell.count === 1 ? 'activity' : 'activities'} (${cell.solves} solves, ${cell.revisions} revisions)`}
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </svg>
    </div>
  )
}
