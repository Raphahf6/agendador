create or replace function app_private.storage_clinic_id(object_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_folder text;
begin
  first_folder := (storage.foldername(object_name))[1];

  if first_folder is null
    or first_folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  then
    return null;
  end if;

  return first_folder::uuid;
end;
$$;

revoke execute on function app_private.storage_clinic_id(text) from anon, public;
grant execute on function app_private.storage_clinic_id(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'horalis-media',
  'horalis-media',
  true,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "horalis_media_select_member" on storage.objects;
drop policy if exists "horalis_media_insert_admin" on storage.objects;
drop policy if exists "horalis_media_update_admin" on storage.objects;
drop policy if exists "horalis_media_delete_admin" on storage.objects;

create policy "horalis_media_select_member" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'horalis-media'
    and app_private.is_clinic_member(app_private.storage_clinic_id(name))
  );

create policy "horalis_media_insert_admin" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'horalis-media'
    and app_private.is_clinic_admin(app_private.storage_clinic_id(name))
  );

create policy "horalis_media_update_admin" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'horalis-media'
    and app_private.is_clinic_admin(app_private.storage_clinic_id(name))
  )
  with check (
    bucket_id = 'horalis-media'
    and app_private.is_clinic_admin(app_private.storage_clinic_id(name))
  );

create policy "horalis_media_delete_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'horalis-media'
    and app_private.is_clinic_admin(app_private.storage_clinic_id(name))
  );
