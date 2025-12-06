-- Tech stacks per project
CREATE TABLE IF NOT EXISTS tech_stacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  version TEXT,
  source TEXT DEFAULT 'declared',
  confidence INTEGER DEFAULT 80,
  notes TEXT
);

ALTER TABLE tech_stacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tech stacks for their projects" ON tech_stacks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tech_stacks.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can insert tech stacks for their projects" ON tech_stacks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tech_stacks.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can update tech stacks for their projects" ON tech_stacks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tech_stacks.project_id AND projects.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tech_stacks.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can delete tech stacks for their projects" ON tech_stacks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = tech_stacks.project_id AND projects.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_tech_stacks_project_id ON tech_stacks(project_id);

