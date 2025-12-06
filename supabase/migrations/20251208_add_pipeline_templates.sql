-- Pipeline templates let users persist custom stage ordering per project
create table if not exists pipeline_templates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade unique,
  stages text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table pipeline_templates enable row level security;

create policy "Users can select their pipeline templates" on pipeline_templates
  for select using (
    exists (select 1 from projects where projects.id = pipeline_templates.project_id and projects.user_id = auth.uid())
  );

create policy "Users can upsert their pipeline templates" on pipeline_templates
  for insert with check (
    exists (select 1 from projects where projects.id = pipeline_templates.project_id and projects.user_id = auth.uid())
  );

create policy "Users can update their pipeline templates" on pipeline_templates
  for update using (
    exists (select 1 from projects where projects.id = pipeline_templates.project_id and projects.user_id = auth.uid())
  );

