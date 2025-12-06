import { createClient } from '@supabase/supabase-js';

// Types
export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: 'SETUP' | 'ACTIVE' | 'IDLE' | 'ERROR';
  repository_url?: string | null;
  branch?: string | null;
  last_deploy_at?: string | null;
  created_at?: string;
}

export interface Environment {
  id: string;
  project_id: string;
  name: string;
  status: 'RUNNING' | 'IDLE' | 'DOWN';
  url?: string | null;
  description?: string | null;
  last_deployed_at?: string | null;
}

export interface PipelineRun {
  id: string;
  project_id: string;
  branch: string;
  trigger_event: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  duration?: string | null;
  started_at?: string | null;
  created_at?: string | null;
}

export interface PipelineStage {
  id: string;
  run_id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: string | null;
  order_index: number;
}

export interface Script {
  id: string;
  project_id: string;
  name: string;
  kind: 'build' | 'test' | 'deploy' | 'custom';
  content?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScriptRun {
  id: string;
  project_id: string;
  script_id?: string | null;
  status: 'pending' | 'running' | 'success' | 'failed';
  logs?: string | null;
  duration?: string | null;
  created_at?: string;
}

export interface IndexJob {
  id: string;
  project_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  branch?: string | null;
  commit_sha?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  message?: string | null;
  created_at?: string;
}

export interface TestResult {
  id: string;
  project_id: string;
  test_id: string;
  module?: string | null;
  scenario?: string | null;
  status: 'PASSED' | 'FAILED' | 'PENDING' | 'RUNNING';
  duration?: string | null;
  source?: string | null;
  last_run_at?: string | null;
  created_at?: string | null;
}

export type SdlcStepKey =
  | 'onboarding'
  | 'create_project'
  | 'planning'
  | 'design'
  | 'development'
  | 'testing'
  | 'uat'
  | 'deployment';

export interface ProjectSdlcStep {
  id: string;
  project_id: string;
  step_key: SdlcStepKey;
  status: 'pending' | 'in_progress' | 'done';
  pending_actions?: string[] | null;
  artifacts?: Record<string, any> | null;
  updated_at?: string | null;
}

export interface ProjectIndexingConfig {
  id: string;
  project_id: string;
  mode: 'repo' | 'folder';
  source_url?: string | null;
  source_path?: string | null;
  cron_hours?: number | null;
  growth_threshold?: number | null;
  last_indexed_at?: string | null;
  notes?: string | null;
}

export interface ProjectNotificationSettings {
  id: string;
  project_id: string;
  bug_recipients: string[];
  insight_recipients: string[];
  summary_interval_days: number;
  send_insights: boolean;
}

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company?: string | null;
  message: string;
  source?: string | null;
  created_at?: string | null;
}

export interface SubscriptionSignup {
  id: string;
  email: string;
  source?: string | null;
  created_at?: string | null;
}

export interface Profile {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  plan_type?: string | null;
  updated_at?: string | null;
}

export interface PipelineTemplate {
  id: string;
  project_id: string;
  stages: string[];
  updated_at?: string | null;
}

// Fallback to provided credentials if env vars are missing (prevents blank screen in dev)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://rslczxscrtvxbcesxlwp.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbGN6eHNjcnR2eGJjZXN4bHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NzM5OTUsImV4cCI6MjA4MDU0OTk5NX0.6T-DU9EtJmtWmJG3-bYW--JMwSzYQ9eyKOpXNsB3Z1s';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase credentials');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Projects
export async function listProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Project[];
}

export async function getProject(id: string) {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Project;
}

export async function createProject(payload: Partial<Project> & { name: string }) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error('No Supabase user session found. Please sign in.');
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: payload.name,
      description: payload.description,
      repository_url: payload.repository_url,
      branch: payload.branch || 'main',
      status: payload.status || 'SETUP',
      user_id: auth.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

