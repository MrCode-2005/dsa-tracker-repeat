'use client'

import { use, useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
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
import { deleteList } from '@/lib/actions/lists'
import { AddQuestionDialog } from './add-question-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function ListDetailPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = use(params)
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const filters: QuestionFilters = {
    search: searchParams.get('search') || '',
    status: (searchParams.get('status') as QuestionFilters['status']) || 'all',
    difficulty: (searchParams.get('difficulty') as QuestionFilters['difficulty']) || 'all',
    companies: searchParams.get('companies')?.split(',').filter(Boolean) || [],
  }

  const { data: listDetails } = useQuery({
    queryKey: ['list-details', listId],
    queryFn: () => getListDetails(listId),
  })

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

  return (
    <div className="space-y-6 animate-in-up pb-20">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" render={<Link href="/lists" />} nativeButton={false}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">{listDetails?.name || 'Loading...'}</h1>
          
          {listDetails?.source_type === 'custom' && (
            <AddQuestionDialog listId={listId} onSuccess={handleRefresh} />
          )}

          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={async () => {
            if (confirm('Delete this list?')) {
              await deleteList(listId)
              toast.success('List deleted')
              router.push('/lists')
            }
          }}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-muted-foreground ml-12">{listDetails?.description}</p>
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
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_36px_36px_36px_36px_72px_36px_80px_36px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border/50">
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

            {questions.map((q, idx) => (
              <div
                key={q.id}
                id={`question-${q.id}`}
                className={highlightedId === q.id ? 'ring-2 ring-primary rounded-lg transition-all' : ''}
              >
                <QuestionCard
                  question={q}
                  listId={listDetails?.source_type === 'custom' ? listId : undefined}
                  bookmarkFolders={bookmarkFolders || []}
                  onUpdate={handleRefresh}
                  index={idx + 1}
                />
              </div>
            ))}
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
