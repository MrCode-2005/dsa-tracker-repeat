-- Add notification_settings column to profiles
ALTER TABLE public.profiles
ADD COLUMN notification_settings JSONB DEFAULT '{
  "revisionReminder": { "enabled": true, "time": "20:00", "message": "📚 <b>Revisions Due: {{count}}</b>\nYou have {{count}} spaced repetition problem(s) scheduled for today. Don''t let them pile up!" },
  "tomorrowPreview": { "enabled": false, "time": "20:00", "message": "🔮 <b>Tomorrow''s Preview</b>\nYou have {{count}} revision(s) scheduled for tomorrow." },
  "streakAlert": { "enabled": true, "time": "20:00", "message": "🔥 <b>Streak at Risk!</b>\nYou have a {{streak}}-day streak going, but you haven''t solved any problems today. Jump in and keep the fire alive!" },
  "inactivityWarning": { "enabled": true, "time": "20:00", "daysThreshold": 2, "message": "⚠️ <b>Inactivity Warning</b>\nYou haven''t solved any problems for {{days}} days! Log in now or your LeetCode streak will get ruined!" },
  "report": { "enabled": false, "time": "10:00", "frequency": "weekly", "message": "📊 <b>{{frequency}} Report</b>\nSolves: {{solves}}\nRevisions Done: {{revisionsDone}}\nPending Dues: {{dues}}" },
  "overdueReminder": { "enabled": true, "time": "12:00", "message": "⏰ <b>Overdue Revisions</b>\nYou have {{count}} missed revision(s) from past days. Complete them ASAP!" }
}'::jsonb;
