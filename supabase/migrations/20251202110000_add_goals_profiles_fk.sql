-- Ensure every user has a profile before adding the FK
insert into public.profiles (user_id, username)
select u.id, coalesce(u.email, concat('user-', u.id::text))
from auth.users u
where not exists (
  select 1 from public.profiles p where p.user_id = u.id
);

-- Add foreign key from goals.user_id to profiles.user_id to expose relationship
alter table public.goals
  add constraint goals_user_id_profiles_fkey
  foreign key (user_id)
  references public.profiles(user_id)
  on delete cascade;
