-- SDLC step tracking per project
CREATE TABLE IF NOT EXISTS project_sdlc_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  step_key TEXT NOT NULL, -- onboarding | create_project | planning | design | development | testing | uat | deployment
  status TEXT DEFAULT 'pending', -- pending | in_progress | done
  pending_actions TEXT[] DEFAULT '{}',
  artifacts JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, step_key)
);

ALTER TABLE project_sdlc_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select SDLC steps for their projects" ON project_sdlc_steps
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_sdlc_steps.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can upsert SDLC steps for their projects" ON project_sdlc_steps
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_sdlc_steps.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update SDLC steps for their projects" ON project_sdlc_steps
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_sdlc_steps.project_id AND projects.user_id = auth.uid())
  );

-- Indexing configuration (cron and source info)
CREATE TABLE IF NOT EXISTS project_indexing_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  mode TEXT DEFAULT 'repo', -- repo | folder
  source_url TEXT,
  source_path TEXT,
  cron_hours INTEGER DEFAULT 24,
  growth_threshold INTEGER DEFAULT 50,
  last_indexed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id)
);

ALTER TABLE project_indexing_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select indexing configs for their projects" ON project_indexing_configs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_indexing_configs.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can upsert indexing configs for their projects" ON project_indexing_configs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_indexing_configs.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update indexing configs for their projects" ON project_indexing_configs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_indexing_configs.project_id AND projects.user_id = auth.uid())
  );

-- Notification settings (bugs + summaries/insights)
CREATE TABLE IF NOT EXISTS project_notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  bug_recipients TEXT[] DEFAULT '{}',
  insight_recipients TEXT[] DEFAULT '{}',
  summary_interval_days INTEGER DEFAULT 7, -- days or multiples of 7 for weeks
  send_insights BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id)
);

ALTER TABLE project_notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select notification settings for their projects" ON project_notification_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_notification_settings.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can upsert notification settings for their projects" ON project_notification_settings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_notification_settings.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update notification settings for their projects" ON project_notification_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_notification_settings.project_id AND projects.user_id = auth.uid())
  );

