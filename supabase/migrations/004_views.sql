-- =============================================
-- Repeat: Analytics Views
-- =============================================

create or replace view v_progress_by_difficulty as
select uqp.user_id, q.difficulty,
  count(*) filter (where uqp.status = 'solved') as solved_count,
  count(*) as total_count
from user_question_progress uqp
join questions q on q.id = uqp.question_id
group by uqp.user_id, q.difficulty;

create or replace view v_progress_by_topic as
select uqp.user_id, q.topic,
  count(*) filter (where uqp.status = 'solved') as solved_count,
  count(*) as total_count
from user_question_progress uqp
join questions q on q.id = uqp.question_id
where q.topic is not null
group by uqp.user_id, q.topic;

create or replace view v_progress_by_list as
select l.id as list_id, l.user_id, l.name as list_name, l.color, l.source_type,
  count(lq.id) as total_count,
  count(uqp.id) filter (where uqp.status = 'solved') as solved_count
from lists l
left join list_questions lq on lq.list_id = l.id
left join user_question_progress uqp on uqp.question_id = lq.question_id and uqp.user_id = l.user_id
group by l.id, l.user_id, l.name, l.color, l.source_type;

create or replace view v_daily_activity as
select user_id, activity_date, count(*) as activity_count,
  count(*) filter (where activity_type = 'solve') as solve_count,
  count(*) filter (where activity_type = 'revision') as revision_count
from activity_log
group by user_id, activity_date;
