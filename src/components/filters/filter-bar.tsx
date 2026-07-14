'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, Filter, Shuffle, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { QuestionFilters } from '@/lib/queries/questions'

interface FilterBarProps {
  companies?: string[]
  onRandomPick?: () => void
  totalCount?: number
  filteredCount?: number
}

export function FilterBar({ companies = [], onRandomPick, totalCount = 0, filteredCount = 0 }: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get('search') || '')

  // Read filters from URL
  const currentFilters: QuestionFilters = {
    search: searchParams.get('search') || '',
    status: (searchParams.get('status') as QuestionFilters['status']) || 'all',
    difficulty: (searchParams.get('difficulty') as QuestionFilters['difficulty']) || 'all',
    companies: searchParams.get('companies')?.split(',').filter(Boolean) || [],
  }

  const updateFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }, [router, pathname, searchParams, startTransition])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilter('search', search)
    }, 300)
    return () => clearTimeout(timer)
  }, [search, updateFilter])

  const clearAllFilters = () => {
    setSearch('')
    startTransition(() => {
      router.replace(pathname, { scroll: false })
    })
  }

  const hasActiveFilters = currentFilters.search || currentFilters.status !== 'all' || currentFilters.difficulty !== 'all' || (currentFilters.companies && currentFilters.companies.length > 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or # number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-background/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <Select value={currentFilters.status || 'all'} onValueChange={(v) => updateFilter('status', v ?? 'all')}>
          <SelectTrigger className="w-32 h-9 bg-background/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="solved">Solved</SelectItem>
            <SelectItem value="unsolved">Unsolved</SelectItem>
          </SelectContent>
        </Select>

        {/* Difficulty filter */}
        <Select value={currentFilters.difficulty || 'all'} onValueChange={(v) => updateFilter('difficulty', v ?? 'all')}>
          <SelectTrigger className="w-32 h-9 bg-background/50">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Difficulty</SelectItem>
            <SelectItem value="Easy">Easy</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Hard">Hard</SelectItem>
          </SelectContent>
        </Select>

        {/* Company filter */}
        {companies.length > 0 && (
          <Select
            value={currentFilters.companies?.[0] || 'all'}
            onValueChange={(v) => updateFilter('companies', v ?? 'all')}
          >
            <SelectTrigger className="w-36 h-9 bg-background/50">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Random button */}
        <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={onRandomPick}>
          <Shuffle className="w-3.5 h-3.5" />
          Random
        </Button>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={clearAllFilters}>
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Showing {filteredCount} of {totalCount} questions</span>
        {hasActiveFilters && (
          <Badge variant="secondary" className="text-xs">Filtered</Badge>
        )}
      </div>
    </div>
  )
}
