-- Create notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('streak', 'reminder', 'like', 'comment', 'partner_request')),
  message text not null,
  read boolean default false,
  metadata jsonb,
  created_at timestamp with time zone default now() not null
);

-- Enable RLS on notifications
alter table public.notifications enable row level security;

-- Notifications policies
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can insert their own notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Function to create a notification
create or replace function public.create_notification(
  p_user_id uuid,
  p_type text,
  p_message text,
  p_metadata jsonb default null
) returns void as $$
begin
  insert into public.notifications (user_id, type, message, metadata)
  values (p_user_id, p_type, p_message, p_metadata);
end;
$$ language plpgsql security definer;

-- Function to mark notifications as read
create or replace function public.mark_notifications_read(
  p_user_id uuid,
  p_notification_id uuid default null
) returns void as $$
begin
  if p_notification_id is null then
    update public.notifications
    set read = true
    where user_id = p_user_id and read = false;
  else
    update public.notifications
    set read = true
    where id = p_notification_id and user_id = p_user_id;
  end if;
end;
$$ language plpgsql security definer;
