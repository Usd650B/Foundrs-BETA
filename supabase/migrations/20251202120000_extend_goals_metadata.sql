-- Add richer metadata fields to goals to support advanced characteristics
alter table public.goals
  add column if not exists due_at timestamptz,
  add column if not exists priority text check (priority in ('low','medium','high','critical')) default 'medium',
  add column if not exists success_metric text,
  add column if not exists blockers text,
  add column if not exists motivation text;

-- Backfill existing rows with defaults
update public.goals
set priority = coalesce(priority, 'medium');
