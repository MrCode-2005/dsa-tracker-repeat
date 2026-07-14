'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createQuestionAndAddToList } from '@/lib/actions/questions'
import { toast } from 'sonner'

interface AddQuestionDialogProps {
  listId: string
  onSuccess: () => void
}

export function AddQuestionDialog({ listId, onSuccess }: AddQuestionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    leetcode_number: '',
    slug: '',
    topic: '',
    difficulty: 'Easy',
    youtube_url: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    setLoading(true)
    try {
      await createQuestionAndAddToList(listId, {
        title: formData.title,
        leetcode_number: formData.leetcode_number ? parseInt(formData.leetcode_number) : undefined,
        slug: formData.slug || undefined,
        topic: formData.topic || undefined,
        difficulty: formData.difficulty as 'Easy' | 'Medium' | 'Hard',
        youtube_url: formData.youtube_url || undefined,
      })
      
      toast.success('Question added successfully!')
      setOpen(false)
      setFormData({
        title: '',
        leetcode_number: '',
        slug: '',
        topic: '',
        difficulty: 'Easy',
        youtube_url: '',
      })
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add question')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Question</Button>} />
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Add Custom Question</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g. Two Sum"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="bg-background/50 border-border"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(v) => setFormData({ ...formData, difficulty: v ?? 'Easy' })}
              >
                <SelectTrigger className="bg-background/50 border-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="e.g. Arrays"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="bg-background/50 border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leetcode_number">Number (Optional)</Label>
              <Input
                id="leetcode_number"
                type="number"
                placeholder="e.g. 1"
                value={formData.leetcode_number}
                onChange={(e) => setFormData({ ...formData, leetcode_number: e.target.value })}
                className="bg-background/50 border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug / Link (Optional)</Label>
              <Input
                id="slug"
                placeholder="e.g. two-sum"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="bg-background/50 border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="youtube_url">YouTube URL (Optional)</Label>
            <Input
              id="youtube_url"
              placeholder="https://youtube.com/watch?v=..."
              value={formData.youtube_url}
              onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              className="bg-background/50 border-border"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Question'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
