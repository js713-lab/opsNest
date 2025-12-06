-- Add user scoping to integrations_config so each user has their own connections

alter table if exists integrations_config
  add column if not exists user_id uuid references auth.users(id);

-- Optional: enforce uniqueness per user + provider
do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'integrations_config_user_provider_idx'
  ) then
    create unique index integrations_config_user_provider_idx
      on integrations_config (user_id, provider);
  end if;
end$$;

-- RLS policies
alter table integrations_config enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Users select their integrations' and tablename = 'integrations_config'
  ) then
    create policy "Users select their integrations"
      on integrations_config
      for select
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Users upsert their integrations' and tablename = 'integrations_config'
  ) then
    create policy "Users upsert their integrations"
      on integrations_config
      for insert
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Users update their integrations' and tablename = 'integrations_config'
  ) then
    create policy "Users update their integrations"
      on integrations_config
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Users delete their integrations' and tablename = 'integrations_config'
  ) then
    create policy "Users delete their integrations"
      on integrations_config
      for delete
      using (user_id = auth.uid());
  end if;
end$$;

