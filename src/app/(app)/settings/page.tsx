'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Code2, LogOut, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { updateProfile, signOut } from '@/lib/actions/auth'
import { clearAllRevisions, clearAllTestData, getManagedData } from '@/lib/actions/settings'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'
import { toast } from 'sonner'
import { ManageDataDialog } from '@/components/manage-data-dialog'
import { YoutubeSettings } from '@/components/youtube-settings'

const profileSchema = z.object({
  display_name: z.string().min(1, 'Name is required'),
  leetcode_username: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [isManageDataOpen, setIsManageDataOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email || '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single() as { data: Profile | null }
      if (data) {
        setProfile(data)
        reset({
          display_name: data.display_name || '',
          leetcode_username: data.leetcode_username || '',
        })
      }
    }
    fetchProfile()
  }, [reset])

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true)
    try {
      await updateProfile({
        display_name: data.display_name,
        leetcode_username: data.leetcode_username || undefined,
      })
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in-up max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Profile</h2>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input id="display_name" {...register('display_name')} className="mt-1.5" />
              {errors.display_name && <p className="text-xs text-destructive mt-1">{errors.display_name.message}</p>}
            </div>

            <div>
              <Label htmlFor="leetcode_username">LeetCode Username</Label>
              <div className="relative mt-1.5">
                <Code2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="leetcode_username" {...register('leetcode_username')} className="pl-9" placeholder="your-username" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Used for profile display only. LeetCode sync uses the in-app Done checkbox as source of truth.</p>
            </div>

            <Button type="submit" disabled={isLoading || !isDirty}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account stats */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-4">Account Stats</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current Streak</p>
              <p className="font-mono font-bold text-lg">{profile?.current_streak || 0} days</p>
            </div>
            <div>
              <p className="text-muted-foreground">Highest Streak</p>
              <p className="font-mono font-bold text-lg">{profile?.highest_streak || 0} days</p>
            </div>
            <div>
              <p className="text-muted-foreground">Member Since</p>
              <p className="font-mono">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Active</p>
              <p className="font-mono">{profile?.last_activity_date || 'Never'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <YoutubeSettings initialChannels={profile?.youtube_channels || null} />



      {/* Extension Sync */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-2 flex items-center gap-2">
            LeetCode Auto-Sync Extension
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connect the Repeat Chrome Extension to automatically mark problems as done when you get an "Accepted" verdict on LeetCode.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg font-mono text-xs break-all border border-border flex items-center justify-between">
            <span>{profile?.id || 'Loading your ID...'}</span>
            {profile?.id && (
              <Button variant="ghost" size="sm" onClick={() => {
                navigator.clipboard.writeText(profile.id);
                toast.success('User ID copied to clipboard');
              }}>
                Copy ID
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Paste this User ID into the Chrome Extension popup to securely link your account.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Data & History Management */}
      <Card className="bg-card/50 border-border">
        <CardContent className="p-6">
          <h2 className="font-semibold mb-2">Data & History Management</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Manage your revision schedules, clear test data, or reset specific problem statistics.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setIsManageDataOpen(true)}
            >
              Manage Specific Problems
            </Button>
            <ConfirmDialog
              title="Clear All Revisions"
              description="Are you sure you want to wipe all your scheduled revisions? Solved problems will be kept."
              confirmText="Wipe Revisions"
              variant="destructive"
              onConfirm={async () => {
                try {
                  await clearAllRevisions()
                  toast.success('All revisions cleared')
                } catch {
                  toast.error('Failed to clear revisions')
                }
              }}
            >
              <Button
                variant="destructive"
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Clear All Revisions
              </Button>
            </ConfirmDialog>
            <ConfirmDialog
              title="Wipe All Data"
              description="Are you absolutely sure? This will wipe ALL your history, including solved problems, revisions, and calendar activity. This CANNOT be undone."
              confirmText="Wipe Everything"
              variant="destructive"
              onConfirm={async () => {
                try {
                  await clearAllTestData()
                  toast.success('All data wiped completely')
                } catch {
                  toast.error('Failed to wipe data')
                }
              }}
            >
              <Button
                variant="destructive"
                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Clear Test Data
              </Button>
            </ConfirmDialog>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger zone */}
      <Card className="bg-card/50 border-destructive/20">
        <CardContent className="p-6">
          <h2 className="font-semibold text-destructive mb-2">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Sign out of your account. Your data will be preserved.
          </p>
          <Button variant="destructive" size="sm" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
          </Button>
        </CardContent>
      </Card>

      <ManageDataDialog
        isOpen={isManageDataOpen}
        onClose={() => setIsManageDataOpen(false)}
        fetchData={getManagedData}
      />
    </div>
  )
}
