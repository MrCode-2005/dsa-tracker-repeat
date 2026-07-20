'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { updateNotificationSettings, updateUserTimezone } from '@/lib/actions/telegram'

const HOURS = Array.from({ length: 24 }).map((_, i) => {
  const hour = i.toString().padStart(2, '0')
  return `${hour}:00`
})

const DEFAULT_SETTINGS = {
  revisionReminder: { enabled: true, time: "20:00", message: "📚 <b>Revisions Due: {{count}}</b>\nYou have {{count}} spaced repetition problem(s) scheduled for today. Don't let them pile up!" },
  tomorrowPreview: { enabled: false, time: "20:00", message: "🔮 <b>Tomorrow's Preview</b>\nYou have {{count}} revision(s) scheduled for tomorrow." },
  streakAlert: { enabled: true, time: "20:00", message: "🔥 <b>Streak at Risk!</b>\nYou have a {{streak}}-day streak going, but you haven't solved any problems today. Jump in and keep the fire alive!" },
  inactivityWarning: { enabled: true, time: "20:00", daysThreshold: 2, message: "⚠️ <b>Inactivity Warning</b>\nYou haven't solved any problems for {{days}} days! Log in now or your LeetCode streak will get ruined!" },
  report: { enabled: false, time: "10:00", frequency: "weekly", message: "📊 <b>{{frequency}} Report</b>\nSolves: {{solves}}\nRevisions Done: {{revisionsDone}}\nPending Dues: {{dues}}" },
  overdueReminder: { enabled: true, time: "12:00", message: "⏰ <b>Overdue Revisions</b>\nYou have {{count}} missed revision(s) from past days. Complete them ASAP!" }
}

export function NotificationSettingsForm({ initialSettings, isConnected }: { initialSettings: any, isConnected: boolean }) {
  const [settings, setSettings] = useState(initialSettings || DEFAULT_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)

  useEffect(() => {
    // Automatically save timezone on mount if they are connected
    if (isConnected) {
      updateUserTimezone(timezone).catch(console.error)
    }
  }, [isConnected, timezone])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateNotificationSettings(settings)
      await updateUserTimezone(timezone)
      toast.success('Notification settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSection = (section: string, key: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }

  const Section = ({ 
    id, title, description, hideToggle = false, extraSettings 
  }: { 
    id: string, title: string, description: string, hideToggle?: boolean, extraSettings?: React.ReactNode 
  }) => (
    <div className="space-y-4 pt-6 border-t border-border first:pt-0 first:border-0">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-base">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {!hideToggle && (
          <Switch 
            checked={settings[id]?.enabled ?? true}
            onCheckedChange={(c) => updateSection(id, 'enabled', c)}
            disabled={!isConnected}
          />
        )}
      </div>

      {(settings[id]?.enabled !== false || hideToggle) && (
        <div className="grid gap-4 pl-4 border-l-2 border-border/50 ml-1 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Delivery Time (Local)</Label>
              <Select 
                value={settings[id]?.time || "20:00"} 
                onValueChange={(v) => updateSection(id, 'time', v)}
                disabled={!isConnected}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {extraSettings}
          </div>
          
          <div className="space-y-2">
            <Label>Custom Message Template</Label>
            <Textarea 
              value={settings[id]?.message || ""} 
              onChange={(e) => updateSection(id, 'message', e.target.value)}
              className="font-mono text-xs h-24"
              disabled={!isConnected}
            />
            <p className="text-[10px] text-muted-foreground">
              Supports HTML tags like &lt;b&gt;, &lt;i&gt;, and &lt;code&gt;. Use placeholders like {'{{count}}'}.
            </p>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Card className="bg-card/50 border-border relative overflow-hidden">
      {!isConnected && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="bg-card border border-border p-4 rounded-lg shadow-lg text-center max-w-sm">
            <p className="font-medium mb-1">Telegram Not Connected</p>
            <p className="text-sm text-muted-foreground">Please connect your Telegram account above to customize these alerts.</p>
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle>Alert Preferences</CardTitle>
        <CardDescription>Customize exactly what alerts you want and when.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <Section 
          id="revisionReminder" 
          title="Daily Revision Reminder" 
          description="Reminds you about the problems you have scheduled to revise today."
        />

        <Section 
          id="tomorrowPreview" 
          title="Tomorrow's Preview" 
          description="A heads-up notification sent today about what's coming up tomorrow."
        />

        <Section 
          id="streakAlert" 
          title="Streak Saver Alert" 
          description="Reminds you to solve a problem today if your streak is currently at risk."
        />

        <Section 
          id="inactivityWarning" 
          title="Inactivity Warning" 
          description="A mandatory harsh warning if you abandon practice for several days."
          hideToggle={true}
          extraSettings={
            <div className="space-y-2">
              <Label>Days of Inactivity</Label>
              <Select 
                value={settings.inactivityWarning?.daysThreshold?.toString() || "2"} 
                onValueChange={(v) => updateSection('inactivityWarning', 'daysThreshold', parseInt(v))}
                disabled={!isConnected}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 5, 7].map(d => <SelectItem key={d} value={d.toString()}>{d} Days</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          }
        />

        <Section 
          id="report" 
          title="Periodic Report" 
          description="A summary of your solves, completed revisions, and pending dues."
          extraSettings={
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select 
                value={settings.report?.frequency || "weekly"} 
                onValueChange={(v) => updateSection('report', 'frequency', v)}
                disabled={!isConnected}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />

        <Section 
          id="overdueReminder" 
          title="Overdue Dues Reminder" 
          description="Reminds you if you missed revisions from previous days."
        />

        <div className="pt-6">
          <Button onClick={handleSave} disabled={isSaving || !isConnected} className="w-full">
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Preferences
          </Button>
        </div>

      </CardContent>
    </Card>
  )
}
