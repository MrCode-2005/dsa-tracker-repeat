-- =============================================
-- Repeat: Row Level Security Policies
-- =============================================

alter table profiles enable row level security;
alter table questions enable row level security;
alter table lists enable row level security;
alter table list_questions enable row level security;
alter table user_question_progress enable row level security;
alter table revision_schedule enable row level security;
alter table bookmark_folders enable row level security;
alter table bookmark_items enable row level security;
alter table activity_log enable row level security;

-- PROFILES
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- QUESTIONS (shared bank)
create policy "Authenticated users can read questions" on questions for select to authenticated using (true);
create policy "Authenticated users can insert questions" on questions for insert to authenticated with check (true);
create policy "Authenticated users can update questions" on questions for update to authenticated using (true);

-- LISTS
create policy "Users can view own lists" on lists for select using (auth.uid() = user_id);
create policy "Users can create lists" on lists for insert with check (auth.uid() = user_id);
create policy "Users can update own lists" on lists for update using (auth.uid() = user_id);
create policy "Users can delete own lists" on lists for delete using (auth.uid() = user_id);

-- LIST_QUESTIONS
create policy "Users can view list questions" on list_questions for select using (exists (select 1 from lists where lists.id = list_questions.list_id and lists.user_id = auth.uid()));
create policy "Users can add list questions" on list_questions for insert with check (exists (select 1 from lists where lists.id = list_questions.list_id and lists.user_id = auth.uid()));
create policy "Users can remove list questions" on list_questions for delete using (exists (select 1 from lists where lists.id = list_questions.list_id and lists.user_id = auth.uid()));

-- USER_QUESTION_PROGRESS
create policy "Users can view own progress" on user_question_progress for select using (auth.uid() = user_id);
create policy "Users can create progress" on user_question_progress for insert with check (auth.uid() = user_id);
create policy "Users can update own progress" on user_question_progress for update using (auth.uid() = user_id);
create policy "Users can delete own progress" on user_question_progress for delete using (auth.uid() = user_id);

-- REVISION_SCHEDULE
create policy "Users can view own revisions" on revision_schedule for select using (auth.uid() = user_id);
create policy "Users can create revisions" on revision_schedule for insert with check (auth.uid() = user_id);
create policy "Users can update own revisions" on revision_schedule for update using (auth.uid() = user_id);
create policy "Users can delete own revisions" on revision_schedule for delete using (auth.uid() = user_id);

-- BOOKMARK_FOLDERS
create policy "Users can view own bookmark folders" on bookmark_folders for select using (auth.uid() = user_id);
create policy "Users can create bookmark folders" on bookmark_folders for insert with check (auth.uid() = user_id);
create policy "Users can update own bookmark folders" on bookmark_folders for update using (auth.uid() = user_id);
create policy "Users can delete own bookmark folders" on bookmark_folders for delete using (auth.uid() = user_id);

-- BOOKMARK_ITEMS
create policy "Users can view own bookmark items" on bookmark_items for select using (auth.uid() = user_id);
create policy "Users can create bookmark items" on bookmark_items for insert with check (auth.uid() = user_id);
create policy "Users can delete own bookmark items" on bookmark_items for delete using (auth.uid() = user_id);

-- ACTIVITY_LOG
create policy "Users can view own activity" on activity_log for select using (auth.uid() = user_id);
create policy "Users can log activity" on activity_log for insert with check (auth.uid() = user_id);
