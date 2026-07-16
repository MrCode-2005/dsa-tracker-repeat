'use client'

import { use, useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Trash2, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { QuestionCard } from '@/components/question-card'
import { FilterBar } from '@/components/filters/filter-bar'
import { QuestionListSkeleton } from '@/components/loading-skeletons'
import { ErrorBoundary } from '@/components/error-boundary'
import { getListQuestions, getAllCompanies, type QuestionFilters } from '@/lib/queries/questions'
import { getListDetails } from '@/lib/queries/lists'
import { getBookmarkFolders } from '@/lib/queries/bookmarks'
import { deleteList, updateListName } from '@/lib/actions/lists'
import { AddQuestionDialog } from './add-question-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { SessionProgress } from '@/components/session-progress'
import { Input } from '@/components/ui/input'

export default function ListDetailPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = use(params)
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [isSavingTitle, setIsSavingTitle] = useState(false)

  const filters: QuestionFilters = {
    search: searchParams.get('search') || '',
    status: (searchParams.get('status') as QuestionFilters['status']) || 'all',
    difficulty: (searchParams.get('difficulty') as QuestionFilters['difficulty']) || 'all',
    companies: searchParams.get('companies')?.split(',').filter(Boolean) || [],
    topic: searchParams.get('topic') || 'all',
  }

  const { data: listDetails } = useQuery({
    queryKey: ['list-details', listId],
    queryFn: () => getListDetails(listId),
  })

  // Sync edited title when details load
  useEffect(() => {
    if (listDetails?.name && !isEditingTitle) {
      setEditedTitle(listDetails.name)
    }
  }, [listDetails?.name, isEditingTitle])

  const handleSaveTitle = async () => {
    if (!editedTitle.trim() || editedTitle === listDetails?.name) {
      setIsEditingTitle(false)
      return
    }
    setIsSavingTitle(true)
    try {
      await updateListName(listId, editedTitle)
      queryClient.invalidateQueries({ queryKey: ['list-details', listId] })
      queryClient.invalidateQueries({ queryKey: ['user-lists'] })
      toast.success('List name updated')
      setIsEditingTitle(false)
    } catch (error) {
      toast.error('Failed to update name')
    } finally {
      setIsSavingTitle(false)
    }
  }

  const { data: questions, isLoading } = useQuery({
    queryKey: ['list-questions', listId, filters],
    queryFn: () => getListQuestions(listId, filters),
  })

  const { data: allQuestions } = useQuery({
    queryKey: ['list-questions-all', listId],
    queryFn: () => getListQuestions(listId),
  })

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: getAllCompanies,
  })

  const { data: bookmarkFolders } = useQuery({
    queryKey: ['bookmark-folders'],
    queryFn: getBookmarkFolders,
  })

  const topicCounts = Array.from(
    (allQuestions || []).reduce((acc, q) => {
      if (q.topic) {
        acc.set(q.topic, (acc.get(q.topic) || 0) + 1)
      }
      return acc
    }, new Map<string, number>()).entries()
  )
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)

  const solvedCount = allQuestions?.filter(q => q.progress?.status === 'solved').length || 0
  const totalCount = allQuestions?.length || 0
  const pct = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['list-questions'] })
    queryClient.invalidateQueries({ queryKey: ['list-questions-all'] })
    queryClient.invalidateQueries({ queryKey: ['user-lists'] })
  }, [queryClient])

  const handleRandomPick = useCallback(() => {
    if (!questions || questions.length === 0) return
    const randomQ = questions[Math.floor(Math.random() * questions.length)]
    setHighlightedId(randomQ.id)
    setTimeout(() => {
      document.getElementById(`question-${randomQ.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
    setTimeout(() => setHighlightedId(null), 3000)
  }, [questions])

  const listStats = useMemo(() => {
    if (!allQuestions) return null
    const stats = {
      easy: { solved: 0, total: 0 },
      medium: { solved: 0, total: 0 },
      hard: { solved: 0, total: 0 },
      totalSolved: 0,
      totalQuestions: allQuestions.length
    }
    allQuestions.forEach(q => {
      const diffKey = q.difficulty?.toLowerCase() as 'easy' | 'medium' | 'hard'
      const isSolved = q.progress?.status === 'solved'
      if (stats[diffKey]) {
        stats[diffKey].total++
        if (isSolved) {
          stats[diffKey].solved++
          stats.totalSolved++
        }
      }
    })
    return stats
  }, [allQuestions])

  return (
    <div className="space-y-6 animate-in-up pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" className="h-8 w-8" render={<Link href="/lists" />} nativeButton={false}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          {isEditingTitle ? (
            <div className="flex-1 flex items-center gap-2">
              <Input 
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle()
                  if (e.key === 'Escape') setIsEditingTitle(false)
                }}
                disabled={isSavingTitle}
                autoFocus
                className="max-w-[300px] h-9 text-lg font-bold"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={handleSaveTitle} disabled={isSavingTitle}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingTitle(false)} disabled={isSavingTitle}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 group">
              <h1 className="text-2xl font-bold">{listDetails?.name || 'Loading...'}</h1>
              {listDetails?.source_type === 'custom' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          )}
          
          {listDetails?.source_type === 'custom' && (
            <AddQuestionDialog listId={listId} onSuccess={handleRefresh} />
          )}

          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={async () => {
            if (confirm('Delete this list?')) {
              await deleteList(listId)
              queryClient.invalidateQueries({ queryKey: ['user-lists'] })
              toast.success('List deleted')
              router.push('/lists')
            }
          }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <ErrorBoundary>
          <div className="ml-12 mt-4">
            <SessionProgress stats={listStats || undefined} />
          </div>
        </ErrorBoundary>
        <p className="text-muted-foreground ml-12 mt-4">{listDetails?.description}</p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-mono">{solvedCount}/{totalCount} <span className="text-muted-foreground ml-1">({pct}%)</span></span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {/* Filters */}
      <FilterBar
        companies={companies || []}
        topics={topicCounts}
        onRandomPick={handleRandomPick}
        totalCount={totalCount}
        filteredCount={questions?.length || 0}
      />

      {/* Questions */}
      <ErrorBoundary>
        {isLoading ? (
          <QuestionListSkeleton count={10} />
        ) : questions && questions.length > 0 ? (
          <div className="space-y-2">
            {/* Header row for grid alignment */}
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_auto_36px_36px_36px_84px_36px_80px_36px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/50">
              <div>Problem</div>
              <div className="text-center" title="Video Solution">Video</div>
              <div className="text-center" title="LeetCode">Code</div>
              <div className="text-center" title="Notes">Notes</div>
              <div className="text-center" title="Bookmark">Save</div>
              <div className="text-center" title="Spaced Repetition">Review</div>
              <div className="text-center" title="Mark Done">Done</div>
              <div className="text-center">Difficulty</div>
              <div></div>
            </div>

            {questions.map((q, idx) => {
              const displayIndex = typeof q.list_position === 'number' ? q.list_position + 1 : idx + 1

              return (
                <div
                  key={q.id}
                  id={`question-${q.id}`}
                  className={highlightedId === q.id ? 'ring-2 ring-primary rounded-lg transition-all' : ''}
                >
                  <QuestionCard
                    question={q}
                    listId={listId}
                    bookmarkFolders={bookmarkFolders || []}
                    onUpdate={handleRefresh}
                    index={displayIndex}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No questions match your filters</p>
          </div>
        )}
      </ErrorBoundary>
    </div>
  )
}
