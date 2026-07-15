'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ExternalLink, CirclePlay, StickyNote, Bookmark, Check, Star, RotateCcw, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { EditQuestionDialog } from '@/components/edit-question-dialog'
import { toggleQuestionSolved, updateQuestionNote, toggleBookmarkInFolder, createBookmarkFolder, scheduleQuestionRevision, cancelQuestionRevision, removeQuestionFromList } from '@/lib/actions/questions'
import { Input } from '@/components/ui/input'
import type { QuestionWithProgress, BookmarkFolder } from '@/lib/types/database'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { getProfileClient } from '@/lib/queries/auth'

interface QuestionCardProps {
  question: QuestionWithProgress
  listId?: string
  bookmarkFolders?: BookmarkFolder[]
  questionFolderIds?: string[]
  onUpdate?: () => void
  index?: number
}

export function QuestionCard({ question, listId, bookmarkFolders = [], questionFolderIds = [], onUpdate, index }: QuestionCardProps) {
  const [isSolved, setIsSolved] = useState(question.progress?.status === 'solved')
  const [animateSolve, setAnimateSolve] = useState(false)
  const [noteText, setNoteText] = useState(question.progress?.note || '')
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [isSavingRevision, setIsSavingRevision] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfileClient,
    staleTime: 1000 * 60 * 5, // 5 mins
  })

  const youtubeChannels = profile?.youtube_channels || [{ name: 'NeetCode', color: '#ef4444' }]


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

  const hasRevisionScheduled = (question.revision_count?.total || 0) > 0

  const handleSaveToRevision = useCallback(async () => {
    setIsSavingRevision(true)
    try {
      if (hasRevisionScheduled) {
        await cancelQuestionRevision(question.id)
        toast.success('Removed from revision schedule')
      } else {
        await scheduleQuestionRevision(question.id)
        toast.success('Saved to revision schedule! ⭐')
      }
      onUpdate?.()
    } catch {
      toast.error(hasRevisionScheduled ? 'Failed to remove from revision' : 'Failed to save to revision')
    } finally {
      setIsSavingRevision(false)
    }
  }, [question.id, hasRevisionScheduled, onUpdate])

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

  const handleRemoveFromList = useCallback(async () => {
    if (!listId) return
    if (!confirm('Remove this question from the list?')) return
    try {
      await removeQuestionFromList(listId, question.id)
      toast.success('Question removed')
      onUpdate?.()
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove')
    }
  }, [listId, question.id, onUpdate])

  return (
    <>
    <div className="group grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_36px_36px_36px_84px_36px_80px_36px] gap-3 md:gap-4 items-center px-4 py-3 rounded-lg border border-border bg-card/50 glow-hover transition-all duration-200 hover:bg-card/80">
      
      {/* 1. Problem Column */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Row index number */}
        {index !== undefined && (
          <span className="flex-shrink-0 font-mono text-xs text-muted-foreground/50 w-5 text-right select-none">
            {index}.
          </span>
        )}
        {/* LeetCode question number */}
        {question.leetcode_number && (
          <span className="flex-shrink-0 font-mono text-xs font-semibold text-muted-foreground/60">
            {question.leetcode_number}
          </span>
        )}
        {/* Title */}
        <span className={cn(
          'text-sm font-medium truncate',
          isSolved && 'text-muted-foreground line-through decoration-muted-foreground/30'
        )}>
          {question.title}
        </span>
        {/* Topic badge */}
        {question.topic && (
          <span className="hidden lg:inline-flex text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md truncate max-w-32 flex-shrink-0">
            {question.topic}
          </span>
        )}
      </div>

      {/* Action Columns - Desktop Grid / Mobile Flex */}
      <div className="flex items-center gap-2 md:contents">
        
        {/* 2. Video */}
        <div className="flex flex-wrap items-center justify-center gap-1">
          {youtubeChannels.map((channel, i) => {
            const isFirstChannel = i === 0;
            const videoHref = (isFirstChannel && question.youtube_url) 
              ? question.youtube_url 
              : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${question.title} leetcode solution ${channel.name}`)}`;

            return (
              <Tooltip key={i}>
                <TooltipTrigger
                  render={
                    <a
                      href={videoHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Watch ${channel.name} solution`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg transition-colors"
                      style={{ 
                        color: channel.color,
                        '--hover-bg': `${channel.color}20`
                      } as React.CSSProperties}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${channel.color}20` }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    />
                  }
                >
                  <CirclePlay className="w-[18px] h-[18px]" />
                </TooltipTrigger>
                <TooltipContent>{channel.name}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* 3. Code (LeetCode) */}
        <div className="flex justify-center">
          <Tooltip>
            <TooltipTrigger
              render={
                <a
                  href={question.slug ? `https://leetcode.com/problems/${question.slug}/` : `https://leetcode.com/problems/${question.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Solve ${question.title} on LeetCode`}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 transition-colors"
                />
              }
            >
              <ExternalLink className="w-[18px] h-[18px]" />
            </TooltipTrigger>
            <TooltipContent>Open on LeetCode</TooltipContent>
          </Tooltip>
        </div>

        {/* 4. Notes */}
        <div className="flex justify-center">
          <Popover>
            <Tooltip>
              <TooltipTrigger
                render={
                  <PopoverTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn('h-8 w-8 rounded-lg', noteText ? 'text-primary' : 'text-muted-foreground/50 hover:text-muted-foreground')}
                        aria-label="Add note"
                      >
                        <StickyNote className="w-[18px] h-[18px]" />
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
        </div>

        {/* 5. Bookmark */}
        <div className="flex justify-center">
          <Popover>
            <Tooltip>
              <TooltipTrigger
                render={
                  <PopoverTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn('h-8 w-8 rounded-lg', questionFolderIds.length > 0 ? 'text-primary' : 'text-muted-foreground/50 hover:text-muted-foreground')}
                        aria-label="Bookmark"
                      >
                        <Bookmark className={cn('w-[18px] h-[18px]', questionFolderIds.length > 0 && 'fill-current')} />
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

        {/* 6. Review (Spaced Repetition) */}
        <div className="flex items-center justify-center gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8 rounded-lg transition-colors',
                    hasRevisionScheduled
                      ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-400/10'
                      : 'text-muted-foreground/50 hover:text-violet-400 hover:bg-violet-400/10'
                  )}
                  onClick={handleSaveToRevision}
                  disabled={isSavingRevision}
                  aria-label="Save to revision schedule"
                >
                  <Star className={cn('w-[18px] h-[18px]', hasRevisionScheduled && 'fill-current')} />
                </Button>
              }
            />
            <TooltipContent>{hasRevisionScheduled ? 'Remove from revision' : 'Save to revision'}</TooltipContent>
          </Tooltip>

          {question.current_revision && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                    onClick={async () => {
                      try {
                        const { markRevisionComplete } = await import('@/lib/actions/questions')
                        await markRevisionComplete(question.current_revision!.id, question.id)
                        onUpdate?.()
                        toast.success('Revision completed! 💪')
                      } catch {
                        toast.error('Failed to mark revision')
                      }
                    }}
                    aria-label="Mark revision complete"
                  >
                    <RotateCcw className="w-[18px] h-[18px]" />
                  </Button>
                }
              />
              <TooltipContent>
                Revision due (Day {question.current_revision.cycle_stage})
              </TooltipContent>
            </Tooltip>
          )}

          {question.progress && question.progress.times_solved > 1 && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-violet-500/10 border border-violet-500/20">
                    <span className="text-[10px] font-bold text-violet-400">
                      {question.progress.times_solved - 1}
                    </span>
                  </div>
                }
              />
              <TooltipContent>Revised {question.progress.times_solved - 1} time{question.progress.times_solved - 1 !== 1 ? 's' : ''}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* 7. Done */}
        <div className={cn('flex justify-center', animateSolve && 'solve-animation')}>
          <Checkbox
            checked={isSolved}
            onCheckedChange={handleToggleSolved}
            className={cn(
              'w-[22px] h-[22px] rounded-md transition-colors data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 data-[state=checked]:text-white',
              !isSolved && 'border-muted-foreground/50'
            )}
            aria-label={`Mark ${question.title} as ${isSolved ? 'unsolved' : 'solved'}`}
          />
        </div>

        {/* 8. Difficulty */}
        <div className="flex justify-end md:justify-center">
          <Badge variant="outline" className={cn('text-[11px] px-2 py-0.5 font-medium', difficultyClass)}>
            {question.difficulty}
          </Badge>
        </div>

        {/* 9. More Options */}
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" />}>
              <MoreHorizontal className="w-[18px] h-[18px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="cursor-pointer">
                <Pencil className="w-4 h-4 mr-2" />
                Edit Question
              </DropdownMenuItem>
              {listId && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer" onClick={handleRemoveFromList}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove from List
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </div>
    
    <EditQuestionDialog 
      open={isEditOpen}
      onOpenChange={setIsEditOpen}
      question={question as any}
      onSuccess={onUpdate}
    />
    </>
  )
}
