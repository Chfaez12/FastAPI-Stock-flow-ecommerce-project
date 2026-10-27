-- Storage policies for the "product-images" bucket.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- The bucket is public, so anyone can view images. Only users whose role is BUSINESS in the
-- app's own public.users table may upload, replace or delete them. The role is read from
-- public.users rather than auth user_metadata, because users can edit their own metadata.
-- (Not needed if the backend has SUPABASE_SERVICE_ROLE_KEY set; the service key bypasses RLS.)

create or replace function public.is_business_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()::text
      and u.role = 'BUSINESS'
      and u.is_active
  );
$$;

revoke all on function public.is_business_user() from public;
grant execute on function public.is_business_user() to authenticated;

drop policy if exists "product images: business can upload" on storage.objects;
create policy "product images: business can upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_business_user());

drop policy if exists "product images: business can update" on storage.objects;
create policy "product images: business can update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_business_user())
  with check (bucket_id = 'product-images' and public.is_business_user());

drop policy if exists "product images: business can delete" on storage.objects;
create policy "product images: business can delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_business_user());

-- Deleting requires the row to be readable; public buckets serve files without this,
-- but the API's remove() call needs SELECT on the object rows.
drop policy if exists "product images: business can read rows" on storage.objects;
create policy "product images: business can read rows"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and public.is_business_user());
