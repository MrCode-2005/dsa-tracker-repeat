'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ExternalLink, CirclePlay, StickyNote, Bookmark, RotateCcw, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { toggleQuestionSolved, markRevisionComplete, updateQuestionNote, toggleBookmarkInFolder, createBookmarkFolder } from '@/lib/actions/questions'
import { Input } from '@/components/ui/input'
import type { QuestionWithProgress, BookmarkFolder } from '@/lib/types/database'
import { toast } from 'sonner'

interface QuestionCardProps {
  question: QuestionWithProgress
  bookmarkFolders?: BookmarkFolder[]
  questionFolderIds?: string[]
  onUpdate?: () => void
}

export function QuestionCard({ question, bookmarkFolders = [], questionFolderIds = [], onUpdate }: QuestionCardProps) {
  const [isSolved, setIsSolved] = useState(question.progress?.status === 'solved')
  const [animateSolve, setAnimateSolve] = useState(false)
  const [noteText, setNoteText] = useState(question.progress?.note || '')
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const difficultyClass = question.difficulty === 'Easy'
    ? 'badge-easy'
    : question.difficulty === 'Medium'
      ? 'badge-medium'
      : 'badge-hard'

  const handleToggleSolved = useCallback(async () => {
    const newState = !isSolved
    setIsSolved(newState)
    if (newState) {
      setAnimateSolve(true)
      setTimeout(() => setAnimateSolve(false), 400)
    }
    try {
      await toggleQuestionSolved(question.id)
      onUpdate?.()
      if (newState) toast.success('Question marked as solved! 🎉')
    } catch {
      setIsSolved(!newState)
      toast.error('Failed to update status')
    }
  }, [isSolved, question.id, onUpdate])

  const handleRevision = useCallback(async () => {
    if (!question.current_revision) return
    try {
      await markRevisionComplete(question.current_revision.id, question.id)
      onUpdate?.()
      toast.success('Revision completed! 💪')
    } catch {
      toast.error('Failed to mark revision')
    }
  }, [question.current_revision, question.id, onUpdate])

  const handleNoteChange = useCallback((value: string) => {
    setNoteText(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        await updateQuestionNote(question.id, value)
      } catch {
        toast.error('Failed to save note')
      }
    }, 800)
  }, [question.id])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleToggleBookmark = useCallback(async (folderId: string) => {
    try {
      await toggleBookmarkInFolder(question.id, folderId)
      onUpdate?.()
    } catch {
      toast.error('Failed to toggle bookmark')
    }
  }, [question.id, onUpdate])

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) return
    setIsCreatingFolder(true)
    try {
      const folder = await createBookmarkFolder(newFolderName.trim())
      await toggleBookmarkInFolder(question.id, folder.id)
      setNewFolderName('')
      onUpdate?.()
      toast.success('Folder created & question bookmarked')
    } catch {
      toast.error('Failed to create folder')
    } finally {
      setIsCreatingFolder(false)
    }
  }, [newFolderName, question.id, onUpdate])

  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card/50 glow-hover transition-all duration-200 hover:bg-card/80">
      {/* Done checkbox */}
      <div className={cn('flex-shrink-0', animateSolve && 'solve-animation')}>
        <Checkbox
          checked={isSolved}
          onCheckedChange={handleToggleSolved}
          className={cn(
            'w-5 h-5 rounded-full transition-colors',
            isSolved && 'bg-emerald-500 border-emerald-500 text-white'
          )}
          aria-label={`Mark ${question.title} as ${isSolved ? 'unsolved' : 'solved'}`}
        />
      </div>

      {/* Question number */}
      {question.leetcode_number && (
        <span className="flex-shrink-0 font-mono text-sm text-muted-foreground w-10 text-right">
          {question.leetcode_number}
        </span>
      )}

      {/* Title */}
      <span className={cn(
        'flex-1 text-sm font-medium truncate',
        isSolved && 'text-muted-foreground line-through decoration-muted-foreground/30'
      )}>
        {question.title}
      </span>

      {/* Topic badge */}
      {question.topic && (
        <span className="hidden lg:inline-flex text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md truncate max-w-32">
          {question.topic}
        </span>
      )}

      {/* Difficulty badge */}
      <Badge variant="outline" className={cn('flex-shrink-0 text-xs font-medium', difficultyClass)}>
        {question.difficulty}
      </Badge>

      {/* Revision count */}
      {question.revision_count.total > 0 && (
        <span className="hidden sm:inline-flex text-xs font-mono text-muted-foreground">
          {question.revision_count.completed}/{question.revision_count.total}
        </span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
        {/* Revision button */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7',
                  question.current_revision
                    ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10'
                    : 'text-muted-foreground/40 cursor-not-allowed'
                )}
                onClick={handleRevision}
                disabled={!question.current_revision}
                aria-label="Mark revision complete"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            }
          />
          <TooltipContent>
            {question.current_revision
              ? `Revision due (Day ${question.current_revision.cycle_stage})`
              : 'No revision due'}
          </TooltipContent>
        </Tooltip>

        {/* Solve button */}
        {question.slug && (
          <Tooltip>
            <TooltipTrigger
              render={
                <a
                  href={`https://leetcode.com/problems/${question.slug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Solve ${question.title} on LeetCode`}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                />
              }
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </TooltipTrigger>
            <TooltipContent>Open on LeetCode</TooltipContent>
          </Tooltip>
        )}

        {/* YouTube button */}
        {question.youtube_url && (
          <Tooltip>
            <TooltipTrigger
              render={
                <a
                  href={question.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Watch solution video"
                  className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-red-400 hover:text-red-300 hover:bg-muted transition-colors"
                />
              }
            >
              <CirclePlay className="w-3.5 h-3.5" />
            </TooltipTrigger>
            <TooltipContent>Watch video solution</TooltipContent>
          </Tooltip>
        )}

        {/* Note button */}
        <Popover>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-7 w-7', noteText ? 'text-primary' : 'text-muted-foreground')}
                      aria-label="Add note"
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>{noteText ? 'View note' : 'Add note'}</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-80 bg-popover border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Add your notes here..."
                value={noteText}
                onChange={(e) => handleNoteChange(e.target.value)}
                className="min-h-24 bg-background/50 text-sm"
              />
              <p className="text-xs text-muted-foreground">Auto-saved after you stop typing</p>
            </div>
          </PopoverContent>
        </Popover>

        {/* Bookmark button */}
        <Popover>
          <Tooltip>
            <TooltipTrigger
              render={
                <PopoverTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-7 w-7', questionFolderIds.length > 0 ? 'text-primary' : 'text-muted-foreground')}
                      aria-label="Bookmark"
                    >
                      <Bookmark className={cn('w-3.5 h-3.5', questionFolderIds.length > 0 && 'fill-current')} />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>Bookmark</TooltipContent>
          </Tooltip>
          <PopoverContent className="w-64 bg-popover border-border">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bookmark Folders</label>
              {bookmarkFolders.length === 0 && (
                <p className="text-xs text-muted-foreground">No folders yet</p>
              )}
              {bookmarkFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleToggleBookmark(folder.id)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors text-left"
                >
                  <span>{folder.emoji || '📌'}</span>
                  <span className="flex-1 truncate">{folder.name}</span>
                  {questionFolderIds.includes(folder.id) && (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  )}
                </button>
              ))}
              <div className="pt-2 border-t border-border flex gap-2">
                <Input
                  placeholder="New folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleCreateFolder}
                  disabled={isCreatingFolder || !newFolderName.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
