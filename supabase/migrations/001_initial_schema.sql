-- =============================================
-- Repeat: DSA Tracker — Initial Schema
-- =============================================

-- 1. PROFILES (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  leetcode_username text,
  avatar_url text,
  current_streak int default 0,
  highest_streak int default 0,
  last_activity_date date,
  created_at timestamptz default now()
);

-- 2. MASTER QUESTION BANK
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  leetcode_number int,
  title text not null,
  slug text,
  topic text,
  difficulty text check (difficulty in ('Easy','Medium','Hard')),
  companies text[],
  youtube_url text,
  created_at timestamptz default now(),
  unique (leetcode_number)
);

-- 3. USER-OWNED LISTS
create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  description text,
  source_type text check (source_type in ('preset','imported','custom')) default 'custom',
  color text,
  created_at timestamptz default now()
);

-- 4. LIST <-> QUESTION JOIN
create table if not exists list_questions (
  id uuid primary key default gen_random_uuid(),
  list_id uuid references lists(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  position int,
  unique (list_id, question_id)
);

-- 5. PER-USER, PER-QUESTION PROGRESS
create table if not exists user_question_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  status text check (status in ('unsolved','solved')) default 'unsolved',
  first_solved_at timestamptz,
  last_solved_at timestamptz,
  times_solved int default 0,
  note text,
  is_bookmarked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, question_id)
);

-- 6. REVISION SCHEDULE ENGINE
create table if not exists revision_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  cycle_stage int check (cycle_stage in (1,3,7,21)) not null,
  scheduled_for date not null,
  completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 7. BOOKMARK FOLDERS
create table if not exists bookmark_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  emoji text,
  created_at timestamptz default now()
);

create table if not exists bookmark_items (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references bookmark_folders(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (folder_id, question_id)
);

-- 8. DAILY ACTIVITY LOG
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  activity_type text check (activity_type in ('solve','revision')) not null,
  activity_date date not null default current_date,
  created_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
