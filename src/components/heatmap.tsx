'use client'

import { useMemo, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface HeatmapData {
  date: string
  count: number
  solves: number
  revisions: number
}

interface CalendarHeatmapProps {
  data: HeatmapData[]
  year?: string // 'current' | '2026' | '2025'
  onYearChange?: (year: string) => void
  years?: string[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function getColor(count: number): string {
  if (count === 0) return '#2a2a2a' // LeetCode empty square color
  if (count <= 2) return '#0e4429'
  if (count <= 4) return '#006d32'
  if (count <= 6) return '#26a641'
  return '#39d353'
}

export function CalendarHeatmap({ data, year = 'current', onYearChange, years = ['current'] }: CalendarHeatmapProps) {
  const { cells, monthLabels, totalActiveDays, totalSolves } = useMemo(() => {
    const dataMap = new Map(data.map(d => [d.date, d]))
    
    let startDate: Date
    let endDate: Date

    if (year === 'current') {
      endDate = new Date()
      startDate = new Date()
      startDate.setFullYear(startDate.getFullYear() - 1)
    } else {
      const targetYear = parseInt(year)
      startDate = new Date(targetYear, 0, 1)
      endDate = new Date(targetYear, 11, 31)
      // If it's the current calendar year, cap endDate to today to avoid showing future empty squares
      if (targetYear === new Date().getFullYear()) {
        endDate = new Date()
      }
    }

    // To create Leetcode-style month gaps, we track each month separately
    const cells: Array<{
      date: string
      count: number
      solves: number
      revisions: number
      col: number
      row: number
      x: number
      y: number
    }> = []

    const monthLabels: Array<{ month: string; x: number }> = []

    let currentX = 30
    let totalActiveDays = 0
    let totalSolves = 0

    // We iterate through each month in the range
    let currentMonthStart = new Date(startDate)
    currentMonthStart.setDate(1) // Start at the 1st of the month

    while (currentMonthStart <= endDate) {
      const currentMonth = currentMonthStart.getMonth()
      const currentYearStr = currentMonthStart.getFullYear()
      
      const monthLabelX = currentX
      let addedLabel = false

      // First day of this month block
      const monthStart = new Date(Math.max(currentMonthStart.getTime(), startDate.getTime()))
      // Last day of this month block
      const monthEnd = new Date(currentYearStr, currentMonth + 1, 0)
      const actualMonthEnd = monthEnd > endDate ? endDate : monthEnd

      let col = 0
      let current = new Date(monthStart)

      while (current <= actualMonthEnd) {
        const dateStr = current.toISOString().split('T')[0]
        const row = current.getDay() // 0 = Sun, 1 = Mon

        const entry = dataMap.get(dateStr)
        const count = entry?.count || 0
        const solves = entry?.solves || 0
        
        if (count > 0) {
          totalActiveDays++
          totalSolves += solves
        }

        cells.push({
          date: dateStr,
          count,
          solves,
          revisions: entry?.revisions || 0,
          col,
          row,
          x: currentX + col * 15,
          y: 20 + row * 15
        })

        if (!addedLabel && row === 0) {
           monthLabels.push({ month: MONTHS[currentMonth], x: currentX + col * 15 })
           addedLabel = true
        }

        current.setDate(current.getDate() + 1)
        if (current.getDay() === 0) {
          col++
        }
      }

      // If we didn't add a label (e.g. month started mid-week and ended before Sunday)
      if (!addedLabel) {
        monthLabels.push({ month: MONTHS[currentMonth], x: monthLabelX })
      }

      // Advance X by the number of columns used + gap
      currentX += (col + 1) * 15 + 10 // 10px gap between months

      // Next month
      currentMonthStart = new Date(currentYearStr, currentMonth + 1, 1)
    }

    return { cells, monthLabels, totalActiveDays, totalSolves }
  }, [data, year])

  const maxCol = Math.max(...cells.map(c => c.x))
  const svgWidth = maxCol + 30
  const svgHeight = 7 * 15 + 30

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold">{totalSolves} problems solved</h3>
          <p className="text-xs text-muted-foreground mt-1">in the past one year</p>
        </div>
        <div className="flex items-center gap-6 mt-4 sm:mt-0">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total active days</p>
            <p className="text-sm font-semibold">{totalActiveDays}</p>
          </div>
          {onYearChange && years.length > 0 && (
            <Select value={year} onValueChange={(v) => onYearChange(v ?? 'current')}>
              <SelectTrigger className="w-[100px] h-8 bg-card/50 text-xs border-border">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y} className="text-xs">
                    {y === 'current' ? 'Current' : y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="w-full overflow-x-auto custom-scrollbar pb-2">
        <svg width={svgWidth} height={svgHeight} className="min-w-fit">
          {/* Day labels */}
          {DAYS.map((day, i) => (
            <text
              key={`day-${i}`}
              x={8}
              y={30 + i * 15}
              className="fill-muted-foreground"
              style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}
              dominantBaseline="middle"
            >
              {day}
            </text>
          ))}

          {/* Month labels */}
          {monthLabels.map((m, i) => (
            <text
              key={`month-${i}`}
              x={m.x}
              y={10}
              className="fill-muted-foreground"
              style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}
            >
              {m.month}
            </text>
          ))}

          {/* Cells */}
          {cells.map((cell, i) => (
            <Tooltip key={i}>
              <TooltipTrigger
                render={
                  <rect
                    x={cell.x}
                    y={cell.y}
                    width={11}
                    height={11}
                    rx={2}
                    ry={2}
                    fill={getColor(cell.count)}
                    className="transition-colors duration-100 focus:outline-none cursor-pointer hover:stroke-foreground/50 hover:stroke-[1px]"
                  />
                }
              />
              <TooltipContent side="top" className="text-xs bg-[#2a2a2a] text-white border-none shadow-xl">
                <div className="font-medium text-[11px] text-gray-300 mb-1">
                  {new Date(cell.date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-white font-medium">
                  {cell.count === 0
                    ? 'No activity'
                    : `${cell.count} ${cell.count === 1 ? 'submission' : 'submissions'} (${cell.solves} solves)`}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </svg>
      </div>

      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(level => (
          <div key={level} className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: getColor(level > 0 ? level * 2 : 0) }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
