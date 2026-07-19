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

const DEFAULT_SETTINGS = {
  revisionReminder: { enabled: true, time: "20:00", message: "📚 <b>Revisions Due: {{count}}</b>\nYou have {{count}} spaced repetition problem(s) scheduled for today. Don't let them pile up!" },
  tomorrowPreview: { enabled: false, time: "20:00", message: "🔮 <b>Tomorrow's Preview</b>\nYou have {{count}} revision(s) scheduled for tomorrow." },
  streakAlert: { enabled: true, time: "20:00", message: "🔥 <b>Streak at Risk!</b>\nYou have a {{streak}}-day streak going, but you haven't solved any problems today. Jump in and keep the fire alive!" },
  inactivityWarning: { enabled: true, time: "20:00", daysThreshold: 2, message: "⚠️ <b>Inactivity Warning</b>\nYou haven't solved any problems for {{days}} days! Log in now or your LeetCode streak will get ruined!" },
  report: { enabled: false, time: "10:00", frequency: "weekly", message: "📊 <b>{{frequency}} Report</b>\nSolves: {{solves}}\nRevisions Done: {{revisionsDone}}\nPending Dues: {{dues}}" },
  overdueReminder: { enabled: true, time: "12:00", message: "⏰ <b>Overdue Revisions</b>\nYou have {{count}} missed revision(s) from past days. Complete them ASAP!" }
}

export async function GET(req: Request) {
  try {
    // 1. Verify cron secret
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    // 2. Fetch all users with connected Telegram
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, telegram_chat_id, current_streak, last_activity_date, notification_settings, timezone')
      .not('telegram_chat_id', 'is', null)

    if (usersError) throw usersError
    if (!users || users.length === 0) return NextResponse.json({ message: 'No users' })

    let sentCount = 0

    for (const user of users) {
      const chatId = user.telegram_chat_id!
      const tz = user.timezone || 'UTC'
      const settings = (user.notification_settings as any) || DEFAULT_SETTINGS
      
      // Get user's local date/time
      const now = new Date()
      const localString = now.toLocaleString("en-US", { timeZone: tz })
      const localDate = new Date(localString)
      
      const localHour = localDate.getHours().toString().padStart(2, '0') + ':00'
      const yyyy = localDate.getFullYear()
      const mm = String(localDate.getMonth() + 1).padStart(2, '0')
      const dd = String(localDate.getDate()).padStart(2, '0')
      const todayDateStr = `${yyyy}-${mm}-${dd}`
      
      // Calculate inactivity days
      let daysInactive = 0
      if (user.last_activity_date) {
        const lastActivityDate = new Date(user.last_activity_date)
        const diffTime = Math.abs(localDate.getTime() - lastActivityDate.getTime())
        daysInactive = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      } else {
        daysInactive = 999
      }

      let messages: string[] = []

      // 1. Revision Reminder (Today)
      if (settings.revisionReminder?.enabled !== false && settings.revisionReminder?.time === localHour) {
        const { count } = await supabase
          .from('revision_schedule')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('completed', false)
          .eq('scheduled_for', todayDateStr)

        if (count && count > 0) {
          messages.push((settings.revisionReminder.message || DEFAULT_SETTINGS.revisionReminder.message).replace('{{count}}', count.toString()))
        }
      }

      // 2. Tomorrow's Preview
      if (settings.tomorrowPreview?.enabled && settings.tomorrowPreview?.time === localHour) {
        const tmr = new Date(localDate)
        tmr.setDate(tmr.getDate() + 1)
        const tmrDateStr = `${tmr.getFullYear()}-${String(tmr.getMonth() + 1).padStart(2, '0')}-${String(tmr.getDate()).padStart(2, '0')}`
        
        const { count } = await supabase
          .from('revision_schedule')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('completed', false)
          .eq('scheduled_for', tmrDateStr)

        if (count && count > 0) {
          messages.push((settings.tomorrowPreview.message || DEFAULT_SETTINGS.tomorrowPreview.message).replace('{{count}}', count.toString()))
        }
      }

      // 3. Streak Alert
      if (settings.streakAlert?.enabled !== false && settings.streakAlert?.time === localHour) {
        if (user.current_streak > 0 && user.last_activity_date !== todayDateStr) {
          messages.push((settings.streakAlert.message || DEFAULT_SETTINGS.streakAlert.message).replace('{{streak}}', user.current_streak.toString()))
        }
      }

      // 4. Inactivity Warning
      if (settings.inactivityWarning?.time === localHour) {
        const threshold = settings.inactivityWarning?.daysThreshold || 2
        if (daysInactive >= threshold && user.last_activity_date !== todayDateStr) {
          messages.push((settings.inactivityWarning.message || DEFAULT_SETTINGS.inactivityWarning.message).replace(/\{\{days\}\}/g, daysInactive.toString()))
        }
      }

      // 5. Periodic Report
      if (settings.report?.enabled && settings.report?.time === localHour) {
        const isWeekly = settings.report.frequency === 'weekly'
        const isMonthly = settings.report.frequency === 'monthly'
        
        // Very basic frequency check:
        // If weekly, send on Sunday (day 0)
        // If monthly, send on 1st of month
        const shouldSendReport = (isWeekly && localDate.getDay() === 0) || (isMonthly && localDate.getDate() === 1)
        
        if (shouldSendReport) {
          const sinceDate = new Date(localDate)
          if (isWeekly) sinceDate.setDate(sinceDate.getDate() - 7)
          if (isMonthly) sinceDate.setMonth(sinceDate.getMonth() - 1)
          
          const sinceDateStr = `${sinceDate.getFullYear()}-${String(sinceDate.getMonth() + 1).padStart(2, '0')}-${String(sinceDate.getDate()).padStart(2, '0')}`

          // Fetch stats (rough approximation using activity_log)
          const { count: solves } = await supabase.from('activity_log').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id).eq('activity_type', 'solve').gte('activity_date', sinceDateStr)
            
          const { count: revsDone } = await supabase.from('activity_log').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id).eq('activity_type', 'revision').gte('activity_date', sinceDateStr)
            
          const { count: pending } = await supabase.from('revision_schedule').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id).eq('completed', false).lte('scheduled_for', todayDateStr)

          messages.push((settings.report.message || DEFAULT_SETTINGS.report.message)
            .replace(/\{\{frequency\}\}/g, isWeekly ? 'Weekly' : 'Monthly')
            .replace('{{solves}}', (solves || 0).toString())
            .replace('{{revisionsDone}}', (revsDone || 0).toString())
            .replace('{{dues}}', (pending || 0).toString())
          )
        }
      }

      // 6. Overdue Reminder
      if (settings.overdueReminder?.enabled !== false && settings.overdueReminder?.time === localHour) {
        const { count } = await supabase
          .from('revision_schedule')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('completed', false)
          .lt('scheduled_for', todayDateStr) // Strictly less than today

        if (count && count > 0) {
          messages.push((settings.overdueReminder.message || DEFAULT_SETTINGS.overdueReminder.message).replace('{{count}}', count.toString()))
        }
      }

      // Dispatch
      if (messages.length > 0) {
        const fullMessage = messages.join('\n\n') + '\n\n<a href="https://your-dsa-tracker.vercel.app">Go to DSA Tracker 🚀</a>'
        await sendMessage(chatId, fullMessage)
        sentCount++
      }
    }

    return NextResponse.json({ success: true, messagesSent: sentCount })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