// Environments
export async function listEnvironments(projectId: string) {
  const { data, error } = await supabase
    .from('environments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Environment[];
}

export async function createEnvironment(projectId: string, name: string, url?: string, description?: string) {
  const { data, error } = await supabase
    .from('environments')
    .insert({
      project_id: projectId,
      name,
      url,
      description,
      status: 'IDLE',
    })
    .select()
    .single();
  if (error) throw error;
  return data as Environment;
}

// Pipeline runs and stages
export async function listPipelineRuns(projectId: string) {
  const { data, error } = await supabase
    .from('pipeline_runs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as PipelineRun[];
}

export async function listPipelineStages(runId: string) {
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('run_id', runId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data as PipelineStage[];
}

const defaultStages = ['Plan', 'Design', 'Code', 'Build', 'Test', 'Deploy', 'Monitor'];

export async function createPipelineRun(projectId: string, branch: string, trigger_event: string) {
  const { data, error } = await supabase
    .from('pipeline_runs')
    .insert({
      project_id: projectId,
      branch,
      trigger_event,
      status: 'RUNNING',
    })
    .select()
    .single();
  if (error) throw error;
  const run = data as PipelineRun;

  // Seed stages
  const stageRows = defaultStages.map((name, idx) => ({
    run_id: run.id,
    name,
    order_index: idx,
    status: idx === 0 ? 'running' : 'pending',
  }));
  const { error: stageError } = await supabase.from('pipeline_stages').insert(stageRows);
  if (stageError) throw stageError;

  return run;
}

// Scripts
export async function listScripts(projectId: string) {
  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Script[];
}

export async function upsertScript(script: Partial<Script> & { project_id: string; name: string }) {
  const { data, error } = await supabase
    .from('scripts')
    .upsert(script)
    .select()
    .single();
  if (error) throw error;
  return data as Script;
}

export async function createScriptRun(projectId: string, scriptId?: string) {
  const { data, error } = await supabase
    .from('script_runs')
    .insert({
      project_id: projectId,
      script_id: scriptId,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data as ScriptRun;
}

export async function listScriptRuns(projectId: string) {
  const { data, error } = await supabase
    .from('script_runs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ScriptRun[];
}

// Indexing
export async function listIndexJobs(projectId: string) {
  const { data, error } = await supabase
    .from('index_jobs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as IndexJob[];
}

export async function createIndexJob(projectId: string, branch: string = 'main') {
  const { data, error } = await supabase
    .from('index_jobs')
    .insert({
      project_id: projectId,
      branch,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data as IndexJob;
}

// Testing
export async function listTestResults(projectId: string) {
  const { data, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as TestResult[];
}

export async function createTestResult(projectId: string, payload: Omit<TestResult, 'id' | 'project_id'>) {
  const { data, error } = await supabase
    .from('test_results')
    .insert({
      project_id: projectId,
      test_id: payload.test_id,
      module: payload.module,
      scenario: payload.scenario,
      status: payload.status,
      duration: payload.duration,
      source: payload.source,
      last_run_at: payload.last_run_at,
    })
    .select()
    .single();
  if (error) throw error;
  return data as TestResult;
}

// SDLC steps
export async function listSdlcSteps(projectId: string) {
  const { data, error } = await supabase
    .from('project_sdlc_steps')
    .select('*')
    .eq('project_id', projectId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data as ProjectSdlcStep[];
}

export async function upsertSdlcStep(payload: Partial<ProjectSdlcStep> & { project_id: string; step_key: SdlcStepKey }) {
  const { data, error } = await supabase
    .from('project_sdlc_steps')
    .upsert(
      {
        project_id: payload.project_id,
        step_key: payload.step_key,
        status: payload.status || 'in_progress',
        pending_actions: payload.pending_actions || [],
        artifacts: payload.artifacts || {},
      },
      { onConflict: 'project_id,step_key' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as ProjectSdlcStep;
}

// Indexing configuration
export async function getIndexingConfig(projectId: string) {
  const { data, error } = await supabase
    .from('project_indexing_configs')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data as ProjectIndexingConfig | null;
}

export async function upsertIndexingConfig(projectId: string, payload: Partial<ProjectIndexingConfig>) {
  const { data, error } = await supabase
    .from('project_indexing_configs')
    .upsert(
      {
        project_id: projectId,
        mode: payload.mode || 'repo',
        source_url: payload.source_url,
        source_path: payload.source_path,
        cron_hours: payload.cron_hours ?? 24,
        growth_threshold: payload.growth_threshold ?? 50,
        notes: payload.notes,
      },
      { onConflict: 'project_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as ProjectIndexingConfig;
}

// Notification settings
export async function getNotificationSettings(projectId: string) {
  const { data, error } = await supabase
    .from('project_notification_settings')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data as ProjectNotificationSettings | null;
}

export async function upsertNotificationSettings(
  projectId: string,
  payload: Partial<Omit<ProjectNotificationSettings, 'id' | 'project_id'>>
) {
  const { data, error } = await supabase
    .from('project_notification_settings')
    .upsert(
      {
        project_id: projectId,
        bug_recipients: payload.bug_recipients || [],
        insight_recipients: payload.insight_recipients || [],
        summary_interval_days: payload.summary_interval_days ?? 7,
        send_insights: payload.send_insights ?? true,
      },
      { onConflict: 'project_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as ProjectNotificationSettings;
}

// Marketing captures
export async function submitContactForm(payload: Omit<ContactSubmission, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('contact_submissions')
    .insert({
      name: payload.name,
      email: payload.email,
      company: payload.company,
      message: payload.message,
      source: payload.source || 'landing',
    })
    .select()
    .single();

  if (error) throw error;
  return data as ContactSubmission;
}

export async function submitSubscription(email: string, source: string = 'landing') {
  const { data, error } = await supabase
    .from('subscription_signups')
    .upsert(
      { email, source },
      { onConflict: 'email' }
    )
    .select()
    .single();

  if (error) throw error;
  return data as SubscriptionSignup;
}

// Pipeline template (stage ordering)
export async function getPipelineTemplate(projectId: string) {
  const { data, error } = await supabase
    .from('pipeline_templates')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data as PipelineTemplate | null;
}

export async function savePipelineTemplate(projectId: string, stages: string[]) {
  const { data, error } = await supabase
    .from('pipeline_templates')
    .upsert(
      {
        project_id: projectId,
        stages,
      },
      { onConflict: 'project_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data as PipelineTemplate;
}

// Profile & Storage
export async function getProfile() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .single();
    
  if (error) {
    console.warn('Error fetching profile:', error);
    return null; 
  }
  return data as Profile;
}

export async function updateProfile(payload: Partial<Profile>) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Not logged in');

  // Some environments block PATCH via CORS; use upsert (POST) to avoid method issues.
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: auth.user.id, ...payload }, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function uploadAvatar(file: File) {
  // Ensure the user is authenticated before uploading
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  const user = sessionData.session?.user;
  if (!user) {
    throw new Error('Not logged in');
  }

  // Ensure bucket exists (client-side best effort; server migration is recommended)
  try {
    const { data: bucket, error: bucketErr } = await supabase.storage.getBucket('avatars');
    if (!bucket && !bucketErr) {
      await supabase.storage.createBucket('avatars', { public: true });
    }
  } catch (err) {
    console.warn('Could not verify/create avatars bucket (client-side)', err);
  }

  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${user.id}-${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${user.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/octet-stream',
    });

  if (uploadError) {
    // Give clearer guidance when the bucket/policies are missing
    if (uploadError.message?.toLowerCase().includes('bucket')) {
      throw new Error('Avatar storage bucket is missing. Run the avatars migration and check bucket policies.');
    }
    throw uploadError;
  }

  // Prefer a public URL; fall back to a long-lived signed URL if the bucket is private
  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
  if (publicUrlData?.publicUrl) {
    return publicUrlData.publicUrl;
  }

  const { data: signedUrlData, error: signedError } = await supabase.storage
    .from('avatars')
    .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year
  if (signedError || !signedUrlData?.signedUrl) {
    throw signedError || new Error('Unable to generate avatar URL');
  }
  return signedUrlData.signedUrl;
}

