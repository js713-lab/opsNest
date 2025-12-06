-- Add authenticated role policies for integrations_config (idempotent)
alter table if exists public.integrations_config enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Allow auth read access (integrations_config)'
      and tablename = 'integrations_config'
  ) then
    create policy "Allow auth read access (integrations_config)"
      on public.integrations_config
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'Allow auth insert access (integrations_config)'
      and tablename = 'integrations_config'
  ) then
    create policy "Allow auth insert access (integrations_config)"
      on public.integrations_config
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'Allow auth update access (integrations_config)'
      and tablename = 'integrations_config'
  ) then
    create policy "Allow auth update access (integrations_config)"
      on public.integrations_config
      for update
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'Allow auth delete access (integrations_config)'
      and tablename = 'integrations_config'
  ) then
    create policy "Allow auth delete access (integrations_config)"
      on public.integrations_config
      for delete
      to authenticated
      using (true);
  end if;
end$$;

