-- Fix RLS policies to allow proper access

-- Drop existing policies
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

-- Create more permissive policies for development
create policy "Users can view profiles"
  on public.profiles for select
  using (true);

create policy "Users can insert profiles"
  on public.profiles for insert
  with check (true);

create policy "Users can update profiles"
  on public.profiles for update
  using (true);

-- Also fix goals policies
drop policy if exists "Users can view all goals" on public.goals;
drop policy if exists "Users can insert their own goals" on public.goals;
drop policy if exists "Users can update their own goals" on public.goals;
drop policy if exists "Users can delete their own goals" on public.goals;

create policy "Users can view all goals"
  on public.goals for select
  using (true);

create policy "Users can insert goals"
  on public.goals for insert
  with check (true);

create policy "Users can update goals"
  on public.goals for update
  using (true);

create policy "Users can delete goals"
  on public.goals for delete
  using (true);
