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
-- =============================================
-- Repeat: Seed Data — NeetCode 150 Questions
-- Run after migrations to populate the master question bank.
-- =============================================

-- Blind 75 Subset (leetcode numbers):
-- 1,3,5,7,11,15,19,20,21,23,25,33,39,42,46,48,49,51,53,54,55,56,57,62,66,70,72,73,76,78,79,84,91,97,98,100,102,104,105,115,121,124,125,127,128,130,131,133,134,136,139,141,143,146,152,153,155,167,190,191,198,200,206,207,208,210,211,212,213,215,217,226,230,235,238,242,252,253,261,268,269,271,287,295,297,300,309,312,322,323,329,338,347,371,417,424,435,494,518,572,647,678,695,703,739,746,763,787,846,875,981,994,1046,1143,1448,1584,1851,1899,2013

-- =============================================
-- Arrays & Hashing
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (217, 'Contains Duplicate', 'contains-duplicate', 'Arrays & Hashing', 'Easy', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (242, 'Valid Anagram', 'valid-anagram', 'Arrays & Hashing', 'Easy', ARRAY['Amazon','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (1, 'Two Sum', 'two-sum', 'Arrays & Hashing', 'Easy', ARRAY['Amazon','Google','Meta','Apple','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (49, 'Group Anagrams', 'group-anagrams', 'Arrays & Hashing', 'Medium', ARRAY['Amazon','Google','Meta','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (347, 'Top K Frequent Elements', 'top-k-frequent-elements', 'Arrays & Hashing', 'Medium', ARRAY['Amazon','Meta','Oracle','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (238, 'Product of Array Except Self', 'product-of-array-except-self', 'Arrays & Hashing', 'Medium', ARRAY['Amazon','Meta','Apple','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (36, 'Valid Sudoku', 'valid-sudoku', 'Arrays & Hashing', 'Medium', ARRAY['Amazon','Microsoft','Uber']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (271, 'Encode and Decode Strings', 'encode-and-decode-strings', 'Arrays & Hashing', 'Medium', ARRAY['Google','Meta','Uber','Airbnb']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (128, 'Longest Consecutive Sequence', 'longest-consecutive-sequence', 'Arrays & Hashing', 'Medium', ARRAY['Amazon','Google','Meta','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Two Pointers
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (125, 'Valid Palindrome', 'valid-palindrome', 'Two Pointers', 'Easy', ARRAY['Meta','Microsoft','Amazon']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (167, 'Two Sum II - Input Array Is Sorted', 'two-sum-ii-input-array-is-sorted', 'Two Pointers', 'Medium', ARRAY['Amazon','Bloomberg','Adobe']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (15, '3Sum', 'three-sum', 'Two Pointers', 'Medium', ARRAY['Amazon','Meta','Bloomberg','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (11, 'Container With Most Water', 'container-with-most-water', 'Two Pointers', 'Medium', ARRAY['Amazon','Google','Meta','Goldman Sachs']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (42, 'Trapping Rain Water', 'trapping-rain-water', 'Two Pointers', 'Hard', ARRAY['Amazon','Google','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Sliding Window
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (121, 'Best Time to Buy and Sell Stock', 'best-time-to-buy-and-sell-stock', 'Sliding Window', 'Easy', ARRAY['Amazon','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (3, 'Longest Substring Without Repeating Characters', 'longest-substring-without-repeating-characters', 'Sliding Window', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (424, 'Longest Repeating Character Replacement', 'longest-repeating-character-replacement', 'Sliding Window', 'Medium', ARRAY['Google','Amazon','Uber']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (567, 'Permutation in String', 'permutation-in-string', 'Sliding Window', 'Medium', ARRAY['Microsoft','Amazon','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (76, 'Minimum Window Substring', 'minimum-window-substring', 'Sliding Window', 'Hard', ARRAY['Amazon','Meta','Google','Microsoft','LinkedIn']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (239, 'Sliding Window Maximum', 'sliding-window-maximum', 'Sliding Window', 'Hard', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Stack
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (20, 'Valid Parentheses', 'valid-parentheses', 'Stack', 'Easy', ARRAY['Amazon','Google','Meta','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (155, 'Min Stack', 'min-stack', 'Stack', 'Medium', ARRAY['Amazon','Bloomberg','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (150, 'Evaluate Reverse Polish Notation', 'evaluate-reverse-polish-notation', 'Stack', 'Medium', ARRAY['Amazon','Google','LinkedIn']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (22, 'Generate Parentheses', 'generate-parentheses', 'Stack', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (739, 'Daily Temperatures', 'daily-temperatures', 'Stack', 'Medium', ARRAY['Amazon','Meta','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (853, 'Car Fleet', 'car-fleet', 'Stack', 'Medium', ARRAY['Google','Amazon']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (84, 'Largest Rectangle in Histogram', 'largest-rectangle-in-histogram', 'Stack', 'Hard', ARRAY['Amazon','Google','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Binary Search
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (704, 'Binary Search', 'binary-search', 'Binary Search', 'Easy', ARRAY['Amazon','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (74, 'Search a 2D Matrix', 'search-a-2d-matrix', 'Binary Search', 'Medium', ARRAY['Amazon','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (875, 'Koko Eating Bananas', 'koko-eating-bananas', 'Binary Search', 'Medium', ARRAY['Google','Amazon']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (33, 'Search in Rotated Sorted Array', 'search-in-rotated-sorted-array', 'Binary Search', 'Medium', ARRAY['Amazon','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (153, 'Find Minimum in Rotated Sorted Array', 'find-minimum-in-rotated-sorted-array', 'Binary Search', 'Medium', ARRAY['Amazon','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (981, 'Time Based Key-Value Store', 'time-based-key-value-store', 'Binary Search', 'Medium', ARRAY['Google','Amazon','Lyft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (4, 'Median of Two Sorted Arrays', 'median-of-two-sorted-arrays', 'Binary Search', 'Hard', ARRAY['Amazon','Google','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Linked List
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (206, 'Reverse Linked List', 'reverse-linked-list', 'Linked List', 'Easy', ARRAY['Amazon','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (21, 'Merge Two Sorted Lists', 'merge-two-sorted-lists', 'Linked List', 'Easy', ARRAY['Amazon','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (141, 'Linked List Cycle', 'linked-list-cycle', 'Linked List', 'Easy', ARRAY['Amazon','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (143, 'Reorder List', 'reorder-list', 'Linked List', 'Medium', ARRAY['Amazon','Meta','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (19, 'Remove Nth Node From End of List', 'remove-nth-node-from-end-of-list', 'Linked List', 'Medium', ARRAY['Amazon','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (138, 'Copy List with Random Pointer', 'copy-list-with-random-pointer', 'Linked List', 'Medium', ARRAY['Amazon','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (2, 'Add Two Numbers', 'add-two-numbers', 'Linked List', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (287, 'Find the Duplicate Number', 'find-the-duplicate-number', 'Linked List', 'Medium', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (146, 'LRU Cache', 'lru-cache', 'Linked List', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (23, 'Merge k Sorted Lists', 'merge-k-sorted-lists', 'Linked List', 'Hard', ARRAY['Amazon','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (25, 'Reverse Nodes in k-Group', 'reverse-nodes-in-k-group', 'Linked List', 'Hard', ARRAY['Amazon','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Trees
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (226, 'Invert Binary Tree', 'invert-binary-tree', 'Trees', 'Easy', ARRAY['Google','Amazon','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (104, 'Maximum Depth of Binary Tree', 'maximum-depth-of-binary-tree', 'Trees', 'Easy', ARRAY['Amazon','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (543, 'Diameter of Binary Tree', 'diameter-of-binary-tree', 'Trees', 'Easy', ARRAY['Meta','Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (110, 'Balanced Binary Tree', 'balanced-binary-tree', 'Trees', 'Easy', ARRAY['Amazon','Google','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (100, 'Same Tree', 'same-tree', 'Trees', 'Easy', ARRAY['Amazon','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (572, 'Subtree of Another Tree', 'subtree-of-another-tree', 'Trees', 'Easy', ARRAY['Amazon','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (235, 'Lowest Common Ancestor of a BST', 'lowest-common-ancestor-of-a-binary-search-tree', 'Trees', 'Medium', ARRAY['Amazon','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (102, 'Binary Tree Level Order Traversal', 'binary-tree-level-order-traversal', 'Trees', 'Medium', ARRAY['Amazon','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (199, 'Binary Tree Right Side View', 'binary-tree-right-side-view', 'Trees', 'Medium', ARRAY['Meta','Amazon','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (1448, 'Count Good Nodes in Binary Tree', 'count-good-nodes-in-binary-tree', 'Trees', 'Medium', ARRAY['Amazon','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (98, 'Validate Binary Search Tree', 'validate-binary-search-tree', 'Trees', 'Medium', ARRAY['Amazon','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (230, 'Kth Smallest Element in a BST', 'kth-smallest-element-in-a-bst', 'Trees', 'Medium', ARRAY['Amazon','Meta','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (105, 'Construct Binary Tree from Preorder and Inorder Traversal', 'construct-binary-tree-from-preorder-and-inorder-traversal', 'Trees', 'Medium', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (124, 'Binary Tree Maximum Path Sum', 'binary-tree-maximum-path-sum', 'Trees', 'Hard', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (297, 'Serialize and Deserialize Binary Tree', 'serialize-and-deserialize-binary-tree', 'Trees', 'Hard', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Heap / Priority Queue
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (703, 'Kth Largest Element in a Stream', 'kth-largest-element-in-a-stream', 'Heap / Priority Queue', 'Easy', ARRAY['Amazon','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (1046, 'Last Stone Weight', 'last-stone-weight', 'Heap / Priority Queue', 'Easy', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (973, 'K Closest Points to Origin', 'k-closest-points-to-origin', 'Heap / Priority Queue', 'Medium', ARRAY['Amazon','Meta','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (215, 'Kth Largest Element in an Array', 'kth-largest-element-in-an-array', 'Heap / Priority Queue', 'Medium', ARRAY['Amazon','Meta','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (621, 'Task Scheduler', 'task-scheduler', 'Heap / Priority Queue', 'Medium', ARRAY['Amazon','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (355, 'Design Twitter', 'design-twitter', 'Heap / Priority Queue', 'Medium', ARRAY['Amazon','Twitter']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (295, 'Find Median from Data Stream', 'find-median-from-data-stream', 'Heap / Priority Queue', 'Hard', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Backtracking
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (78, 'Subsets', 'subsets', 'Backtracking', 'Medium', ARRAY['Amazon','Meta','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (39, 'Combination Sum', 'combination-sum', 'Backtracking', 'Medium', ARRAY['Amazon','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (46, 'Permutations', 'permutations', 'Backtracking', 'Medium', ARRAY['Amazon','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (90, 'Subsets II', 'subsets-ii', 'Backtracking', 'Medium', ARRAY['Amazon','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (40, 'Combination Sum II', 'combination-sum-ii', 'Backtracking', 'Medium', ARRAY['Amazon','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (79, 'Word Search', 'word-search', 'Backtracking', 'Medium', ARRAY['Amazon','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (131, 'Palindrome Partitioning', 'palindrome-partitioning', 'Backtracking', 'Medium', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (17, 'Letter Combinations of a Phone Number', 'letter-combinations-of-a-phone-number', 'Backtracking', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (51, 'N-Queens', 'n-queens', 'Backtracking', 'Hard', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Tries
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (208, 'Implement Trie (Prefix Tree)', 'implement-trie-prefix-tree', 'Tries', 'Medium', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (211, 'Design Add and Search Words Data Structure', 'design-add-and-search-words-data-structure', 'Tries', 'Medium', ARRAY['Amazon','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (212, 'Word Search II', 'word-search-ii', 'Tries', 'Hard', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Graphs
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (200, 'Number of Islands', 'number-of-islands', 'Graphs', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (133, 'Clone Graph', 'clone-graph', 'Graphs', 'Medium', ARRAY['Amazon','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (695, 'Max Area of Island', 'max-area-of-island', 'Graphs', 'Medium', ARRAY['Amazon','Google','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (417, 'Pacific Atlantic Water Flow', 'pacific-atlantic-water-flow', 'Graphs', 'Medium', ARRAY['Amazon','Google','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (130, 'Surrounded Regions', 'surrounded-regions', 'Graphs', 'Medium', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (994, 'Rotting Oranges', 'rotting-oranges', 'Graphs', 'Medium', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (207, 'Course Schedule', 'course-schedule', 'Graphs', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (210, 'Course Schedule II', 'course-schedule-ii', 'Graphs', 'Medium', ARRAY['Amazon','Google','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (684, 'Redundant Connection', 'redundant-connection', 'Graphs', 'Medium', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (323, 'Number of Connected Components in an Undirected Graph', 'number-of-connected-components-in-an-undirected-graph', 'Graphs', 'Medium', ARRAY['Amazon','Google','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (261, 'Graph Valid Tree', 'graph-valid-tree', 'Graphs', 'Medium', ARRAY['Amazon','Google','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (127, 'Word Ladder', 'word-ladder', 'Graphs', 'Hard', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Advanced Graphs
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (332, 'Reconstruct Itinerary', 'reconstruct-itinerary', 'Advanced Graphs', 'Hard', ARRAY['Amazon','Google','Uber']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (1584, 'Min Cost to Connect All Points', 'min-cost-to-connect-all-points', 'Advanced Graphs', 'Medium', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (743, 'Network Delay Time', 'network-delay-time', 'Advanced Graphs', 'Medium', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (787, 'Cheapest Flights Within K Stops', 'cheapest-flights-within-k-stops', 'Advanced Graphs', 'Medium', ARRAY['Amazon','Google','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (269, 'Alien Dictionary', 'alien-dictionary', 'Advanced Graphs', 'Hard', ARRAY['Amazon','Google','Meta','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (778, 'Swim in Rising Water', 'swim-in-rising-water', 'Advanced Graphs', 'Hard', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- 1-D Dynamic Programming
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (70, 'Climbing Stairs', 'climbing-stairs', '1-D Dynamic Programming', 'Easy', ARRAY['Amazon','Google','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (746, 'Min Cost Climbing Stairs', 'min-cost-climbing-stairs', '1-D Dynamic Programming', 'Easy', ARRAY['Amazon','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (198, 'House Robber', 'house-robber', '1-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (213, 'House Robber II', 'house-robber-ii', '1-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (5, 'Longest Palindromic Substring', 'longest-palindromic-substring', '1-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (647, 'Palindromic Substrings', 'palindromic-substrings', '1-D Dynamic Programming', 'Medium', ARRAY['Amazon','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (91, 'Decode Ways', 'decode-ways', '1-D Dynamic Programming', 'Medium', ARRAY['Amazon','Meta','Microsoft','Goldman Sachs']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (322, 'Coin Change', 'coin-change', '1-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (152, 'Maximum Product Subarray', 'maximum-product-subarray', '1-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (139, 'Word Break', 'word-break', '1-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (300, 'Longest Increasing Subsequence', 'longest-increasing-subsequence', '1-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (416, 'Partition Equal Subset Sum', 'partition-equal-subset-sum', '1-D Dynamic Programming', 'Medium', ARRAY['Amazon','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- 2-D Dynamic Programming
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (62, 'Unique Paths', 'unique-paths', '2-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (1143, 'Longest Common Subsequence', 'longest-common-subsequence', '2-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (309, 'Best Time to Buy and Sell Stock with Cooldown', 'best-time-to-buy-and-sell-stock-with-cooldown', '2-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (518, 'Coin Change II', 'coin-change-ii', '2-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (494, 'Target Sum', 'target-sum', '2-D Dynamic Programming', 'Medium', ARRAY['Amazon','Meta','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (97, 'Interleaving String', 'interleaving-string', '2-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (329, 'Longest Increasing Path in a Matrix', 'longest-increasing-path-in-a-matrix', '2-D Dynamic Programming', 'Hard', ARRAY['Amazon','Google','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (115, 'Distinct Subsequences', 'distinct-subsequences', '2-D Dynamic Programming', 'Hard', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (72, 'Edit Distance', 'edit-distance', '2-D Dynamic Programming', 'Medium', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (312, 'Burst Balloons', 'burst-balloons', '2-D Dynamic Programming', 'Hard', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (10, 'Regular Expression Matching', 'regular-expression-matching', '2-D Dynamic Programming', 'Hard', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Greedy
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (53, 'Maximum Subarray', 'maximum-subarray', 'Greedy', 'Medium', ARRAY['Amazon','Google','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (55, 'Jump Game', 'jump-game', 'Greedy', 'Medium', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (45, 'Jump Game II', 'jump-game-ii', 'Greedy', 'Medium', ARRAY['Amazon','Google','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (134, 'Gas Station', 'gas-station', 'Greedy', 'Medium', ARRAY['Amazon','Google','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (846, 'Hand of Straights', 'hand-of-straights', 'Greedy', 'Medium', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (1899, 'Merge Triplets to Form Target Triplet', 'merge-triplets-to-form-target-triplet', 'Greedy', 'Medium', ARRAY['Amazon']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (763, 'Partition Labels', 'partition-labels', 'Greedy', 'Medium', ARRAY['Amazon','Google','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (678, 'Valid Parenthesis String', 'valid-parenthesis-string', 'Greedy', 'Medium', ARRAY['Amazon','Google','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Intervals
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (57, 'Insert Interval', 'insert-interval', 'Intervals', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (56, 'Merge Intervals', 'merge-intervals', 'Intervals', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (435, 'Non-overlapping Intervals', 'non-overlapping-intervals', 'Intervals', 'Medium', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (252, 'Meeting Rooms', 'meeting-rooms', 'Intervals', 'Easy', ARRAY['Amazon','Google','Meta','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (253, 'Meeting Rooms II', 'meeting-rooms-ii', 'Intervals', 'Medium', ARRAY['Amazon','Google','Meta','Bloomberg','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (1851, 'Minimum Interval to Include Each Query', 'minimum-interval-to-include-each-query', 'Intervals', 'Hard', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Math & Geometry
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (48, 'Rotate Image', 'rotate-image', 'Math & Geometry', 'Medium', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (54, 'Spiral Matrix', 'spiral-matrix', 'Math & Geometry', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (73, 'Set Matrix Zeroes', 'set-matrix-zeroes', 'Math & Geometry', 'Medium', ARRAY['Amazon','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (202, 'Happy Number', 'happy-number', 'Math & Geometry', 'Easy', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (66, 'Plus One', 'plus-one', 'Math & Geometry', 'Easy', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (50, 'Pow(x, n)', 'powx-n', 'Math & Geometry', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (43, 'Multiply Strings', 'multiply-strings', 'Math & Geometry', 'Medium', ARRAY['Amazon','Google','Meta','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (2013, 'Detect Squares', 'detect-squares', 'Math & Geometry', 'Medium', ARRAY['Amazon','Google']) ON CONFLICT (leetcode_number) DO NOTHING;

-- =============================================
-- Bit Manipulation
-- =============================================
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (136, 'Single Number', 'single-number', 'Bit Manipulation', 'Easy', ARRAY['Amazon','Google','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (191, 'Number of 1 Bits', 'number-of-1-bits', 'Bit Manipulation', 'Easy', ARRAY['Amazon','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (338, 'Counting Bits', 'counting-bits', 'Bit Manipulation', 'Easy', ARRAY['Amazon','Microsoft']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (190, 'Reverse Bits', 'reverse-bits', 'Bit Manipulation', 'Easy', ARRAY['Amazon','Microsoft','Apple']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (268, 'Missing Number', 'missing-number', 'Bit Manipulation', 'Easy', ARRAY['Amazon','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (371, 'Sum of Two Integers', 'sum-of-two-integers', 'Bit Manipulation', 'Medium', ARRAY['Amazon','Meta']) ON CONFLICT (leetcode_number) DO NOTHING;
INSERT INTO questions (leetcode_number, title, slug, topic, difficulty, companies) VALUES (7, 'Reverse Integer', 'reverse-integer', 'Bit Manipulation', 'Medium', ARRAY['Amazon','Google','Microsoft','Bloomberg']) ON CONFLICT (leetcode_number) DO NOTHING;
