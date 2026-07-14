-- =============================================
-- Repeat: Performance Indexes
-- =============================================

create index if not exists idx_revision_schedule_user_date on revision_schedule(user_id, scheduled_for);
create index if not exists idx_revision_schedule_user_question on revision_schedule(user_id, question_id);
create index if not exists idx_activity_log_user_date on activity_log(user_id, activity_date);
create index if not exists idx_list_questions_list on list_questions(list_id);
create index if not exists idx_list_questions_question on list_questions(question_id);
create index if not exists idx_user_progress_user_question on user_question_progress(user_id, question_id);
create index if not exists idx_user_progress_user_status on user_question_progress(user_id, status);
create index if not exists idx_questions_leetcode_number on questions(leetcode_number);
create index if not exists idx_questions_topic on questions(topic);
create index if not exists idx_bookmark_items_folder on bookmark_items(folder_id);
create index if not exists idx_bookmark_items_user on bookmark_items(user_id);
