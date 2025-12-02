alter table public.goals
  add column if not exists join_limit smallint default 3 check (join_limit between 1 and 10),
  add column if not exists join_current_count smallint default 0 check (join_current_count >= 0);

do $$
begin
  alter table public.goals
    add constraint goals_join_count_limit
    check (join_current_count <= join_limit);
exception
  when duplicate_object then null;
end $$;

update public.goals
  set join_limit = coalesce(join_limit, 3),
      join_current_count = coalesce(join_current_count, 0);
