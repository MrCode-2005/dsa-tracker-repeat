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

  const solvedCount = allQuestions?.filter(q => q.progress?.status === 'solved').length || 0
  const totalCount = allQuestions?.length || 0
  const pct = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['list-questions'] })
    queryClient.invalidateQueries({ queryKey: ['list-questions-all'] })
  }, [queryClient])

  const handleRandomPick = useCallback(() => {
    if (!questions || questions.length === 0) return
    const random = questions[Math.floor(Math.random() * questions.length)]
    setHighlightedId(random.id)
    const el = document.getElementById(`question-${random.id}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => setHighlightedId(null), 3000)
  }, [questions])

  const handleDeleteList = async () => {
    if (!confirm('Delete this list? This cannot be undone.')) return
    try {
      await deleteList(listId)
      toast.success('List deleted')
      router.push('/lists')
    } catch {
      toast.error('Failed to delete list')
    }
  }

  return (
    <div className="space-y-6 animate-in-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" render={<Link href="/lists" />} nativeButton={false} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{listDetails?.name || 'Loading...'}</h1>
            {listDetails?.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{listDetails.description}</p>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={handleDeleteList}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-mono font-medium">{solvedCount}/{totalCount} <span className="text-muted-foreground">({pct}%)</span></span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {/* Filters */}
      <FilterBar
        companies={companies || []}
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
            {questions.map((q) => (
              <div
                key={q.id}
                id={`question-${q.id}`}
                className={highlightedId === q.id ? 'ring-2 ring-primary rounded-lg transition-all' : ''}
              >
                <QuestionCard
                  question={q}
                  bookmarkFolders={bookmarkFolders || []}
                  onUpdate={handleRefresh}
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
