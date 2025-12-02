create index if not exists profiles_stage_updated_idx
  on public.profiles (founder_stage, updated_at desc);
