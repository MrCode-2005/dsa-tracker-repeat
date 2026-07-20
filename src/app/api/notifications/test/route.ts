import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    // Get their profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('telegram_chat_id, notification_settings, timezone, current_streak, last_activity_date')
      .eq('id', user.id)
      .single()

    if (!profile?.telegram_chat_id) {
      return NextResponse.json({ error: 'Telegram not connected' }, { status: 400 })
    }

    const tz = profile.timezone || 'Asia/Kolkata'
    const rawSettings = (profile.notification_settings as any) || {}

    // Build debug info
    const now = new Date()
    const localString = now.toLocaleString("en-US", { timeZone: tz })
    const localDate = new Date(localString)
    const localHour = localDate.getHours().toString().padStart(2, '0') + ':00'

    let daysInactive = 0
    if (profile.last_activity_date) {
      const [ly, lm, ld] = profile.last_activity_date.split('-').map(Number)
      const lastActLocal = new Date(ly, lm - 1, ld)
      const todayLocal = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate())
      daysInactive = Math.round((todayLocal.getTime() - lastActLocal.getTime()) / (1000 * 60 * 60 * 24))
    } else {
      daysInactive = 999
    }

    const inactivitySettings = rawSettings.inactivityWarning || {}
    const threshold = inactivitySettings.daysThreshold ?? 2
    const savedTime = inactivitySettings.time || '20:00'
    const message = inactivitySettings.message || '⚠️ <b>Inactivity Warning</b>\nYou haven\'t solved any problems for {{days}} days!'

    const debugInfo = {
      timezone: tz,
      localHour,
      savedDeliveryTime: savedTime,
      timeMatch: localHour === savedTime,
      daysInactive,
      threshold,
      thresholdMet: daysInactive >= threshold,
      rawSettings: rawSettings.inactivityWarning,
    }

    // Send a test message regardless of conditions
    const testMessage = `🧪 <b>Test Notification</b>\n\n` +
      `✅ Telegram is connected!\n\n` +
      `<b>Debug Info:</b>\n` +
      `• Your timezone: <code>${tz}</code>\n` +
      `• Current local hour: <code>${localHour}</code>\n` +
      `• Your saved delivery time: <code>${savedTime}</code>\n` +
      `• Time match: <code>${localHour === savedTime}</code>\n` +
      `• Days inactive: <code>${daysInactive}</code>\n` +
      `• Threshold: <code>${threshold}</code>\n` +
      `• Threshold met: <code>${daysInactive >= threshold}</code>\n\n` +
      (daysInactive >= threshold
        ? `✅ <b>Inactivity Warning WOULD fire at ${savedTime}!</b>\n\n` + message.replace(/\{\{days\}\}/g, daysInactive.toString())
        : `❌ Inactivity Warning would NOT fire. Days inactive (${daysInactive}) < threshold (${threshold})`)

    const resp = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: testMessage,
        parse_mode: 'HTML',
      }),
    })

    const telegramResult = await resp.json()

    return NextResponse.json({ success: true, debug: debugInfo, telegram: telegramResult })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
