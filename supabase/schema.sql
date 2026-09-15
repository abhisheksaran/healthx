create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null, day text not null check (day in ('PUSH','PULL','LEGS','UPPER','LOWER')),
  exercise text not null, weight numeric not null check (weight >= 0), reps integer[] not null,
  rir integer check (rir between 0 and 5), created_at timestamptz not null default now()
);
create table if not exists public.bodyweight_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date, weight numeric not null check (weight > 0), created_at timestamptz not null default now()
);
alter table public.workout_logs enable row level security;
alter table public.bodyweight_entries enable row level security;
create policy "Users can manage their workout logs" on public.workout_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their bodyweight" on public.bodyweight_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists workout_logs_user_date_idx on public.workout_logs(user_id, date desc);
create index if not exists bodyweight_user_date_idx on public.bodyweight_entries(user_id, date desc);
