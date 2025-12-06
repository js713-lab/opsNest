-- Create avatars bucket (ignore if exists)
do $$
begin
  if not exists (
    select 1 from storage.buckets where id = 'avatars'
  ) then
    begin
      -- Newer signature (id, name, public, file_size_limit, allowed_mime_types, owner)
      perform storage.create_bucket('avatars', 'avatars', true, null::bigint, null::text[], null::uuid);
    exception
      when undefined_function then
        begin
          -- Common signature: (name text, public bool, file_size_limit bigint, allowed_mime_types text[])
          perform storage.create_bucket('avatars', 'avatars', true, null::bigint, null::text[]);
        exception
          when undefined_function then
            -- Older signature: (name text, public bool)
            begin
              perform storage.create_bucket('avatars', true);
            exception
              when others then
                -- Last resort: direct insert into storage.buckets
                insert into storage.buckets (id, name, public, created_at, updated_at)
                values ('avatars', 'avatars', true, now(), now())
                on conflict (id) do update set public = excluded.public, updated_at = now();
            end;
        end;
    end;
  end if;
end$$;

-- Public read for avatars
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Public read avatars' and tablename = 'objects'
  ) then
    create policy "Public read avatars"
    on storage.objects
    for select
    using (bucket_id = 'avatars');
  end if;
end$$;

-- Authenticated users can upload/update avatars
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Authenticated upload avatars' and tablename = 'objects'
  ) then
    create policy "Authenticated upload avatars"
    on storage.objects
    for insert
    with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Authenticated update avatars' and tablename = 'objects'
  ) then
    create policy "Authenticated update avatars"
    on storage.objects
    for update
    using (bucket_id = 'avatars' and auth.role() = 'authenticated')
    with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
  end if;
end$$;

