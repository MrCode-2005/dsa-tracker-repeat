import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// We need a service role key to bypass RLS since the webhook isn't authenticated as the user
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function sendMessage(chatId: string | number, text: string) {
  await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
    }),
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Check if it's a message with text
    if (body.message && body.message.text) {
      const chatId = body.message.chat.id
      const text = body.message.text.trim()

      // Handle the /start command with a token
      if (text.startsWith('/start ')) {
        const token = text.split(' ')[1]

        // Find the user with this token
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, display_name')
          .eq('telegram_link_token', token)
          .single()

        if (error || !profile) {
          await sendMessage(chatId, "❌ <b>Invalid or expired link token.</b>\nPlease go back to the app and generate a new one.")
          return NextResponse.json({ success: true }) // Return 200 so Telegram doesn't retry
        }

        // Link the account
        await supabase
          .from('profiles')
          .update({ 
            telegram_chat_id: chatId.toString(),
            telegram_link_token: null // invalidate token
          })
          .eq('id', profile.id)

        await sendMessage(chatId, `✅ <b>Account Linked!</b>\nWelcome, ${profile.display_name || 'User'}. You will now receive daily reminders and streak alerts here.`)
      } else {
        // Unknown command or message
        await sendMessage(chatId, "I'm a notification bot for the DSA Tracker. Connect your account from the app settings to receive alerts.")
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
