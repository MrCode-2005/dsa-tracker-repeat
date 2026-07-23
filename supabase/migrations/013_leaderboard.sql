-- =============================================
-- Repeat: Leaderboard — RLS for profiles visibility
-- Allow all authenticated users to read all profiles
-- (needed so leaderboard can show everyone)
-- =============================================

-- Allow authenticated users to read all profiles (for leaderboard)
-- This is safe because profiles only contain: display_name, avatar_url,
-- current_streak, highest_streak, last_activity_date — no private data.
create policy "Authenticated users can view all profiles for leaderboard"
  on profiles
  for select
  to authenticated
  using (true);
