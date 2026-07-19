import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TelegramSettings } from '@/components/telegram-settings'
import { NotificationSettingsForm } from './notification-settings-form'

export const metadata = {
  title: 'Reminders & Notifications | DSA Tracker',
}

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('telegram_chat_id, telegram_link_token, notification_settings')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Reminders & Notifications</h1>
        <p className="text-muted-foreground">
          Connect your Telegram account and customize when and how you receive alerts.
        </p>
      </div>

      <TelegramSettings 
        chatId={profile?.telegram_chat_id || null} 
        linkToken={profile?.telegram_link_token || null} 
      />

      <NotificationSettingsForm 
        initialSettings={profile?.notification_settings} 
        isConnected={!!profile?.telegram_chat_id}
      />
    </div>
  )
}
