-- Drop existing policies
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can view their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

-- Create simpler policies for avatars bucket
create policy "Anyone can upload avatars"
  on storage.objects for insert
  with check (bucket_id = 'avatars');

create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Anyone can update avatars"
  on storage.objects for update
  with check (bucket_id = 'avatars');

create policy "Anyone can delete avatars"
  on storage.objects for delete
  using (bucket_id = 'avatars');
