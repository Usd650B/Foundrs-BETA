alter table notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;
