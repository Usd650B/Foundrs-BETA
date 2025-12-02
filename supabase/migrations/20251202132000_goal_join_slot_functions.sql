create or replace function public.reserve_goal_join_slot(goal_uuid uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  updated boolean;
begin
  update public.goals
  set join_current_count = join_current_count + 1
  where id = goal_uuid
    and join_current_count < coalesce(join_limit, 10)
    and join_current_count < 10;

  updated := found;
  return updated;
end;
$$;

create or replace function public.release_goal_join_slot(goal_uuid uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.goals
  set join_current_count = greatest(join_current_count - 1, 0)
  where id = goal_uuid;
end;
$$;
