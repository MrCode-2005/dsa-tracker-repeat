-- =============================================
-- Migration: Multi-Channel Video URLs
-- Adds support for storing multiple video links per question
-- =============================================

-- 1. Add the new JSONB column
ALTER TABLE questions
ADD COLUMN video_urls JSONB DEFAULT '{}'::jsonb;

-- 2. Migrate existing youtube_url data into the JSONB column under the 'default' key
-- (So we don't lose any existing direct links before the upgrade)
UPDATE questions 
SET video_urls = jsonb_build_object('default', youtube_url) 
WHERE youtube_url IS NOT NULL;

-- 3. (Optional) Drop the old column once verified, but for safety we keep it for now.
-- ALTER TABLE questions DROP COLUMN youtube_url;
