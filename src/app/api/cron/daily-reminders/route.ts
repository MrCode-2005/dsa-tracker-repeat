import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function sendMessage(chatId: string, text: string) {
  try {
    await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
      }),
    })
  } catch (error) {
    console.error(`Failed to send message to ${chatId}:`, error)
  }
}

export async function GET(req: Request) {
  try {
    // 1. Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    // 2. Fetch all users with a connected Telegram account
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, telegram_chat_id, current_streak, last_activity_date')
      .not('telegram_chat_id', 'is', null)

    if (usersError) throw usersError

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users with connected Telegram accounts' })
    }

    const todayDate = new Date().toISOString().split('T')[0]
    let sentCount = 0

    for (const user of users) {
      const chatId = user.telegram_chat_id!
      let messages: string[] = []

      // Check Streak Risk (If streak > 0 and haven't practiced today)
      if (user.current_streak > 0 && user.last_activity_date !== todayDate) {
        messages.push(`🔥 <b>Streak at Risk!</b>\nYou have a ${user.current_streak}-day streak going, but you haven't solved any problems today. Jump in and keep the fire alive!`)
      }

      // Check Pending Revisions
      const { count: dueCount, error: revError } = await supabase
        .from('revision_schedule')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', false)
        .lte('scheduled_for', todayDate)

      if (dueCount && dueCount > 0) {
        messages.push(`📚 <b>Revisions Due: ${dueCount}</b>\nYou have ${dueCount} spaced repetition problem(s) scheduled for today. Don't let them pile up!`)
      }

      // Send the combined message if there is anything to say
      if (messages.length > 0) {
        const fullMessage = messages.join('\n\n') + '\n\n<a href="https://your-dsa-tracker.vercel.app">Go to DSA Tracker 🚀</a>'
        await sendMessage(chatId, fullMessage)
        sentCount++
      }
    }

    return NextResponse.json({ success: true, messagesSent: sentCount })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
