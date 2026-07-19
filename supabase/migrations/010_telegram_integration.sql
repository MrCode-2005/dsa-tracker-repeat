-- Add telegram integration columns to profiles
ALTER TABLE public.profiles
ADD COLUMN telegram_chat_id text UNIQUE,
ADD COLUMN telegram_link_token text UNIQUE;

-- Create an index on link token for fast lookups during linking
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_link_token ON public.profiles(telegram_link_token);
