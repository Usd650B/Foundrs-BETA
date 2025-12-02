-- Fix goals table to ensure proper structure
drop table if exists public.goals cascade;

-- Create goals table
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_text text not null,
  date text not null,
  completed boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.goals enable row level security;

-- Create policies
create policy "Users can view all goals"
  on public.goals for select
  using (true);

create policy "Users can insert their own goals"
  on public.goals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own goals"
  on public.goals for update
  using (auth.uid() = user_id);

create policy "Users can delete their own goals"
  on public.goals for delete
  using (auth.uid() = user_id);

-- Create trigger for updated_at
create or replace function public.handle_updated_at_goals()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger on_goals_updated
  before update on public.goals
  for each row execute function public.handle_updated_at_goals();

-- Create indexes
create index on public.goals(user_id);
create index on public.goals(date);
create index on public.goals(created_at);
