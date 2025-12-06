-- Ensure integrations_config table exists (idempotent)
create table if not exists public.integrations_config (
    id uuid primary key default gen_random_uuid(),
    provider text not null,
    config jsonb not null default '{}'::jsonb,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (provider)
);

-- Trigger to keep updated_at fresh
create or replace function public.set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp on public.integrations_config;
create trigger set_timestamp
before update on public.integrations_config
for each row execute function public.set_timestamp();

-- Row Level Security
alter table public.integrations_config enable row level security;

-- Policies (demo-friendly; tighten for production)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Allow public read access (integrations_config)'
      and tablename = 'integrations_config'
  ) then
    create policy "Allow public read access (integrations_config)"
      on public.integrations_config
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'Allow public insert access (integrations_config)'
      and tablename = 'integrations_config'
  ) then
    create policy "Allow public insert access (integrations_config)"
      on public.integrations_config
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'Allow public update access (integrations_config)'
      and tablename = 'integrations_config'
  ) then
    create policy "Allow public update access (integrations_config)"
      on public.integrations_config
      for update
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'Allow public delete access (integrations_config)'
      and tablename = 'integrations_config'
  ) then
    create policy "Allow public delete access (integrations_config)"
      on public.integrations_config
      for delete
      to anon
      using (true);
  end if;
end$$;

-- Helpful index for provider lookups
create index if not exists idx_integrations_config_provider
  on public.integrations_config (provider);

