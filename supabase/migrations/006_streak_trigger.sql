-- =============================================
-- Repeat: Streak Computation Trigger
-- =============================================

create or replace function fn_update_streak()
returns trigger as $$
declare
  streak int := 0;
  check_date date;
  activity_exists boolean;
begin
  check_date := new.activity_date;

  loop
    select exists(
      select 1 from activity_log
      where user_id = new.user_id and activity_date = check_date
    ) into activity_exists;

    exit when not activity_exists;
    streak := streak + 1;
    check_date := check_date - interval '1 day';
  end loop;

  update profiles
  set current_streak = streak,
      highest_streak = greatest(highest_streak, streak),
      last_activity_date = new.activity_date
  where id = new.user_id;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_update_streak on activity_log;
create trigger trg_update_streak
  after insert on activity_log
  for each row execute function fn_update_streak();
