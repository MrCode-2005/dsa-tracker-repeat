'use client'

import { useState, use } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getFullProblemDetails } from '@/lib/queries/questions'
import { getProfileClient } from '@/lib/queries/auth'
import { ExternalLink, Loader2, PlayCircle, FolderOpen, Bookmark, CalendarCheck, CheckCircle2, Circle, ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { updateQuestionNote, updateVideoUrls, resetToDefaultVideoUrls } from '@/lib/actions/questions'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface PageProps {
  params: Promise<{ questionId: string }>
}

export default function ProblemDetailsPage({ params }: PageProps) {
  const { questionId } = use(params)
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({})
  const [isSavingUrls, setIsSavingUrls] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfileClient,
    staleTime: 1000 * 60 * 5, // 5 mins
  })

  const { data: details, isLoading } = useQuery({
    queryKey: ['problem-details', questionId],
    queryFn: async () => {
      if (!questionId) return null
      const res = await getFullProblemDetails(questionId)
      if (res?.question.progress?.note) setNote(res.question.progress.note)
      if (res?.question.video_urls) setVideoUrls(res.question.video_urls)
      return res
    },
    enabled: !!questionId,
  })

  const handleSaveNote = async () => {
    if (!questionId) return
    setIsSavingNote(true)
    try {
      await updateQuestionNote(questionId, note)
      toast.success('Note saved!')
    } catch {
      toast.error('Failed to save note')
    } finally {
      setIsSavingNote(false)
    }
  }

  const handleSaveVideoUrls = async () => {
    if (!questionId) return
    setIsSavingUrls(true)
    try {
      const cleaned = Object.fromEntries(Object.entries(videoUrls).filter(([_, v]) => v.trim() !== ''))
      await updateVideoUrls(questionId, cleaned)
      toast.success('Video URLs saved!')
      queryClient.invalidateQueries({ queryKey: ['problem-details', questionId] })
    } catch {
      toast.error('Failed to save video URLs')
    } finally {
      setIsSavingUrls(false)
    }
  }

  const handleUrlChange = (channelName: string, url: string) => {
    setVideoUrls(prev => ({ ...prev, [channelName]: url }))
  }

  if (isLoading || !details) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mt-6 -mx-4 md:-mx-8 overflow-hidden bg-background">
      {/* Header */}
      <div className="px-6 md:px-8 py-6 border-b border-border bg-card/30 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full hover:bg-muted" onClick={() => {
            if (window.opener) {
              window.close()
            } else {
              window.history.back()
            }
          }}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {details.question.leetcode_number && (
            <span className="font-mono text-muted-foreground bg-muted px-2 py-1 rounded-md text-sm shrink-0">
              {details.question.leetcode_number}
            </span>
          )}
          <h1 className="text-xl md:text-3xl font-bold truncate max-w-lg">{details.question.title}</h1>
          <Badge variant="outline" className={
            details.question.difficulty === 'Easy' ? 'border-emerald-500/30 text-emerald-500 shrink-0' :
            details.question.difficulty === 'Medium' ? 'border-amber-500/30 text-amber-500 shrink-0' :
            'border-red-500/30 text-red-500 shrink-0'
          }>
            {details.question.difficulty}
          </Badge>
          <a
            href={details.question.slug ? `https://leetcode.com/problems/${details.question.slug}/` : '#'}
            target="_blank"
            rel="noreferrer"
            className="p-2 hover:bg-muted rounded-full transition-colors text-blue-400 hover:text-blue-300 shrink-0"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6 md:p-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-20">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-semibold">Personal Notes</h2>
                <Button size="sm" onClick={handleSaveNote} disabled={isSavingNote}>
                  {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'}
                </Button>
              </div>
              <Textarea 
                className="min-h-[250px] font-mono text-sm bg-background/50 resize-y"
                placeholder="Write your thoughts, approach, and edge cases here..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </section>

            <section className="bg-card/30 p-6 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <PlayCircle className="w-5 h-5" />
                    Custom Video Links
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">Override the default search links for specific channels.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" className="bg-red-500/20 text-red-500 hover:bg-red-500/30" onClick={async () => {
                    if (confirm('Are you sure you want to reset all video links to their original hardcoded defaults?')) {
                      if (questionId) {
                        try {
                          const defaultUrls = await resetToDefaultVideoUrls(questionId, details?.question.leetcode_number || null)
                          setVideoUrls(defaultUrls)
                          toast.success('Links reset to default!')
                          queryClient.invalidateQueries({ queryKey: ['problem-details', questionId] })
                        } catch {
                          toast.error('Failed to reset links')
                        }
                      }
                    }
                  }}>
                    Reset to Default
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleSaveVideoUrls} disabled={isSavingUrls}>
                    {isSavingUrls ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Links'}
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {(profile?.youtube_channels || [{ name: 'NeetCode' }, { name: 'Destination FAANG' }, { name: 'Greg Hogg' }]).map(channel => channel.name).concat(['default']).map(channel => (
                  <div key={channel} className="flex flex-col gap-1">
                    <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">{channel === 'default' ? 'General Fallback' : channel}</Label>
                    <Input 
                      placeholder={`https://youtube.com/...`}
                      value={videoUrls[channel] || ''}
                      onChange={(e) => handleUrlChange(channel, e.target.value)}
                      className="bg-background/50 h-9"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <section className="grid grid-cols-2 gap-4">
              <div className="bg-card/50 p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Times Solved</p>
                <p className="text-3xl font-mono">{details.question.progress?.times_solved || 0}</p>
              </div>
              <div className="bg-card/50 p-4 rounded-xl border border-border text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Status</p>
                <div className="flex justify-center mt-2">
                  {details.question.progress?.status === 'solved' ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20">Solved</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Unsolved</Badge>
                  )}
                </div>
              </div>
            </section>

            <section className="bg-card/30 p-5 rounded-xl border border-border">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <CalendarCheck className="w-5 h-5" />
                Revision Timeline
              </h2>
              
              {details.revisions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No revisions scheduled yet.</p>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-[11px] md:before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-border/30">
                  {details.revisions.map((rev) => {
                    const isCompleted = rev.completed
                    const isDue = !isCompleted && new Date(rev.scheduled_for) <= new Date()
                    
                    return (
                      <div key={rev.id} className="relative flex items-center gap-4 text-sm z-10">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center bg-background border ring-4 ring-background ${isCompleted ? 'border-emerald-500 text-emerald-500' : isDue ? 'border-red-500 text-red-500' : 'border-border text-muted-foreground'}`}>
                          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 flex justify-between items-center bg-background/50 p-2 rounded-lg border border-border/50">
                          <div>
                            <p className={`font-medium ${isCompleted ? 'text-emerald-400' : isDue ? 'text-red-400' : ''}`}>Day {rev.cycle_stage}</p>
                            {isCompleted && rev.completed_at && (
                              <p className="text-[10px] text-muted-foreground">Done: {new Date(rev.completed_at).toLocaleDateString()}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-xs">{new Date(rev.scheduled_for).toLocaleDateString()}</p>
                            {isDue && <p className="text-[10px] text-red-400 font-bold uppercase">Due</p>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="bg-card/30 p-5 rounded-xl border border-border">
                <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground uppercase tracking-wider">
                  <FolderOpen className="w-4 h-4" /> Present in Lists
                </h2>
                <div className="flex flex-wrap gap-2">
                  {details.lists.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : 
                    details.lists.map(l => (
                      <Badge key={l.id} variant="secondary" className="bg-secondary/50">{l.name}</Badge>
                    ))
                  }
                </div>
              </div>
              
              <div className="bg-card/30 p-5 rounded-xl border border-border">
                <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 text-muted-foreground uppercase tracking-wider">
                  <Bookmark className="w-4 h-4" /> Saved in Bookmarks
                </h2>
                <div className="flex flex-wrap gap-2">
                  {details.bookmarks.length === 0 ? <p className="text-xs text-muted-foreground">None</p> : 
                    details.bookmarks.map(b => (
                      <Badge key={b.id} variant="outline" className="border-border">
                        {b.emoji && <span className="mr-1">{b.emoji}</span>}{b.name}
                      </Badge>
                    ))
                  }
                </div>
              </div>
            </section>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
