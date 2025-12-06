-- Scripts table: stores generated/edited scripts per project
CREATE TABLE IF NOT EXISTS scripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  kind TEXT DEFAULT 'custom', -- build | test | deploy | custom
  content TEXT,
  notes TEXT
);

ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own scripts" ON scripts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = scripts.project_id AND projects.user_id = auth.uid())
  );

-- Script runs: history of executions
CREATE TABLE IF NOT EXISTS script_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending | running | success | failed
  logs TEXT,
  duration TEXT
);

ALTER TABLE script_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view script runs for their projects" ON script_runs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = script_runs.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can insert script runs for their projects" ON script_runs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = script_runs.project_id AND projects.user_id = auth.uid())
  );

-- Index jobs: tracks repo indexing runs
CREATE TABLE IF NOT EXISTS index_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending | running | completed | failed
  branch TEXT DEFAULT 'main',
  commit_sha TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  message TEXT
);

ALTER TABLE index_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view index jobs for their projects" ON index_jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = index_jobs.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can insert index jobs for their projects" ON index_jobs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = index_jobs.project_id AND projects.user_id = auth.uid())
  );


