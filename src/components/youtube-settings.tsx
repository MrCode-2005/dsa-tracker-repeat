'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CirclePlay, Plus, Trash2, GripVertical, Loader2 } from 'lucide-react'
import { updateProfile } from '@/lib/actions/auth'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

type YoutubeChannel = { name: string; color: string }

export function YoutubeSettings({ initialChannels }: { initialChannels: YoutubeChannel[] | null }) {
  const [channels, setChannels] = useState<YoutubeChannel[]>(
    initialChannels || [{ name: 'NeetCode', color: '#ef4444' }]
  )
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelColor, setNewChannelColor] = useState('#ef4444')
  const [isSaving, setIsSaving] = useState(false)
  const queryClient = useQueryClient()

  // Sync when profile data loads
  useEffect(() => {
    if (initialChannels) {
      setChannels(initialChannels)
    }
  }, [initialChannels])

  const handleAdd = () => {
    if (!newChannelName.trim()) return
    setChannels([...channels, { name: newChannelName.trim(), color: newChannelColor }])
    setNewChannelName('')
  }

  const handleRemove = (index: number) => {
    setChannels(channels.filter((_, i) => i !== index))
  }

  const moveChannel = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newArr = [...channels]
      const temp = newArr[index - 1]
      newArr[index - 1] = newArr[index]
      newArr[index] = temp
      setChannels(newArr)
    } else if (direction === 'down' && index < channels.length - 1) {
      const newArr = [...channels]
      const temp = newArr[index + 1]
      newArr[index + 1] = newArr[index]
      newArr[index] = temp
      setChannels(newArr)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateProfile({ youtube_channels: channels })
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('YouTube preferences saved')
    } catch {
      toast.error('Failed to save YouTube preferences')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <CirclePlay className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="font-semibold">YouTube Channels</h2>
              <p className="text-xs text-muted-foreground">Manage video solution providers</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Channels
          </Button>
        </div>

        <div className="space-y-4">
          {/* Add new channel */}
          <div className="flex items-end gap-3 p-3 border border-border/50 rounded-lg bg-background/50">
            <div className="flex-1">
              <Label className="text-xs">Channel Name</Label>
              <Input
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g. NeetCodeIO"
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Icon Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={newChannelColor}
                  onChange={(e) => setNewChannelColor(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-md"
                />
              </div>
            </div>
            <Button onClick={handleAdd} size="sm" className="h-9">
              <Plus className="w-4 h-4 mr-1.5" /> Add
            </Button>
          </div>

          {/* List of channels */}
          <div className="space-y-2">
            {channels.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                No channels added. A default NeetCode button will be shown.
              </p>
            )}
            {channels.map((channel, i) => (
              <div key={i} className="flex items-center gap-3 p-2 px-3 border border-border rounded-lg bg-card group">
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveChannel(i, 'up')}
                    disabled={i === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                  >
                    <GripVertical className="w-4 h-4 rotate-90" />
                  </button>
                  <button
                    onClick={() => moveChannel(i, 'down')}
                    disabled={i === channels.length - 1}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                  >
                    <GripVertical className="w-4 h-4 rotate-90" />
                  </button>
                </div>
                
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${channel.color}20` }}>
                  <CirclePlay className="w-3.5 h-3.5" style={{ color: channel.color }} />
                </div>
                <span className="flex-1 text-sm font-medium">{channel.name}</span>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemove(i)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
