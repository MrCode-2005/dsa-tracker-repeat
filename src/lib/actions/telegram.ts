'use server'

import { createClient, getSafeUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function generateTelegramLinkToken() {
  const supabase = await createClient()
  const user = await getSafeUser()

  // Generate a 6-character random alphanumeric token
  const token = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { error } = await supabase
    .from('profiles')
    .update({ telegram_link_token: token })
    .eq('id', user.id)

  if (error) throw error
  
  revalidatePath('/reminders')
  return token
}

export async function updateUserTimezone(timezone: string) {
  const supabase = await createClient()
  const user = await getSafeUser()

  const { error } = await supabase
    .from('profiles')
    .update({ timezone })
    .eq('id', user.id)

  if (error) throw error
}

export async function disconnectTelegram() {
  const supabase = await createClient()
  const user = await getSafeUser()

  const { error } = await supabase
    .from('profiles')
    .update({ telegram_chat_id: null, telegram_link_token: null })
    .eq('id', user.id)

  if (error) throw error
  
  revalidatePath('/settings')
}

export async function updateNotificationSettings(settings: any) {
  const supabase = await createClient()
  const user = await getSafeUser()

  const { error } = await supabase
    .from('profiles')
    .update({ notification_settings: settings })
    .eq('id', user.id)

  if (error) throw error
  
  revalidatePath('/reminders')
}
