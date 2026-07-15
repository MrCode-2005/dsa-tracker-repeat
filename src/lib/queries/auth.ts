import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types/database'

export async function getProfileClient(): Promise<Profile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data as Profile | null
}
