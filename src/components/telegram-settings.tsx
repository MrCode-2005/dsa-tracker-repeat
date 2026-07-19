'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Send, CheckCircle2, Loader2, Unplug } from 'lucide-react'
import { generateTelegramLinkToken, disconnectTelegram } from '@/lib/actions/telegram'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface TelegramSettingsProps {
  chatId: string | null
  linkToken: string | null
}

export function TelegramSettings({ chatId, linkToken }: TelegramSettingsProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [token, setToken] = useState(linkToken)

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      const newToken = await generateTelegramLinkToken()
      setToken(newToken)
      toast.success('Linking token generated')
    } catch (error) {
      toast.error('Failed to generate token')
    } finally {
      setIsGenerating(false)
    }
  }

  // Use process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME, default to generic placeholder if not set
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'YOUR_BOT_USERNAME'
  const telegramLink = token ? `https://t.me/${botUsername}?start=${token}` : null

  return (
    <Card className="bg-card/50 border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold mb-2 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#2AABEE]" />
              Telegram Reminders
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-xl">
              Connect your Telegram account to receive daily reminders, revision alerts, and streak warnings directly to your phone.
            </p>
          </div>
          
          {chatId ? (
            <div className="flex flex-col items-end gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Connected
              </span>
              <ConfirmDialog
                title="Disconnect Telegram"
                description="Are you sure? You will no longer receive automated reminders."
                confirmText="Disconnect"
                variant="destructive"
                onConfirm={async () => {
                  await disconnectTelegram()
                  setToken(null)
                  toast.success('Telegram disconnected')
                }}
              >
                <Button variant="ghost" size="sm" className="text-xs h-7 text-muted-foreground hover:text-destructive">
                  <Unplug className="w-3 h-3 mr-1" />
                  Disconnect
                </Button>
              </ConfirmDialog>
            </div>
          ) : (
            <div>
              {!token ? (
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Connect Telegram
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button asChild className="bg-[#2AABEE] hover:bg-[#2AABEE]/90 text-white">
                    <a href={telegramLink!} target="_blank" rel="noopener noreferrer">
                      Open Telegram
                    </a>
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center">
                    Click Start in the bot chat
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
