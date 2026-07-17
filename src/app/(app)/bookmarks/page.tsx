'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, FolderPlus, Trash2, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { QuestionCard } from '@/components/question-card'
import { QuestionListSkeleton, ListCardSkeleton } from '@/components/loading-skeletons'
import { ErrorBoundary } from '@/components/error-boundary'
import { getBookmarkFolders, getBookmarkFolderQuestions } from '@/lib/queries/bookmarks'
import { createBookmarkFolder, deleteBookmarkFolder } from '@/lib/actions/questions'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { toast } from 'sonner'

export default function BookmarksPage() {
  const queryClient = useQueryClient()
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('📌')

  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ['bookmark-folders'],
    queryFn: getBookmarkFolders,
  })

  const { data: folderQuestions, isLoading: questionsLoading } = useQuery({
    queryKey: ['bookmark-questions', selectedFolder],
    queryFn: () => selectedFolder ? getBookmarkFolderQuestions(selectedFolder) : Promise.resolve([]),
    enabled: !!selectedFolder,
  })

  const selectedFolderData = folders?.find(f => f.id === selectedFolder)

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await createBookmarkFolder(newName.trim(), newEmoji)
      queryClient.invalidateQueries({ queryKey: ['bookmark-folders'] })
      setShowCreate(false)
      setNewName('')
      toast.success('Folder created!')
    } catch {
      toast.error('Failed to create folder')
    }
  }

  const handleDelete = async (folderId: string) => {
    try {
      await deleteBookmarkFolder(folderId)
      queryClient.invalidateQueries({ queryKey: ['bookmark-folders'] })
      if (selectedFolder === folderId) setSelectedFolder(null)
      toast.success('Folder deleted')
    } catch {
      toast.error('Failed to delete folder')
    }
  }

  return (
    <div className="space-y-8 animate-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedFolder && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedFolder(null)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {selectedFolder ? selectedFolderData?.name : 'Bookmarks'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {selectedFolder ? `${folderQuestions?.length || 0} bookmarked questions` : 'Organize your saved questions'}
            </p>
          </div>
        </div>
        {!selectedFolder && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <FolderPlus className="w-4 h-4 mr-1.5" /> New Folder
          </Button>
        )}
      </div>

      <ErrorBoundary>
        {!selectedFolder ? (
          // Folder grid
          foldersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => <ListCardSkeleton key={i} />)}
            </div>
          ) : folders && folders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map(f => (
                <Card
                  key={f.id}
                  className="bg-card/50 border-border glow-hover cursor-pointer hover:scale-[1.02] transition-all"
                  onClick={() => setSelectedFolder(f.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{f.emoji || '📌'}</span>
                        <div>
                          <p className="font-semibold">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{f.item_count} questions</p>
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ConfirmDialog
                          title="Delete folder?"
                          description="Bookmarks inside this folder will be removed. This cannot be undone."
                          confirmText="Delete"
                          variant="destructive"
                          onConfirm={() => handleDelete(f.id)}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </ConfirmDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-12 text-center">
                <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold mb-1">No bookmark folders yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create folders to organize questions you want to revisit</p>
                <Button onClick={() => setShowCreate(true)}>
                  <FolderPlus className="w-4 h-4 mr-1.5" /> Create Folder
                </Button>
              </CardContent>
            </Card>
          )
        ) : (
          // Folder questions
          questionsLoading ? (
            <QuestionListSkeleton count={5} />
          ) : folderQuestions && folderQuestions.length > 0 ? (
            <div className="space-y-2">
              {folderQuestions.map(q => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  bookmarkFolders={folders || []}
                  onUpdate={() => queryClient.invalidateQueries({ queryKey: ['bookmark-questions', selectedFolder] })}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-card/50 border-border">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-muted-foreground">No questions in this folder yet. Bookmark questions from any list!</p>
              </CardContent>
            </Card>
          )
        )}
      </ErrorBoundary>

      {/* Create folder dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle>New Bookmark Folder</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} className="w-16 text-center text-lg" maxLength={2} />
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Folder name" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={!newName.trim()}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
