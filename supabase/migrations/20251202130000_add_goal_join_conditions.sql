alter table public.goals
  add column if not exists join_conditions text;
