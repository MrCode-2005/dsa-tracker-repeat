-- Add youtube_channels to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS youtube_channels jsonb DEFAULT '[{"name": "NeetCode", "color": "#ef4444"}]'::jsonb;
