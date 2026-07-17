'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2, RotateCcw, AlertCircle } from 'lucide-react'
import {
  removeProblemFromRevisions,
  resetProblemRevisionCount,
  unsolveProblem,
} from '@/lib/actions/settings'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/confirm-dialog'

export type ManagedQuestion = {
  id: string
  title: string
  difficulty: string
  revisionsCount: number
  hasActiveRevision: boolean
  timesSolved: number
}

interface ManageDataDialogProps {
  isOpen: boolean
  onClose: () => void
  fetchData: () => Promise<ManagedQuestion[]>
}

export function ManageDataDialog({ isOpen, onClose, fetchData }: ManageDataDialogProps) {
  const [data, setData] = useState<ManagedQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const result = await fetchData()
      setData(result)
    } catch (e) {
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async (id: string, action: () => Promise<void>, successMsg: string) => {
    setProcessingId(id)
    try {
      await action()
      toast.success(successMsg)
      await loadData() // refresh the list
    } catch {
      toast.error('Failed to perform action')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Data & History</DialogTitle>
          <DialogDescription>
            Individually remove problems from your revision schedule, reset their revision count, or mark them as unsolved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 opacity-20" />
              <p>No revision data found.</p>
            </div>
          ) : (
            data.map((q) => (
              <div
                key={q.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-border/50 bg-background/50"
              >
                <div>
                  <h4 className="font-medium text-sm">{q.title}</h4>
                  <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                    <span className={cn(
                      q.difficulty === 'Easy' ? 'text-emerald-400' :
                      q.difficulty === 'Medium' ? 'text-amber-400' : 'text-red-400'
                    )}>
                      {q.difficulty}
                    </span>
                    <span>•</span>
                    <span>{q.revisionsCount} revision(s) logged</span>
                    {q.timesSolved > 1 && (
                      <>
                        <span>•</span>
                        <span className="text-violet-400 font-medium">Count: {q.timesSolved - 1}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {q.revisionsCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      disabled={processingId === q.id}
                      onClick={() => handleAction(q.id, () => removeProblemFromRevisions(q.id), 'Removed from revisions')}
                      title="Delete all revision schedule entries for this problem"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Clear Revisions
                    </Button>
                  )}
                  {q.timesSolved > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-background/50 hover:bg-violet-500/10 hover:text-violet-400 hover:border-violet-500/30"
                      disabled={processingId === q.id}
                      onClick={() => handleAction(q.id, () => resetProblemRevisionCount(q.id), 'Revision count reset')}
                      title="Reset revision count back to 0 (Keep as Solved)"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Reset Count
                    </Button>
                  )}
                  <ConfirmDialog
                    title="Unsolve problem?"
                    description="Are you sure you want to completely mark this as unsolved? All history will be lost."
                    confirmText="Unsolve"
                    variant="destructive"
                    onConfirm={() => handleAction(q.id, () => unsolveProblem(q.id), 'Marked as unsolved')}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-background/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      disabled={processingId === q.id}
                    >
                      Unsolve
                    </Button>
                  </ConfirmDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
