-- =============================================
-- Repeat: Revision Engine Trigger (1-3-7-21 Rule)
-- =============================================

create or replace function fn_create_revision_schedule()
returns trigger as $$
declare
  solve_date date;
  existing_count int;
begin
  -- Only fire when status transitions TO 'solved'
  if new.status = 'solved' and (old.status is null or old.status = 'unsolved') then
    -- Check if revision schedule already exists
    select count(*) into existing_count
    from revision_schedule
    where user_id = new.user_id and question_id = new.question_id;

    -- Only create schedule if none exists (prevent duplicates on re-solve)
    if existing_count = 0 then
      solve_date := (new.first_solved_at at time zone 'UTC')::date;

      insert into revision_schedule (user_id, question_id, cycle_stage, scheduled_for)
      values
        (new.user_id, new.question_id, 1, solve_date + interval '1 day'),
        (new.user_id, new.question_id, 3, solve_date + interval '3 days'),
        (new.user_id, new.question_id, 7, solve_date + interval '7 days'),
        (new.user_id, new.question_id, 21, solve_date + interval '21 days');
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_create_revision_schedule on user_question_progress;
create trigger trg_create_revision_schedule
  after insert or update on user_question_progress
  for each row execute function fn_create_revision_schedule();
