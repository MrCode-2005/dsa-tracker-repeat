'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateQuestion } from '@/lib/actions/questions'
import { toast } from 'sonner'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { Question } from '@/lib/types/database'

interface EditQuestionDialogProps {
  question: Question
  onSuccess?: () => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditQuestionDialog({ question, onSuccess, open, onOpenChange }: EditQuestionDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: question.title,
    leetcode_number: question.leetcode_number?.toString() || '',
    slug: question.slug || '',
    topic: question.topic || '',
    difficulty: question.difficulty,
    youtube_url: question.youtube_url || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    setLoading(true)
    try {
      await updateQuestion(question.id, {
        title: formData.title,
        leetcode_number: formData.leetcode_number ? parseInt(formData.leetcode_number) : null,
        slug: formData.slug || null,
        topic: formData.topic || null,
        difficulty: formData.difficulty as 'Easy' | 'Medium' | 'Hard',
        youtube_url: formData.youtube_url || null,
      })
      
      toast.success('Question updated successfully!')
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update question')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card border-border">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
