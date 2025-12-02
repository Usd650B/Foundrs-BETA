-- Fix profiles table to match the expected schema
drop table if exists public.profiles cascade;

-- Create profiles table with correct schema
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  username text not null,
  avatar_url text,
  bio text,
  founder_stage text check (founder_stage in ('idea', 'mvp', 'early_revenue', 'scaling', 'established')),
  current_streak integer default 0,
  longest_streak integer default 0,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Create trigger for updated_at
create or replace function public.handle_updated_at_profiles()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at_profiles();

-- Create indexes
create index on public.profiles(user_id);
create index on public.profiles(username);

-- Create function to automatically create profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, username)
  values (new.id, new.email::text);
  return new;
end;
$$ language plpgsql security definer;
