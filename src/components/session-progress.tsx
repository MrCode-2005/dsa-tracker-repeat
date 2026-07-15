'use client'

import React from 'react'

interface DifficultyStats {
  solved: number
  total: number
}

interface SessionStats {
  easy: DifficultyStats
  medium: DifficultyStats
  hard: DifficultyStats
  totalSolved: number
  totalQuestions: number
}

interface SessionProgressProps {
  stats?: SessionStats
}

export function SessionProgress({ stats }: SessionProgressProps) {
  if (!stats) {
    return <div className="animate-pulse bg-[#282828] rounded-2xl h-48 w-full max-w-sm" />
  }

  const { easy, medium, hard, totalSolved, totalQuestions } = stats

  // SVG dimensions
  const size = 160
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  
  // We want 3 gaps. Let's make the gap relative to circumference.
  const gap = 6
  // Total circumference available for the 3 arcs
  // If totalQuestions is 0, we'll just show a gray circle
  const availableLength = totalQuestions > 0 ? circumference - (3 * gap) : circumference

  const easyLen = totalQuestions > 0 ? (easy.total / totalQuestions) * availableLength : availableLength / 3
  const medLen = totalQuestions > 0 ? (medium.total / totalQuestions) * availableLength : availableLength / 3
  const hardLen = totalQuestions > 0 ? (hard.total / totalQuestions) * availableLength : availableLength / 3

  // Calculate start positions
  // We want to start slightly offset so it matches LeetCode roughly (Easy usually starts around 7 or 8 o'clock)
  // Standard SVG circle starts at 3 o'clock. We rotate the SVG group by -90deg to start at 12 o'clock.
  // In the screenshot, Easy starts at roughly 8 o'clock, goes clockwise to 11.
  // Medium starts at 11, goes to 4.
  // Hard starts at 4, goes to 8.
  
  // Let's start Easy at roughly 210 degrees (-150deg from 12 o'clock).
  // 1 degree = circumference / 360
  const startOffset = (210 / 360) * circumference

  const easyStart = startOffset
  const medStart = easyStart + easyLen + gap
  const hardStart = medStart + medLen + gap

  const easySolvedLen = easy.total > 0 ? (easy.solved / easy.total) * easyLen : 0
  const medSolvedLen = medium.total > 0 ? (medium.solved / medium.total) * medLen : 0
  const hardSolvedLen = hard.total > 0 ? (hard.solved / hard.total) * hardLen : 0

  const easyColor = '#00b8a3'
  const medColor = '#ffc01e'
  const hardColor = '#ef4743'

  return (
    <div className="bg-[#282828] rounded-2xl p-5 shadow-lg flex items-center justify-between max-w-[340px] text-white font-sans">
      
      {/* Left: SVG Chart */}
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          {/* Easy Background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={easyColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeOpacity={0.2}
            strokeDasharray={`${easyLen} ${circumference - easyLen}`}
            strokeDashoffset={-easyStart}
          />
          {/* Easy Foreground */}
          {easySolvedLen > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={easyColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${easySolvedLen} ${circumference - easySolvedLen}`}
              strokeDashoffset={-easyStart}
            />
          )}

          {/* Medium Background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={medColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeOpacity={0.2}
            strokeDasharray={`${medLen} ${circumference - medLen}`}
            strokeDashoffset={-medStart}
          />
          {/* Medium Foreground */}
          {medSolvedLen > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={medColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${medSolvedLen} ${circumference - medSolvedLen}`}
              strokeDashoffset={-medStart}
            />
          )}

          {/* Hard Background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={hardColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeOpacity={0.2}
            strokeDasharray={`${hardLen} ${circumference - hardLen}`}
            strokeDashoffset={-hardStart}
          />
          {/* Hard Foreground */}
          {hardSolvedLen > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={hardColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${hardSolvedLen} ${circumference - hardSolvedLen}`}
              strokeDashoffset={-hardStart}
            />
          )}
        </svg>

        {/* Center Text */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline gap-0.5">
            <span className="text-4xl font-semibold tracking-tight">{totalSolved}</span>
            <span className="text-gray-400 text-sm font-medium">/{totalQuestions}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[#00b8a3] text-sm">✓</span>
            <span className="text-gray-300 text-sm font-medium">Solved</span>
          </div>
        </div>
      </div>

      {/* Right: Badges */}
      <div className="flex flex-col gap-2.5 ml-6 w-28">
        {/* Easy */}
        <div className="bg-[#323232] rounded-lg py-2 flex flex-col items-center justify-center">
          <span className="text-[#00b8a3] text-sm font-medium tracking-wide">Easy</span>
          <span className="text-white font-medium text-sm mt-0.5">{easy.solved}<span className="text-gray-400">/{easy.total}</span></span>
        </div>
        
        {/* Medium */}
        <div className="bg-[#323232] rounded-lg py-2 flex flex-col items-center justify-center">
          <span className="text-[#ffc01e] text-sm font-medium tracking-wide">Med.</span>
          <span className="text-white font-medium text-sm mt-0.5">{medium.solved}<span className="text-gray-400">/{medium.total}</span></span>
        </div>

        {/* Hard */}
        <div className="bg-[#323232] rounded-lg py-2 flex flex-col items-center justify-center">
          <span className="text-[#ef4743] text-sm font-medium tracking-wide">Hard</span>
          <span className="text-white font-medium text-sm mt-0.5">{hard.solved}<span className="text-gray-400">/{hard.total}</span></span>
        </div>
      </div>
    </div>
  )
}
