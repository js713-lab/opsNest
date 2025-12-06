-- Allow users to insert their own profile row (needed when using upsert from the client)
alter table profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Users can insert their own profile' and tablename = 'profiles'
  ) then
    create policy "Users can insert their own profile"
      on profiles
      for insert
      with check (auth.uid() = id);
  end if;
end$$;

