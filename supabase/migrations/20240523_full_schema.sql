-- 1. Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  plan_type TEXT DEFAULT 'free',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'SETUP', -- SETUP, ACTIVE, IDLE, ERROR
  repository_url TEXT,
  branch TEXT DEFAULT 'main',
  last_deploy_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- 3. Environments Table
CREATE TABLE IF NOT EXISTS environments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., Staging, Production
  status TEXT DEFAULT 'IDLE', -- RUNNING, IDLE, DOWN
  url TEXT,
  last_deployed_at TIMESTAMPTZ
);

ALTER TABLE environments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own environments" ON environments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = environments.project_id AND projects.user_id = auth.uid())
  );

-- 4. Pipeline Runs (SDLC)
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  branch TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- Push, Manual, Schedule
  status TEXT DEFAULT 'RUNNING', -- RUNNING, COMPLETED, FAILED
  duration TEXT, -- e.g., "5m 30s"
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pipeline runs for their projects" ON pipeline_runs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = pipeline_runs.project_id AND projects.user_id = auth.uid())
  );

CREATE POLICY "Users can insert pipeline runs for their projects" ON pipeline_runs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = pipeline_runs.project_id AND projects.user_id = auth.uid())
  );

-- 5. Pipeline Stages (Plan, Code, Test, Deploy)
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID REFERENCES pipeline_runs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  duration TEXT,
  order_index INTEGER NOT NULL
);

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pipeline stages" ON pipeline_stages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pipeline_runs 
      JOIN projects ON projects.id = pipeline_runs.project_id 
      WHERE pipeline_runs.id = pipeline_stages.run_id AND projects.user_id = auth.uid()
    )
  );

-- 6. Test Results (For Testing Dashboard)
CREATE TABLE IF NOT EXISTS test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  test_id TEXT NOT NULL, -- e.g., TC_Auth_001
  module TEXT,
  scenario TEXT,
  status TEXT, -- PASSED, FAILED, PENDING, RUNNING
  duration TEXT,
  source TEXT DEFAULT 'Auto-gen',
  last_run_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view test results" ON test_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = test_results.project_id AND projects.user_id = auth.uid())
  );

-- 7. Update Integrations Config to use user_id (Optional migration if table already exists, or recreate)
-- For now, we keep the previous table but if we wanted to link it:
-- ALTER TABLE integrations_config ADD COLUMN user_id UUID REFERENCES auth.users(id);
-- UPDATE integrations_config SET user_id = auth.uid(); 
-- (The above is tricky in SQL script without context, so we will stick to the current implementation for integrations or assume it's global for this demo/MVP)

-- Function to handle new user creation (automatically create profile)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

