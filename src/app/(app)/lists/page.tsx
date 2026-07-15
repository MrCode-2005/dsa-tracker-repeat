'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Upload, Sparkles, List as ListIcon } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImportWizard } from '@/components/import-wizard'
import { ListCardSkeleton } from '@/components/loading-skeletons'
import { ErrorBoundary } from '@/components/error-boundary'
import { getUserLists } from '@/lib/queries/lists'
import { createList, adoptPresetList } from '@/lib/actions/lists'
import { toast } from 'sonner'

export default function ListsPage() {
  const queryClient = useQueryClient()
  const [showImport, setShowImport] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showAdopt, setShowAdopt] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [isAdopting, setIsAdopting] = useState<string | null>(null)

  const { data: lists, isLoading } = useQuery({
    queryKey: ['user-lists'],
    queryFn: getUserLists,
  })

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await createList(newName.trim(), newDesc.trim() || undefined)
      queryClient.invalidateQueries({ queryKey: ['user-lists'] })
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      toast.success('List created!')
    } catch {
      toast.error('Failed to create list')
    }
  }

  const handleAdopt = async (preset: 'NEETCODE_150' | 'BLIND_75') => {
    setIsAdopting(preset)
    try {
      await adoptPresetList(preset)
      queryClient.invalidateQueries({ queryKey: ['user-lists'] })
      setShowAdopt(false)
      toast.success(`${preset === 'NEETCODE_150' ? 'NeetCode 150' : 'Blind 75'} adopted!`)
    } catch {
      toast.error('Failed to adopt preset')
    } finally {
      setIsAdopting(null)
    }
  }

  return (
    <div className="space-y-8 animate-in-up">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Lists</h1>
          <p className="text-muted-foreground mt-1">Organize your DSA practice</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAdopt(true)}>
            <Sparkles className="w-4 h-4 mr-1.5" /> Adopt Preset
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="w-4 h-4 mr-1.5" /> Import
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New List
          </Button>
        </div>
      </div>

      <ErrorBoundary>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <ListCardSkeleton key={i} />)}
          </div>
        ) : lists && lists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list) => {
              const pct = list.total_count > 0 ? Math.round((list.solved_count / list.total_count) * 100) : 0
              return (
                <Link key={list.id} href={`/lists/${list.id}`} className="group">
                  <Card className="bg-card/50 border-border glow-hover h-full transition-all duration-200 hover:scale-[1.02]">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${list.color || '#8B5CF6'}20` }}
                        >
                          <ListIcon className="w-5 h-5" style={{ color: list.color || '#8B5CF6' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{list.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {list.description || `${list.source_type} list`}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Progress value={pct} className="h-1.5" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span className="font-mono">{list.solved_count}/{list.total_count}</span>
                          <span>{pct}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          <Card className="bg-card/50 border-border">
            <CardContent className="p-12 text-center">
              <ListIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-semibold mb-1">No lists yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get started by adopting a preset list or importing your spreadsheet
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setShowAdopt(true)}>
                  <Sparkles className="w-4 h-4 mr-1.5" /> Adopt Preset
                </Button>
                <Button onClick={() => setShowImport(true)}>
                  <Upload className="w-4 h-4 mr-1.5" /> Import CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </ErrorBoundary>

      {/* Adopt Preset Dialog */}
      <Dialog open={showAdopt} onOpenChange={setShowAdopt}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Adopt a Preset List</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <button
              onClick={() => handleAdopt('NEETCODE_150')}
              disabled={isAdopting !== null}
              className="w-full p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <span className="text-lg">🚀</span>
                </div>
                <div>
                  <p className="font-semibold">NeetCode 150</p>
                  <p className="text-xs text-muted-foreground">150 essential coding interview questions</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleAdopt('BLIND_75')}
              disabled={isAdopting !== null}
              className="w-full p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <span className="text-lg">⚡</span>
                </div>
                <div>
                  <p className="font-semibold">Blind 75</p>
                  <p className="text-xs text-muted-foreground">The original 75 must-do LeetCode questions</p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create List Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Sem 5 DSA List" className="mt-1.5" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What's this list for?" className="mt-1.5" />
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={!newName.trim()}>Create List</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Wizard */}
      <ImportWizard
        open={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['user-lists'] })}
      />
    </div>
  )
}
