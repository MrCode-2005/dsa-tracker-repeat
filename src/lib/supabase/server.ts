import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  console.log("CREATE CLIENT URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll()
          console.log("SERVER COOKIES:", allCookies.map(c => c.name))
          return allCookies
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getSafeUser() {
  const supabase = await createClient()
  let user = null
  
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (err) {
    console.warn("getUser failed, falling back to getSession", err)
  }

  if (!user) {
    const { data } = await supabase.auth.getSession()
    user = data.session?.user || null
  }
  
  const headersList = await import('next/headers').then(m => m.headers())
  const headerUserId = headersList.get('x-user-id')
  
  const cookieStore = await import('next/headers').then(m => m.cookies())
  const cookieUserId = cookieStore.get('x-user-id')?.value
  
  const userId = user?.id || headerUserId || cookieUserId
  if (!userId) {
    throw new Error('Unauthorized')
  }
  
  return { id: userId, ...user }
}
