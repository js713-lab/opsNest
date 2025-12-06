create table if not exists public.sdlc_workflows (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null default 'SDLC workflow',
  view_mode text not null default 'workflow',
  data jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sdlc_workflows_project_unique on public.sdlc_workflows (project_id);

alter table public.sdlc_workflows enable row level security;

do $$
begin
  create policy "sdlc_workflows_select" on public.sdlc_workflows
    for select using (project_id in (select id from public.projects where user_id = auth.uid()));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "sdlc_workflows_insert" on public.sdlc_workflows
    for insert with check (project_id in (select id from public.projects where user_id = auth.uid()));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "sdlc_workflows_update" on public.sdlc_workflows
    for update using (project_id in (select id from public.projects where user_id = auth.uid()));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "sdlc_workflows_delete" on public.sdlc_workflows
    for delete using (project_id in (select id from public.projects where user_id = auth.uid()));
exception
  when duplicate_object then null;
end $$;

