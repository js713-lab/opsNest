import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import SdlcWorkflowCanvas from '@/components/sdlc/SdlcWorkflowCanvas';
import { 
  createEnvironment,
  createIndexJob,
  createPipelineRun,
  createScriptRun,
  createTestResult,
  getProject,
  getIndexingConfig,
  getNotificationSettings,
  listSdlcSteps,
  listEnvironments,
  listIndexJobs,
  listPipelineRuns,
  listPipelineStages,
  listScripts,
  listTechStacks,
  listTestResults,
  ProjectIndexingConfig,
  ProjectNotificationSettings,
  Project,
  PipelineRun,
  PipelineStage,
  Environment,
  Script,
  TechStack,
  IndexJob,
  TestResult,
  ProjectSdlcStep,
  SdlcStepKey,
  upsertIndexingConfig,
  upsertNotificationSettings,
  upsertScript,
  upsertSdlcStep,
  getPipelineTemplate,
  savePipelineTemplate
} from '@/lib/supabase';
import { AlertCircle, Bell, CalendarClock, Clock, Eye, Folder, GitBranch, Github, Image, Mail, PlayCircle, RefreshCcw, Rocket, Send, Server, TerminalSquare, Wrench, Layers, Settings, BookOpen, Bug, Link2, Tag, FileText, X, ShieldCheck, Save, Copy } from 'lucide-react';
import { toast } from 'sonner';

type RunStagesMap = Record<string, PipelineStage[]>;
type Severity = 'critical' | 'high' | 'medium' | 'low';

type Finding = {
  id: string;
  title: string;
  source: string;
  status: string;
  severity: Severity;
  branch: string;
  createdAt: string;
  message: string;
  logsUrl?: string;
  cronRef?: string;
  tags: string[];
};

const MARKETPLACE_SUBMISSION_KEY = 'opsnestMarketplaceSubmissions';

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [pipelineRuns, setPipelineRuns] = useState<PipelineRun[]>([]);
  const [runStages, setRunStages] = useState<RunStagesMap>({});
  const [pipelineSaving, setPipelineSaving] = useState(false);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [techStacks, setTechStacks] = useState<TechStack[]>([]);
  const [indexJobs, setIndexJobs] = useState<IndexJob[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [sdlcSteps, setSdlcSteps] = useState<ProjectSdlcStep[]>([]);
  const [collapsedPhases, setCollapsedPhases] = useState<Record<string, boolean>>({});
  const [showSdlcDrawer, setShowSdlcDrawer] = useState(false);
  const [showCanvasDrawer, setShowCanvasDrawer] = useState(false);
  const sdlcPromptTemplate = `You are an SDLC assistant. Keep status short. For each phase:\n- Onboarding Setup: repo/folder linked, contacts, index config.\n- Create Projects: repo-linked (no uploads) or blank project (upload folder later); deliver project record and repo/folder association.\n- Planning / Requirements: Gantt, flows, use cases, docs, minutes, notes.\n- Design: DB design, low-fi UX, system architecture diagram.\n- Development: pipelines, code health, feature checklist.\n- Testing: cases, scenarios, results, bug queue; mention reruns.\n- UAT: scripts, sign-offs, rollout plan.\n- Deployment / Maintenance: env matrix, scripts, domains, backups, monitors.\nReturn concise bullets and call out blockers or missing artifacts.`;
  const [sdlcPrompt, setSdlcPrompt] = useState<string>(sdlcPromptTemplate);
  const handleCopySdlcPrompt = async () => {
    try {
      await navigator.clipboard.writeText(sdlcPrompt);
      toast.success('Prompt copied');
    } catch (err) {
      toast.error('Copy failed');
    }
  };
  const [indexingConfig, setIndexingConfig] = useState<ProjectIndexingConfig | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<ProjectNotificationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [logDrawerFinding, setLogDrawerFinding] = useState<Finding | null>(null);
  const [submitForm, setSubmitForm] = useState({
    title: '',
    severity: 'medium' as Severity,
    category: 'Bug',
    repoUrl: '',
    branch: '',
    commitSha: '',
    cronRef: '',
    logsUrl: '',
    reproSteps: '',
    expected: '',
    actual: '',
    impact: '',
    tags: '',
    contactEmail: '',
  });
  const forceDemoMode = import.meta.env.VITE_DEMO_MODE === 'true' || id === 'demo';
  const sdlcBlueprint = useMemo(() => {
    const template: { id: SdlcStepKey; name: string; summary: string; outputs: string }[] = [
      {
        id: 'onboarding',
        name: 'Onboarding Setup',
        summary: 'Connect repo/upload folder, set owners, enable indexing',
        outputs: 'Repo/folder linked · Contacts · Index config',
      },
      {
        id: 'create_project',
        name: 'Create Projects',
        summary: 'Repo-linked (no uploads) or blank project with folder upload',
        outputs: 'Project record · Repo/folder association',
      },
      {
        id: 'planning',
        name: 'Planning / Requirements',
        summary: 'Gantt, flows, use cases, docs, minutes, notes',
        outputs: 'Gantt · Flows · Use cases · Docs · Minutes',
      },
      {
        id: 'design',
        name: 'Design',
        summary: 'DB design, low-fi UX, system architecture diagrams',
        outputs: 'ERD · UX wireframes · System diagram',
      },
      {
        id: 'development',
        name: 'Development',
        summary: 'Code, reviews, pipelines, feature completeness',
        outputs: 'Pipelines · Code health · Feature checklist',
      },
      {
        id: 'testing',
        name: 'Testing',
        summary: 'Test cases, scenarios, bug cards, results, reruns',
        outputs: 'Cases · Scenarios · Results · Bug queue',
      },
      {
        id: 'uat',
        name: 'UAT',
        summary: 'User acceptance, sign-offs, rollout readiness',
        outputs: 'UAT scripts · Sign-offs · Rollout plan',
      },
      {
        id: 'deployment',
        name: 'Deployment / Maintenance',
        summary: 'Env, scripts, domains, servers, backups, monitoring',
        outputs: 'Env matrix · Scripts · Domains · Backups · Monitors',
      },
    ];
    const statusLabel = (status?: ProjectSdlcStep['status']) => {
      if (status === 'done') return 'Done';
      if (status === 'in_progress') return 'In progress';
      return 'Pending';
    };
    return template.map((row) => {
      const found = sdlcSteps.find((s) => s.step_key === row.id);
      return {
        ...row,
        status: statusLabel(found?.status),
      };
    });
  }, [sdlcSteps]);

  // Form state
  const [envName, setEnvName] = useState('Staging');
  const [envUrl, setEnvUrl] = useState('');
  const [envDescription, setEnvDescription] = useState('');
  const [showEnvForm, setShowEnvForm] = useState(false);
  const [scriptName, setScriptName] = useState('build.sh');
  const [scriptContent, setScriptContent] = useState('#!/usr/bin/env bash\nnpm ci\nnpm run build');
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [branch, setBranch] = useState('main');
  const [testName, setTestName] = useState('TC_smoke_001');
  const [testStatus, setTestStatus] = useState<'PASSED' | 'FAILED' | 'PENDING' | 'RUNNING'>('PASSED');
  const [indexMode, setIndexMode] = useState<'repo' | 'folder'>('repo');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [cronHours, setCronHours] = useState<number>(24);
  const [growthThreshold, setGrowthThreshold] = useState<number>(50);
  const [bugRecipientsInput, setBugRecipientsInput] = useState('');
  const [insightRecipientsInput, setInsightRecipientsInput] = useState('');
  const [summaryCadenceValue, setSummaryCadenceValue] = useState<number>(1);
  const [summaryCadenceUnit, setSummaryCadenceUnit] = useState<'days' | 'weeks'>('weeks');
  const [sendInsights, setSendInsights] = useState(true);
  const [testingView, setTestingView] = useState<'cards' | 'table'>('table');
  const [showTemplates, setShowTemplates] = useState(true);
  const [testSearch, setTestSearch] = useState('');
  const [testModuleFilter, setTestModuleFilter] = useState<string>('all');
  const [testStatusFilter, setTestStatusFilter] = useState<string>('all');
  const branchOptions = useMemo(() => {
    const set = new Set<string>();
    if (project?.branch) set.add(project.branch);
    pipelineRuns.forEach((r) => r.branch && set.add(r.branch));
    if (branch && !set.has(branch)) set.add(branch);
    if (set.size === 0) {
      return ['main', 'develop'];
    }
    return Array.from(set);
  }, [project?.branch, pipelineRuns, branch]);
  const tabs = useMemo(
    () => [
      { id: 'overview', label: 'Overview' },
      { id: 'sdlc', label: 'SDLC' },
      { id: 'indexing', label: 'Indexing' },
      { id: 'testing', label: 'Testing' },
      { id: 'settings', label: 'Settings' },
    ],
    []
  );
  const [activeTab, setActiveTab] = useState(() => {
    const initial = searchParams.get('tab');
    return tabs.find((t) => t.id === initial)?.id || 'overview';
  });

  useEffect(() => {
    const param = searchParams.get('tab');
    if (param && tabs.some((t) => t.id === param) && param !== activeTab) {
      setActiveTab(param);
    }
  }, [searchParams, tabs, activeTab]);

  const goToTab = (tabId: string) => {
    setActiveTab(tabId);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next, { replace: true });
  };

  const severityBadge = (sev: Severity) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const filteredTests = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    return testResults.filter((t) => {
      const matchesSearch =
        !q ||
        t.test_id.toLowerCase().includes(q) ||
        (t.scenario || '').toLowerCase().includes(q) ||
        (t.module || '').toLowerCase().includes(q);
      const matchesModule = testModuleFilter === 'all' || (t.module || '').toLowerCase() === testModuleFilter;
      const matchesStatus = testStatusFilter === 'all' || t.status === testStatusFilter;
      return matchesSearch && matchesModule && matchesStatus;
    });
  }, [testResults, testSearch, testModuleFilter, testStatusFilter]);

  const testModuleOptions = useMemo<string[]>(() => {
    const set = new Set<string>();
    testResults.forEach((t) => t.module && set.add((t.module as string).toLowerCase()));
    return Array.from(set);
  }, [testResults]);

  const addTemplateTests = () => {
    const pid = project?.id || 'demo';
    const templates: TestResult[] = [
      { id: crypto.randomUUID(), project_id: pid, test_id: 'TC_Auth_001', module: 'Authentication', scenario: 'Verify login with valid credentials', status: 'PASSED', duration: '1.2s', source: 'Auto-gen', created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), project_id: pid, test_id: 'TC_Auth_002', module: 'Authentication', scenario: 'Verify login with invalid password', status: 'FAILED', duration: '0.8s', source: 'Auto-gen', created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), project_id: pid, test_id: 'TC_Auth_003', module: 'Authentication', scenario: 'Verify password reset flow', status: 'PENDING', duration: '2.1s', source: 'Auto-gen', created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), project_id: pid, test_id: 'TC_API_001', module: 'API Gateway', scenario: 'Verify GET /users endpoint', status: 'PASSED', duration: '0.3s', source: 'Auto-gen', created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), project_id: pid, test_id: 'TC_API_002', module: 'API Gateway', scenario: 'Verify POST /users endpoint validation', status: 'RUNNING', duration: '-', source: 'Auto-gen', created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), project_id: pid, test_id: 'TC_UI_001', module: 'Dashboard', scenario: 'Verify dashboard loads with user data', status: 'PENDING', duration: '3.4s', source: 'Auto-gen', created_at: new Date().toISOString() },
      { id: crypto.randomUUID(), project_id: pid, test_id: 'TC_Payment_001', module: 'Payment', scenario: 'Verify checkout flow completion', status: 'FAILED', duration: '5.2s', source: 'Auto-gen', created_at: new Date().toISOString() },
    ];
    setTestResults((prev) => [...templates, ...prev]);
  };

  const stepKeys: SdlcStepKey[] = [
    'onboarding',
    'create_project',
    'planning',
    'design',
    'development',
    'testing',
    'uat',
    'deployment',
  ];
  const planningActionItems = ['Gantt chart', 'Flow charts', 'Use cases & flows', 'Documentation badges', 'Meeting minutes', 'Notes'];
  const designActionItems = ['DB design', 'Low-fi UI/UX', 'System architecture diagram'];
  const testingActionItems = ['Test cases table', 'AI scenarios', 'Bug cards', 'Playwright results', 'UAT + testcases'];
  const deploymentActionItems = ['Environment matrix', 'Scripts', 'Domain + subdomain', 'Server', 'Backup', 'Monitoring'];
  const defaultCheckColumns = ['Images render & alt text', 'Dark mode', 'Translation/i18n', 'Mobile responsive', 'Accessibility', 'Performance'];
  const defaultModuleTemplates = [
    { title: 'Dark mode coverage', module: 'UI', scenario: 'Validate dark mode styles across key pages', status: 'PENDING' as TestResult['status'] },
    { title: 'Translation coverage', module: 'i18n', scenario: 'Verify locale switches and key strings', status: 'PENDING' as TestResult['status'] },
    { title: 'Mobile responsive', module: 'Responsive', scenario: 'Validate breakpoints and layout on mobile', status: 'PENDING' as TestResult['status'] },
    { title: 'Images + assets', module: 'Assets', scenario: 'Check images render, cdn links, fallbacks', status: 'PENDING' as TestResult['status'] },
  ];

  const ensureStepDefaults = (steps: ProjectSdlcStep[], projectId?: string) => {
    const map = new Map<SdlcStepKey, ProjectSdlcStep>();
    steps.forEach((s) => map.set(s.step_key, s));
    const filled: ProjectSdlcStep[] = [];
    stepKeys.forEach((key) => {
      const existing = map.get(key);
      filled.push(
        existing || {
          id: crypto.randomUUID(),
          project_id: projectId || project?.id || '',
          step_key: key,
          status: 'pending',
          pending_actions: [],
          artifacts: {},
          updated_at: new Date().toISOString(),
        }
      );
    });
    return filled;
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      if (forceDemoMode) {
        setIsDemo(true);
        setError('Demo mode: sample data is local only. Connect Supabase to persist changes.');
        seedDemo(id);
        setLoading(false);
        return;
      }

      try {
        const proj = await getProject(id);
        setProject(proj);

        const [runs, envs, scrs, techs, idxJobs, tests, steps, idxCfg, notifCfg, pipelineTemplate] = await Promise.all([
          listPipelineRuns(id),
          listEnvironments(id),
          listScripts(id),
          listTechStacks(id),
          listIndexJobs(id),
          listTestResults(id),
          listSdlcSteps(id),
          getIndexingConfig(id),
          getNotificationSettings(id),
          getPipelineTemplate(id)
        ]);
        setPipelineRuns(runs);
        setEnvironments(envs);
        setScripts(scrs);
        setTechStacks(techs);
        setIndexJobs(idxJobs);
        setTestResults(tests);
        setSdlcSteps(ensureStepDefaults(steps || [], proj.id));
        if (idxCfg) {
          setIndexingConfig(idxCfg);
          setIndexMode((idxCfg.mode as 'repo' | 'folder') || 'repo');
          setSourceUrl(idxCfg.source_url || '');
          setSourcePath(idxCfg.source_path || '');
          setCronHours(idxCfg.cron_hours ?? 24);
          setGrowthThreshold(idxCfg.growth_threshold ?? 50);
        }
        if (notifCfg) {
          setNotificationSettings(notifCfg);
          setBugRecipientsInput((notifCfg.bug_recipients || []).join(', '));
          setInsightRecipientsInput((notifCfg.insight_recipients || []).join(', '));
          const days = notifCfg.summary_interval_days ?? 7;
          if (days % 7 === 0) {
            setSummaryCadenceUnit('weeks');
            setSummaryCadenceValue(days / 7);
          } else {
            setSummaryCadenceUnit('days');
            setSummaryCadenceValue(days);
          }
          setSendInsights(notifCfg.send_insights ?? true);
        }

        const stagesMap: RunStagesMap = {};
        for (const run of runs) {
          stagesMap[run.id] = await listPipelineStages(run.id);
        }
        setRunStages(stagesMap);
        if (pipelineTemplate?.stages?.length) {
          setPipelineOrder(pipelineTemplate.stages);
        }
      } catch (err) {
        console.warn('Demo mode enabled. Reason:', err);
        setIsDemo(true);
        setError('Demo mode: connect Supabase auth to persist changes.');
        seedDemo(id);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, forceDemoMode]);

  const seedDemo = (projectId: string) => {
    const demoProject: Project = {
      id: projectId,
      name: 'demo-project',
      status: 'ACTIVE',
      branch: 'main',
      description: 'Demo project (Supabase auth not configured)',
    };
    setProject(demoProject);

    const run: PipelineRun = {
      id: 'run-1',
      project_id: projectId,
      branch: 'main',
      trigger_event: 'Manual',
      status: 'RUNNING',
      duration: '8m 12s',
    };
    setPipelineRuns([run]);
    setRunStages({
      [run.id]: [
        { id: 'stage-1', run_id: run.id, name: 'Plan', status: 'completed', order_index: 0 },
        { id: 'stage-2', run_id: run.id, name: 'Design', status: 'completed', order_index: 1 },
        { id: 'stage-3', run_id: run.id, name: 'Code', status: 'completed', order_index: 2 },
        { id: 'stage-4', run_id: run.id, name: 'Build', status: 'running', order_index: 3 },
        { id: 'stage-5', run_id: run.id, name: 'Test', status: 'pending', order_index: 4 },
        { id: 'stage-6', run_id: run.id, name: 'Deploy', status: 'pending', order_index: 5 },
        { id: 'stage-7', run_id: run.id, name: 'Monitor', status: 'pending', order_index: 6 },
      ],
    });

    setEnvironments([
      { id: 'env-1', project_id: projectId, name: 'Staging', status: 'RUNNING', url: 'https://staging.demo.dev', last_deployed_at: new Date().toISOString() },
    ]);
    setScripts([
      { id: 'scr-1', project_id: projectId, name: 'build.sh', kind: 'build', content: '#!/usr/bin/env bash\nnpm ci\nnpm run build' },
    ]);
    setTechStacks([
      { id: 'stack-1', project_id: projectId, name: 'Next.js', category: 'frontend', version: '14.2', source: 'package.json', confidence: 96, notes: 'Detected from dependencies' },
      { id: 'stack-2', project_id: projectId, name: 'Node.js', category: 'runtime', version: '20.x', source: 'engines field', confidence: 92, notes: 'Pipeline uses Node 20' },
      { id: 'stack-3', project_id: projectId, name: 'Supabase', category: 'backend', version: 'edge', source: 'config', confidence: 88, notes: 'Auth + Postgres' },
    ]);
    setIndexJobs([
      { id: 'idx-1', project_id: projectId, status: 'running', branch: 'main', message: 'Indexing repo...', created_at: new Date().toISOString() },
    ]);
    setTestResults([
      { id: 't-1', project_id: projectId, test_id: 'TC_smoke_001', scenario: 'Landing page renders', status: 'PASSED', duration: '12s' },
    ]);
    const demoSteps: ProjectSdlcStep[] = [
      { id: crypto.randomUUID(), project_id: projectId, step_key: 'onboarding', status: 'in_progress', pending_actions: ['Connect repo'], artifacts: {} },
      { id: crypto.randomUUID(), project_id: projectId, step_key: 'create_project', status: 'done', pending_actions: ['Confirm repo link'], artifacts: {} },
      { id: crypto.randomUUID(), project_id: projectId, step_key: 'planning', status: 'in_progress', pending_actions: ['Add Gantt'], artifacts: { gantt: true } },
      { id: crypto.randomUUID(), project_id: projectId, step_key: 'design', status: 'pending', pending_actions: ['Upload ERD'], artifacts: {} },
      { id: crypto.randomUUID(), project_id: projectId, step_key: 'development', status: 'pending', pending_actions: ['Wire pipelines'], artifacts: {} },
      { id: crypto.randomUUID(), project_id: projectId, step_key: 'testing', status: 'in_progress', pending_actions: ['Add scenarios'], artifacts: {} },
      { id: crypto.randomUUID(), project_id: projectId, step_key: 'uat', status: 'pending', pending_actions: ['Collect sign-offs'], artifacts: {} },
      { id: crypto.randomUUID(), project_id: projectId, step_key: 'deployment', status: 'pending', pending_actions: ['Define rollback'], artifacts: {} },
    ];
    setSdlcSteps(ensureStepDefaults(demoSteps, projectId));
    const demoIndexCfg: ProjectIndexingConfig = {
      id: crypto.randomUUID(),
      project_id: projectId,
      mode: 'repo',
      source_url: 'https://github.com/demo/demo',
      source_path: null,
      cron_hours: 24,
      growth_threshold: 50,
      last_indexed_at: new Date().toISOString(),
      notes: 'Demo config',
    };
    setIndexingConfig(demoIndexCfg);
    setIndexMode('repo');
    setSourceUrl(demoIndexCfg.source_url || '');
    setSourcePath('');
    setCronHours(demoIndexCfg.cron_hours || 24);
    setGrowthThreshold(demoIndexCfg.growth_threshold || 50);
    const demoNotif: ProjectNotificationSettings = {
      id: crypto.randomUUID(),
      project_id: projectId,
      bug_recipients: ['bugs@example.com'],
      insight_recipients: ['insights@example.com'],
      summary_interval_days: 7,
      send_insights: true,
    };
    setNotificationSettings(demoNotif);
    setBugRecipientsInput(demoNotif.bug_recipients.join(', '));
    setInsightRecipientsInput(demoNotif.insight_recipients.join(', '));
    setSummaryCadenceUnit('weeks');
    setSummaryCadenceValue(1);
    setSendInsights(true);
  };

  const handleCreateEnv = async () => {
    if (!project) return;
    try {
      if (isDemo) {
        const env: Environment = {
          id: crypto.randomUUID(),
          project_id: project.id,
          name: envName,
          status: 'RUNNING',
          url: envUrl,
          description: envDescription,
        };
        setEnvironments((prev) => [...prev, env]);
      } else {
        const env = await createEnvironment(project.id, envName, envUrl, envDescription);
        setEnvironments((prev) => [...prev, env]);
      }
      setEnvName('Staging');
      setEnvUrl('');
      setEnvDescription('');
      setShowEnvForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create environment');
    }
  };

  const [pipelineOrder, setPipelineOrder] = useState<string[]>(['Plan', 'Design', 'Code', 'Build', 'Test', 'Deploy', 'Monitor']);

  const handleCreateRun = async () => {
    if (!project) return;
    try {
      let run: PipelineRun;
      if (isDemo) {
        run = {
          id: crypto.randomUUID(),
          project_id: project.id,
          branch,
          trigger_event: 'Manual',
          status: 'RUNNING',
          duration: '-',
        };
        setRunStages((prev) => ({
          ...prev,
          [run.id]: [
            { id: crypto.randomUUID(), run_id: run.id, name: 'Plan', status: 'running', order_index: 0 },
            { id: crypto.randomUUID(), run_id: run.id, name: 'Design', status: 'pending', order_index: 1 },
            { id: crypto.randomUUID(), run_id: run.id, name: 'Code', status: 'pending', order_index: 2 },
            { id: crypto.randomUUID(), run_id: run.id, name: 'Build', status: 'pending', order_index: 3 },
            { id: crypto.randomUUID(), run_id: run.id, name: 'Test', status: 'pending', order_index: 4 },
            { id: crypto.randomUUID(), run_id: run.id, name: 'Deploy', status: 'pending', order_index: 5 },
            { id: crypto.randomUUID(), run_id: run.id, name: 'Monitor', status: 'pending', order_index: 6 },
          ],
        }));
      } else {
        run = await createPipelineRun(project.id, branch, 'Manual');
      }
      setPipelineRuns((prev) => [run, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to start pipeline');
    }
  };

  const handleSelectScript = (id: string) => {
    if (!id) {
      setSelectedScriptId(null);
      setScriptName('build.sh');
      setScriptContent('#!/usr/bin/env bash\nnpm ci\nnpm run build');
      setEditMode(false);
      return;
    }
    const found = scripts.find((s) => s.id === id);
    if (found) {
      setSelectedScriptId(found.id);
      setScriptName(found.name);
      setScriptContent(found.content || '');
      setEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setSelectedScriptId(null);
    setScriptName('build.sh');
    setScriptContent('#!/usr/bin/env bash\nnpm ci\nnpm run build');
    setEditMode(false);
  };

  const handleSaveScript = async () => {
    if (!project) return;
    try {
      let saved: Script;
      if (isDemo) {
        saved = {
          id: crypto.randomUUID(),
          project_id: project.id,
          name: scriptName,
          kind: 'custom',
          content: scriptContent,
        };
      } else {
        saved = await upsertScript({
          project_id: project.id,
          name: scriptName,
          kind: 'custom',
          content: scriptContent,
        });
      }
      setScripts((prev) => {
        const exists = prev.find((s) => s.id === saved.id || s.name === saved.name);
        if (exists) {
          return prev.map((s) => (s.id === saved.id || s.name === saved.name ? saved : s));
        }
        return [saved, ...prev];
      });
      setSelectedScriptId(saved.id || null);
      setEditMode(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save script');
    }
  };

  const handleRunScript = async (scriptId?: string) => {
    if (!project) return;
    try {
      if (isDemo) {
        setError('Demo: script run recorded locally.');
      } else {
        await createScriptRun(project.id, scriptId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run script');
    }
  };

  const handleIndex = async () => {
    if (!project) return;
    try {
      let job: IndexJob;
      if (isDemo) {
        job = {
          id: crypto.randomUUID(),
          project_id: project.id,
          status: 'pending',
          branch,
          message: 'Demo index job queued',
          created_at: new Date().toISOString(),
        };
      } else {
        job = await createIndexJob(project.id, branch);
      }
      setIndexJobs((prev) => [job, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to queue index job');
    }
  };

  const handleAddTestResult = async () => {
    if (!project) return;
    try {
      let result: TestResult;
      if (isDemo) {
        result = {
          id: crypto.randomUUID(),
          project_id: project.id,
          test_id: testName,
          status: testStatus,
          scenario: 'Demo scenario',
          duration: '15s',
        };
      } else {
        result = await createTestResult(project.id, {
          test_id: testName,
          status: testStatus,
          scenario: 'Triggered from dashboard',
          duration: '15s',
          source: 'Dashboard',
          module: 'demo',
          last_run_at: new Date().toISOString(),
        });
      }
      setTestResults((prev) => [result, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Failed to add test result');
    }
  };

  const handleApplyTemplate = async (tmpl: { title: string; module: string; scenario: string; status: TestResult['status'] }) => {
    if (!project) return;
    setTestName(tmpl.title);
    setTestStatus(tmpl.status);
    try {
      if (isDemo) {
        const result: TestResult = {
          id: crypto.randomUUID(),
          project_id: project.id,
          test_id: tmpl.title,
          module: tmpl.module,
          scenario: tmpl.scenario,
          status: tmpl.status,
          duration: '-',
        };
        setTestResults((prev) => [result, ...prev]);
      } else {
        const saved = await createTestResult(project.id, {
          test_id: tmpl.title,
          module: tmpl.module,
          scenario: tmpl.scenario,
          status: tmpl.status,
          duration: '-',
          source: 'Template',
          last_run_at: new Date().toISOString(),
        });
        setTestResults((prev) => [saved, ...prev]);
      }
      toast.success('Template added to test list');
    } catch (err: any) {
      setError(err.message || 'Failed to apply template');
    }
  };

  const upsertStepState = async (stepKey: SdlcStepKey, next: Partial<ProjectSdlcStep>) => {
    if (!project) return;
    try {
      if (isDemo) {
        setSdlcSteps((prev) =>
          ensureStepDefaults(prev, project.id).map((step) =>
            step.step_key === stepKey ? { ...step, ...next } : step
          )
        );
        return;
      }
      const saved = await upsertSdlcStep({
        project_id: project.id,
        step_key: stepKey,
        status: (next.status as ProjectSdlcStep['status']) || 'in_progress',
        pending_actions: next.pending_actions,
        artifacts: next.artifacts,
      });
      setSdlcSteps((prev) =>
        ensureStepDefaults(prev, project.id).map((step) => (step.step_key === stepKey ? saved : step))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update SDLC step');
    }
  };

  const handleStepStatusChange = (stepKey: SdlcStepKey, status: ProjectSdlcStep['status']) => {
    const current = sdlcSteps.find((s) => s.step_key === stepKey);
    upsertStepState(stepKey, {
      ...current,
      status,
    });
  };

  const handleTogglePending = (stepKey: SdlcStepKey, action: string) => {
    const current = sdlcSteps.find((s) => s.step_key === stepKey);
    const actions = new Set(current?.pending_actions || []);
    if (actions.has(action)) {
      actions.delete(action);
    } else {
      actions.add(action);
    }
    upsertStepState(stepKey, {
      ...current,
      pending_actions: Array.from(actions),
    });
  };

  const handleSaveIndexingConfig = async () => {
    if (!project) return;
    try {
      const payload: Partial<ProjectIndexingConfig> = {
        mode: indexMode,
        source_url: sourceUrl || null,
        source_path: sourcePath || null,
        cron_hours: Number.isFinite(cronHours) ? cronHours : 24,
        growth_threshold: Number.isFinite(growthThreshold) ? growthThreshold : 50,
        notes: indexingConfig?.notes,
      };
      if (isDemo) {
        setIndexingConfig({
          id: indexingConfig?.id || crypto.randomUUID(),
          project_id: project.id,
          last_indexed_at: indexingConfig?.last_indexed_at,
          ...payload,
        } as ProjectIndexingConfig);
        toast.success('Saved indexing preferences (demo)');
      } else {
        const saved = await upsertIndexingConfig(project.id, payload);
        setIndexingConfig(saved);
        toast.success('Indexing settings saved');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save indexing settings');
    }
  };

  const handleSaveNotifications = async () => {
    if (!project) return;
    const bugRecipients = bugRecipientsInput
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    const insightRecipients = insightRecipientsInput
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    const intervalDays =
      summaryCadenceValue * (summaryCadenceUnit === 'weeks' ? 7 : 1) || (summaryCadenceUnit === 'weeks' ? 7 : 1);
    try {
      if (isDemo) {
        const demo: ProjectNotificationSettings = {
          id: notificationSettings?.id || crypto.randomUUID(),
          project_id: project.id,
          bug_recipients: bugRecipients,
          insight_recipients: insightRecipients,
          summary_interval_days: intervalDays,
          send_insights: sendInsights,
        };
        setNotificationSettings(demo);
        toast.success('Saved notification preferences (demo)');
        return;
      }
      const saved = await upsertNotificationSettings(project.id, {
        bug_recipients: bugRecipients,
        insight_recipients: insightRecipients,
        summary_interval_days: intervalDays,
        send_insights: sendInsights,
      });
      setNotificationSettings(saved);
      toast.success('Notification settings saved');
    } catch (err: any) {
      setError(err.message || 'Failed to save notifications');
    }
  };

  const findings = useMemo<Finding[]>(() => {
    const items: Finding[] = [];
    indexJobs.slice(0, 4).forEach((job, idx) => {
      items.push({
        id: `idx-${job.id}`,
        title: job.message || 'Index job update',
        source: 'Indexing',
        status: job.status || 'pending',
        severity: idx === 0 ? 'high' : 'medium',
        branch: job.branch || 'main',
        createdAt: job.created_at ? new Date(job.created_at).toLocaleString() : 'recent',
        message: job.message || 'Index job queued or running.',
        logsUrl: job.message?.includes('http') ? job.message : undefined,
        cronRef: 'Config: nightly',
        tags: ['indexing', 'repo'],
      });
    });

    testResults.slice(0, 4).forEach((tr) => {
      items.push({
        id: `test-${tr.id}`,
        title: tr.test_id || 'Test',
        source: 'Testing',
        status: tr.status,
        severity: tr.status === 'FAILED' ? 'high' : 'low',
        branch: project?.branch || 'main',
        createdAt: tr.last_run_at ? new Date(tr.last_run_at).toLocaleString() : 'recent',
        message: tr.scenario || 'Automated test result',
        logsUrl: undefined,
        cronRef: 'Per run',
        tags: ['tests'],
      });
    });

    if (items.length === 0) {
      return [
        {
          id: 'demo-finding-1',
          title: 'Cron-based code scan detects lint + type failures',
          source: 'Indexing',
          status: 'open',
          severity: 'medium',
          branch: 'main',
          createdAt: 'Just now',
          message: 'Scheduled scan flagged failing TS build on feature/ai-agent with 7 warnings.',
          logsUrl: '',
          cronRef: '0 */4 * * *',
          tags: ['cron', 'lint', 'types'],
        },
        {
          id: 'demo-finding-2',
          title: 'Playwright suite flaky on checkout flow',
          source: 'Testing',
          status: 'open',
          severity: 'high',
          branch: 'develop',
          createdAt: '2h ago',
          message: 'Checkout spec fails intermittently due to race when applying discounts.',
          logsUrl: '',
          cronRef: 'per PR',
          tags: ['playwright', 'flaky'],
        },
      ];
    }
    return items;
  }, [indexJobs, testResults, project]);

  const handleViewLogs = (finding: Finding) => {
    setLogDrawerFinding(finding);
  };

  const openSubmit = (finding?: Finding) => {
    setSubmitForm({
      title: finding?.title || 'Submit issue to marketplace',
      severity: finding?.severity || 'medium',
      category: finding?.source || 'Bug',
      repoUrl: project ? `https://github.com/${project.name}` : '',
      branch: finding?.branch || branch,
      commitSha: '',
      cronRef: finding?.cronRef || '',
      logsUrl: finding?.logsUrl || '',
      reproSteps: finding?.message || '',
      expected: '',
      actual: '',
      impact: '',
      tags: finding?.tags.join(', ') || '',
      contactEmail: '',
    });
    setShowSubmitModal(true);
  };

  const handleSubmitMarketplace = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const existing = (() => {
      try {
        return JSON.parse(localStorage.getItem(MARKETPLACE_SUBMISSION_KEY) || '[]');
      } catch {
        return [];
      }
    })() as any[];

    const parsedTags = submitForm.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const submission = {
      id: `SUB-${Date.now()}`,
      title: submitForm.title || 'Untitled submission',
      repo: submitForm.repoUrl || project?.name || 'unknown',
      branch: submitForm.branch || branch || 'main',
      category: submitForm.category || 'Bug',
      severity: submitForm.severity,
      status: 'open',
      tags: parsedTags,
      createdAt: 'just now',
      summary: submitForm.impact || submitForm.reproSteps || submitForm.expected || submitForm.actual || 'No summary provided.',
      logsUrl: submitForm.logsUrl || undefined,
      cronRef: submitForm.cronRef || undefined,
      author: project?.name || 'You',
    };

    localStorage.setItem(MARKETPLACE_SUBMISSION_KEY, JSON.stringify([submission, ...existing]));
    toast.success('Submitted to marketplace');
    setShowSubmitModal(false);
  };

  const currentRunStages = useMemo(() => {
    if (pipelineRuns.length === 0) return [];
    const latest = pipelineRuns[0];
    return runStages[latest.id] || [];
  }, [pipelineRuns, runStages]);

  const pipelineDisplay = useMemo(() => {
    if (currentRunStages.length > 0) {
      const map = new Map(currentRunStages.map((s) => [s.name, s]));
      return pipelineOrder
        .map((name, idx) => map.get(name) || { id: `${name}-${idx}`, name, status: 'pending', order_index: idx })
        .map((s, idx) => ({ ...s, order_index: idx }));
    }
    return pipelineOrder.map((name, idx) => ({ id: `${name}-${idx}`, name, status: 'pending', order_index: idx }));
  }, [currentRunStages, pipelineOrder]);

  const onPipelineDrag = (from: number, to: number) => {
    setPipelineOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSavePipelineOrder = async () => {
    if (!project) return;
    setPipelineSaving(true);
    try {
      await savePipelineTemplate(project.id, pipelineOrder);
      toast.success('Pipeline order saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save pipeline order');
    } finally {
      setPipelineSaving(false);
    }
  };

  const computedSdlcForProgress = useMemo(() => {
    const stageToStep: Record<string, SdlcStepKey> = {
      Plan: 'planning',
      Design: 'design',
      Code: 'development',
      Build: 'development',
      Test: 'testing',
      Deploy: 'deployment',
      Monitor: 'deployment',
    };

    const base = new Map<string, ProjectSdlcStep>();
    sdlcSteps.forEach((s) => base.set(s.step_key, s));

    const next: ProjectSdlcStep[] = ensureStepDefaults(sdlcSteps, project?.id);

    const stageStatusRank: Record<string, number> = {
      done: 3,
      in_progress: 2,
      pending: 1,
    };

    const applyStatus = (stepKey: SdlcStepKey, newStatus: ProjectSdlcStep['status']) => {
      const idx = next.findIndex((s) => s.step_key === stepKey);
      if (idx === -1) return;
      const existing = next[idx].status || 'pending';
      const rankExisting = stageStatusRank[existing] ?? 1;
      const rankNew = stageStatusRank[newStatus] ?? 1;
      if (rankNew >= rankExisting) {
        next[idx] = { ...next[idx], status: newStatus };
      }
    };

    currentRunStages.forEach((stage) => {
      const key = stageToStep[stage.name];
      if (!key) return;
      if (stage.status === 'completed') applyStatus(key, 'done');
      else if (stage.status === 'running') applyStatus(key, 'in_progress');
      else if (stage.status === 'failed') applyStatus(key, 'in_progress');
    });

    return next;
  }, [currentRunStages, sdlcSteps, project?.id, ensureStepDefaults]);

  const togglePhaseCollapse = (id: string) => {
    setCollapsedPhases((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const collapseAllPhases = () => {
    setCollapsedPhases(Object.fromEntries(sdlcBlueprint.map((p) => [p.id, true])));
  };

  const expandAllPhases = () => {
    setCollapsedPhases({});
  };

  const sdlcDrawerItems = useMemo(() => {
    const statusMap = new Map<string, string>();
    sdlcSteps.forEach((s) => statusMap.set(s.step_key, s.status || 'pending'));
    return [
      {
        id: 'onboarding',
        title: 'Onboarding Setup',
        status: statusMap.get('onboarding') || 'pending',
        summary: 'Connect repo or upload folder, set owners, enable indexing.',
        outputs: 'Repo/folder linked · Contacts · Index config',
      },
      {
        id: 'create_project',
        title: 'Create Projects',
        status: statusMap.get('create_project') || 'pending',
        summary: 'Create repo-linked (no uploads) or blank project (upload folder later).',
        outputs: 'Project record · Repo/folder association',
      },
      {
        id: 'planning',
        title: 'Planning / Requirements',
        status: statusMap.get('planning') || 'pending',
        summary: 'Gantt, flows, use cases, docs, minutes, notes in a planning workspace.',
        outputs: 'Gantt · Flows · Use cases · Docs · Minutes',
      },
      {
        id: 'design',
        title: 'Design',
        status: statusMap.get('design') || 'pending',
        summary: 'DB design, low-fi UX, and system architecture diagrams.',
        outputs: 'ERD · UX wireframes · System diagram',
      },
      {
        id: 'development',
        title: 'Development',
        status: statusMap.get('development') || 'pending',
        summary: 'Code, reviews, pipelines, feature completeness.',
        outputs: 'Pipelines · Code health · Feature checklist',
      },
      {
        id: 'testing',
        title: 'Testing',
        status: statusMap.get('testing') || 'pending',
        summary: 'Test cases, scenarios, bug cards, results, reruns.',
        outputs: 'Cases · Scenarios · Results · Bug queue',
      },
      {
        id: 'uat',
        title: 'UAT',
        status: statusMap.get('uat') || 'pending',
        summary: 'User acceptance, sign-offs, rollout readiness.',
        outputs: 'UAT scripts · Sign-offs · Rollout plan',
      },
      {
        id: 'deployment',
        title: 'Deployment / Maintenance',
        status: statusMap.get('deployment') || 'pending',
        summary: 'Environments, scripts, domains, servers, backups, monitoring.',
        outputs: 'Env matrix · Scripts · Domains · Backups · Monitors',
      },
    ];
  }, [sdlcSteps]);

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading project...</div>;
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 flex items-center gap-2">
          <AlertCircle size={16} />
          Project not found. <button className="underline" onClick={() => navigate('/dashboard/projects')}>Back to Projects</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Project</p>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && <p className="text-muted-foreground">{project.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard/projects')}>Back</Button>
            <Button className="bg-black text-white hover:bg-slate-900" onClick={handleCreateRun}><PlayCircle className="mr-2 h-4 w-4" /> Run pipeline</Button>
          </div>
        </div>
        {error && (
          <div className="inline-flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={(val) => {
        setActiveTab(val);
        const next = new URLSearchParams(searchParams);
        next.set('tab', val);
        setSearchParams(next, { replace: true });
      }} className="space-y-6">
        <TabsList className="sticky top-[56px] z-20 w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 bg-white shadow-sm border border-border/80 rounded-2xl p-3 min-h-[64px] items-center">
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={`w-full rounded-lg px-3 py-2 text-sm font-medium justify-center transition-all ${
                activeTab === tab.id
                  ? 'bg-black text-white border border-black shadow-lg'
                  : 'border border-transparent bg-white/70 text-muted-foreground shadow-[inset_0_0_0_1px_rgba(0,0,0,0.02)] hover:border-border/60 hover:bg-white'
              }`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard title="Branch" value={project.branch || 'main'} icon={<GitBranch size={16} />} />
            <InfoCard title="Status" value={project.status} icon={<Rocket size={16} />} />
            <InfoCard title="Last deploy" value={project.last_deploy_at ? new Date(project.last_deploy_at).toLocaleString() : 'Never'} icon={<Clock size={16} />} />
          </div>

          {/* SDLC progress bar (moved above pipeline/env) */}
          <div className="rounded-xl border bg-card p-4 mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><BookOpen size={16} /> SDLC Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Onboarding → Create Projects → Planning / Requirement → Design → Development → Testing → UAT → Deployment / Maintenance
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="inline-flex flex-wrap items-center gap-4 text-xs text-muted-foreground rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Done</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> In progress</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> Needs attention</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-500" /> Pending</span>
              </div>
            <div className="flex flex-wrap gap-3 items-center">
                {['onboarding','create_project','planning','design','development','testing','uat','deployment'].map((key, idx, arr) => {
                  const found = computedSdlcForProgress.find((s) => s.step_key === key);
                  const status = found?.status || 'pending';
                  const color =
                    status === 'done'
                      ? 'bg-emerald-500'
                      : status === 'in_progress'
                        ? 'bg-amber-500'
                        : 'bg-slate-500';
                  const connectorColor =
                    status === 'done'
                      ? 'bg-emerald-500/60'
                      : status === 'in_progress'
                        ? 'bg-amber-500/70'
                        : 'bg-slate-600';
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${color}`} />
                      <span className="text-xs font-medium capitalize whitespace-nowrap">{key.replace('_', ' ')}</span>
                      {idx < arr.length -1 && <span className={`w-8 h-[2px] rounded-sm ${connectorColor}`} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pipeline and Environments side-by-side */}
          <div className="grid gap-4 lg:grid-cols-2 mt-6">
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Wrench size={16} /> Pipeline</h3>
                  <p className="text-sm text-muted-foreground">Plan → Design → Code → Build → Test → Deploy → Monitor (drag to reorder)</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pipelineDisplay.map((stage, idx) => (
                  <div
                    key={stage.id}
                    className="rounded-lg border p-4 bg-white cursor-move shadow-sm"
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', idx.toString()); }}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => { e.preventDefault(); const from = Number(e.dataTransfer.getData('text/plain')); onPipelineDrag(from, idx); }}
                  >
                    <div className="font-semibold">{stage.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{stage.status || 'pending'}</div>
                    <div className="text-[10px] text-muted-foreground">Order {idx + 1}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 justify-end border-t border-border pt-3">
                <Input value={branch} onChange={(e) => setBranch(e.target.value)} className="w-32" placeholder="branch" />
                <Button size="sm" variant="outline" onClick={handleSavePipelineOrder} disabled={pipelineSaving}>
                  {pipelineSaving ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save order
                </Button>
                <Button size="sm" className="bg-black text-white hover:bg-slate-900" onClick={handleCreateRun}><PlayCircle className="mr-2 h-4 w-4" /> Run</Button>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Server size={16} /> Environments</h3>
                  <p className="text-sm text-muted-foreground">Create and view environments without leaving overview.</p>
                </div>
              </div>
              {showEnvForm && (
                <div className="rounded-lg border p-3 bg-muted/30 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <Input value={envName} onChange={(e) => setEnvName(e.target.value)} className="w-full mt-1" placeholder="Staging" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">URL <span className="text-muted-foreground text-[11px]">(optional)</span></label>
                      <Input value={envUrl} onChange={(e) => setEnvUrl(e.target.value)} className="w-full mt-1" placeholder="https://staging.example.com (optional)" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                      rows={3}
                      value={envDescription}
                      onChange={(e) => setEnvDescription(e.target.value)}
                      placeholder="Purpose, endpoints, credentials notes..."
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" className="bg-black text-white hover:bg-slate-900" onClick={handleCreateEnv}>
                      Save environment
                    </Button>
                  </div>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                {environments.map((env) => (
                  <div key={env.id} className="rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold flex items-center gap-2"><Server size={14} /> {env.name}</div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full border text-muted-foreground bg-background">{env.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground break-all">{env.url || 'No URL yet'}</div>
                    {env.description && <div className="text-xs text-muted-foreground mt-1">{env.description}</div>}
                    {env.last_deployed_at && (
                      <div className="text-[11px] text-muted-foreground">Last deploy {new Date(env.last_deployed_at).toLocaleString()}</div>
                    )}
                  </div>
                ))}
                {environments.length === 0 && <p className="text-sm text-muted-foreground">No environments yet.</p>}
              </div>
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowEnvForm((v) => !v)}>
                  {showEnvForm ? 'Close' : 'Add environment'}
                </Button>
              </div>
              </div>
            </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Settings size={16} /> Scripts</h3>
                  <p className="text-sm text-muted-foreground">Capture deploy/build scripts here; full view in Scripts tab.</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Script content</label>
                <textarea
                  className="w-full rounded-md border border-border bg-background p-3 font-mono text-sm"
                  rows={6}
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {scripts.map((script) => (
                  <div key={script.id} className="rounded-lg border p-3 flex flex-col gap-2 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold flex items-center gap-2"><TerminalSquare size={14} /> {script.name}</div>
                      <span className="text-[11px] px-2 py-1 rounded-full border bg-white text-muted-foreground capitalize">{script.kind || 'custom'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-3">{script.content}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{script.notes || 'No notes yet'}</span>
                      <Button size="sm" variant="outline" onClick={() => handleRunScript(script.id)}>Run</Button>
                    </div>
                  </div>
                ))}
                {scripts.length === 0 && <p className="text-sm text-muted-foreground">No scripts yet.</p>}
              </div>
              <div className="border-t pt-3">
                <div className="flex flex-wrap gap-2 items-center justify-between">
                  <div className="text-sm font-medium text-muted-foreground">Create / edit script</div>
                  <div className="flex flex-wrap gap-2 items-center justify-end">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[160px]"
                      value={selectedScriptId || ''}
                      onChange={(e) => handleSelectScript(e.target.value)}
                    >
                      <option value="">New script...</option>
                      {scripts.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <Input
                      value={scriptName}
                      onChange={(e) => setScriptName(e.target.value)}
                      className="w-44"
                      placeholder="build.sh"
                    />
                    {editMode ? (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-black text-white hover:bg-slate-900" onClick={handleSaveScript}>Save</Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                      </div>
                    ) : (
                      <Button size="sm" className="bg-black text-white hover:bg-slate-900" onClick={handleSaveScript}>Add</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold flex items-center gap-2"><Layers size={16} /> Tech stacks</h3>
                  <p className="text-sm text-muted-foreground">Frameworks, runtimes, and build tools detected for this project.</p>
                </div>
                <span className="inline-flex items-center justify-center gap-1 text-xs px-3 py-1 min-w-[96px] rounded-full border bg-muted/50 text-foreground/80 shadow-sm">
                  <Layers size={12} /> {techStacks.length} items
                </span>
              </div>
              {techStacks.length === 0 ? (
                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground bg-muted/30">
                  No tech stack captured yet. Add a package.json or configure detection in the Scripts tab.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {techStacks.map((stack) => (
                    <div key={stack.id} className="rounded-lg border p-3 bg-muted/30 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold flex items-center gap-2"><Layers size={14} /> {stack.name}</div>
                        {stack.version && <span className="text-[11px] px-2 py-1 rounded-full border bg-white text-muted-foreground">{stack.version}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize leading-tight">{stack.category || 'Uncategorized'}</div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        {stack.source && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white text-muted-foreground"><Github size={12} /> {stack.source}</span>}
                        {typeof stack.confidence === 'number' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white text-muted-foreground">{stack.confidence}% confidence</span>}
                      </div>
                      {stack.notes && <p className="text-xs text-muted-foreground">{stack.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4 mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Bug size={16} /> Findings & marketplace</h3>
                <p className="text-sm text-muted-foreground">Latest scans, tests, and cron-driven checks. Push straight to marketplace.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/marketplace')}>Open marketplace</Button>
                <Button size="sm" onClick={() => openSubmit()}>Submit manually</Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {findings.map((finding) => (
                <div key={finding.id} className="rounded-lg border p-3 bg-muted/30 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{finding.source}</div>
                    <span className={`text-[11px] px-2 py-1 rounded-full border ${severityBadge(finding.severity)}`}>
                      {finding.severity}
                    </span>
                  </div>
                  <h4 className="font-semibold leading-snug flex items-center gap-2">
                    <FileText size={14} /> {finding.title}
                  </h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><GitBranch size={12} /> {finding.branch}</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">{finding.message}</p>
                  <div className="flex flex-wrap gap-2">
                    {finding.tags.map((tag) => (
                      <span key={tag} className="text-[11px] px-2 py-1 rounded-full border bg-white text-muted-foreground flex items-center gap-1">
                        <Tag size={12} /> {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{finding.createdAt}</span>
                    <span className="uppercase font-semibold">{finding.status}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => { goToTab('testing'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Fix it</Button>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => handleViewLogs(finding)}><Link2 size={12} /> Logs</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button size="sm" variant="secondary" className="gap-1" onClick={() => setSelectedFinding(finding)}><Eye size={12} /> Details</Button>
                      <Button size="sm" className="gap-1 bg-black text-white hover:bg-slate-900" onClick={() => openSubmit(finding)}><Send size={12} /> Submit</Button>
                    </div>
                  </div>
                </div>
              ))}
              {findings.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground text-sm border border-dashed rounded-lg p-6">
                  No findings yet. Run an index job or tests to populate this space.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sdlc">
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">SDLC flow (sdlc.md)</h3>
                  <p className="text-sm text-muted-foreground">Onboarding → Create Project → Planning/Requirement → Design → Development → Testing → UAT → Deployment/Maintenance.</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Create Projects supports two types: repo-linked (no uploads) and blank projects (upload folder or link repo later). Indexing is required before Testing to view and rerun suites.</p>
              <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => goToTab('indexing')}>Index repo/folder</Button>
                <Button variant="outline" size="sm" onClick={() => setShowCanvasDrawer(true)}>Open canvas</Button>
                <Button variant="outline" size="sm" onClick={() => setShowSdlcDrawer(true)}>Open sdlc.md</Button>
                </div>
              </div>

            {/* Progress line inside SDLC tab */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="inline-flex flex-wrap items-center gap-4 text-xs text-muted-foreground rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Done</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500" /> In progress</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" /> Needs attention</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-500" /> Pending</span>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                {['onboarding','create_project','planning','design','development','testing','uat','deployment'].map((key, idx, arr) => {
                  const found = computedSdlcForProgress.find((s) => s.step_key === key);
                  const status = found?.status || 'pending';
                  const color =
                    status === 'done'
                      ? 'bg-emerald-500'
                      : status === 'in_progress'
                        ? 'bg-amber-500'
                        : 'bg-slate-500';
                  const connectorColor =
                    status === 'done'
                      ? 'bg-emerald-500/60'
                      : status === 'in_progress'
                        ? 'bg-amber-500/70'
                        : 'bg-slate-600';
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${color}`} />
                      <span className="text-xs font-medium capitalize whitespace-nowrap">{key.replace('_', ' ')}</span>
                      {idx < arr.length -1 && <span className={`w-8 h-[2px] rounded-sm ${connectorColor}`} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold flex items-center gap-2"><BookOpen size={16} /> SDLC phases</h4>
                  <p className="text-sm text-muted-foreground">Click a phase to view pending actions.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={collapseAllPhases}>Collapse all</Button>
                  <Button size="sm" variant="ghost" onClick={expandAllPhases}>Expand all</Button>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                {sdlcBlueprint.map((phase) => {
                  const step = sdlcSteps.find((s) => s.step_key === phase.id);
                  const pending = step?.pending_actions || [];
                  const isCollapsed = collapsedPhases[phase.id];
                  return (
                    <div key={phase.id} className="relative rounded-lg border bg-muted/20 p-4 pt-5 space-y-3 overflow-hidden">
                      <div className="absolute inset-x-0 top-0 h-px bg-border" />
                      <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          className="flex flex-col gap-1 text-left"
                          onClick={() => togglePhaseCollapse(phase.id)}
                        >
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">{phase.name}</span>
                          <span className="text-[10px] text-muted-foreground/80">{isCollapsed ? 'Expand to view actions' : 'Collapse actions'}</span>
                          {!isCollapsed && (
                            <>
                              <p className="text-sm text-muted-foreground">{phase.summary}</p>
                              <p className="text-[11px] text-muted-foreground/80">{phase.outputs}</p>
                            </>
                          )}
                        </button>
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-xs font-medium"
                          value={step?.status || 'pending'}
                          onChange={(e) => handleStepStatusChange(phase.id as SdlcStepKey, e.target.value as any)}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In progress</option>
                          <option value="done">Done</option>
                        </select>
                      </div>
                      {!isCollapsed && (
                        <div className="flex flex-wrap gap-2">
                          {pending.length === 0 ? (
                            <span className="text-[11px] text-muted-foreground">No pending actions</span>
                          ) : (
                            pending.map((item) => (
                              <span key={item} className="text-[11px] px-2 py-1 rounded-full border bg-white text-muted-foreground">
                                {item}
                              </span>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2"><BookOpen size={16} /> Planning workspace</h4>
                    <p className="text-sm text-muted-foreground">Canvas + sidebar: Gantt, flow charts, use cases, docs (badges), meeting minutes, notes.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleStepStatusChange('planning', 'in_progress')}>Mark in progress</Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {planningActionItems.map((action) => {
                    const pending = new Set(sdlcSteps.find((s) => s.step_key === 'planning')?.pending_actions || []);
                    return (
                      <label key={action} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={pending.has(action)}
                          onChange={() => handleTogglePending('planning', action)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <span>{action}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2"><Layers size={16} /> Design board</h4>
                    <p className="text-sm text-muted-foreground">DB design, low-fidelity UX, and system architecture diagrams tracked together.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleStepStatusChange('design', 'in_progress')}>Start design</Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {designActionItems.map((action) => {
                    const pending = new Set(sdlcSteps.find((s) => s.step_key === 'design')?.pending_actions || []);
                    return (
                      <label key={action} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={pending.has(action)}
                          onChange={() => handleTogglePending('design', action)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <span>{action}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2"><Wrench size={16} /> Testing readiness</h4>
                    <p className="text-sm text-muted-foreground">Indexing required before testing tab unlocks viewing/reruns.</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {testingActionItems.map((action) => {
                    const pending = new Set(sdlcSteps.find((s) => s.step_key === 'testing')?.pending_actions || []);
                    return (
                      <label key={action} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={pending.has(action)}
                          onChange={() => handleTogglePending('testing', action)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <span>{action}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2"><Server size={16} /> Deployment / Maintenance</h4>
                    <p className="text-sm text-muted-foreground">Environment, script, domain, server, subdomain, backup, monitoring tracked as pending actions.</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {deploymentActionItems.map((action) => {
                    const pending = new Set(sdlcSteps.find((s) => s.step_key === 'deployment')?.pending_actions || []);
                    return (
                      <label key={action} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={pending.has(action)}
                          onChange={() => handleTogglePending('deployment', action)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <span>{action}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Keep scripts and environments updated; use the Indexing tab for cron scans that refresh testing tables and feed bugs into Findings.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="indexing">
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Indexing</h3>
                <p className="text-sm text-muted-foreground">Track repository or folder indexing jobs and cron-based rescans (hours + file growth).</p>
              </div>
              <div className="flex gap-2 items-center flex-wrap justify-end">
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm min-w-[140px]"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                >
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <Button size="sm" className="bg-black text-white hover:bg-slate-900" onClick={handleIndex}>
                  <Layers className="mr-2 h-4 w-4" /> Run index
                </Button>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2"><Folder size={14} /> Source</div>
                    <p className="text-xs text-muted-foreground">Repo link (no uploads) or folder path (blank projects can upload).</p>
                  </div>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={indexMode}
                    onChange={(e) => setIndexMode(e.target.value as 'repo' | 'folder')}
                  >
                    <option value="repo">Repo</option>
                    <option value="folder">Folder</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                  {indexMode === 'repo' ? (
                    <Input placeholder="https://github.com/org/repo" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
                  ) : (
                    <Input placeholder="/uploads/project-folder" value={sourcePath} onChange={(e) => setSourcePath(e.target.value)} />
                  )}
                    <Button size="sm" variant="outline" onClick={handleSaveIndexingConfig}>Save settings</Button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Rescan every (hours)</label>
                    <Input
                      type="number"
                      value={cronHours}
                      onChange={(e) => setCronHours(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Growth threshold (files)</label>
                    <Input
                      type="number"
                      value={growthThreshold}
                      onChange={(e) => setGrowthThreshold(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Last indexed: {indexingConfig?.last_indexed_at ? new Date(indexingConfig.last_indexed_at).toLocaleString() : 'Not yet'}
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2"><RefreshCcw size={14} /> Automation</div>
                    <p className="text-xs text-muted-foreground">Cron scans refresh testing tables; bugs surface in Findings & marketplace submission stays enabled.</p>
                  </div>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => goToTab('testing')}>View tests</Button>
                </div>
                <p className="text-xs text-muted-foreground">Logs and statuses recorded per job. Rescans honor file-growth threshold to skip tiny changes.</p>
                {indexingConfig?.notes && <p className="text-xs text-muted-foreground">Notes: {indexingConfig.notes}</p>}
              </div>
            </div>

            <div className="space-y-2">
              {indexJobs.map((job) => (
                <div key={job.id} className="rounded-lg border p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">#{job.id.slice(0, 6)}</div>
                    <div className="text-xs text-muted-foreground">Branch: {job.branch}</div>
                    {job.message && <div className="text-xs text-muted-foreground">{job.message}</div>}
                  </div>
                  <div className="text-xs uppercase font-semibold">{job.status}</div>
                </div>
              ))}
              {indexJobs.length === 0 && <p className="text-sm text-muted-foreground">No index jobs yet.</p>}
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="font-semibold text-sm">Indexed codebases</div>
              {indexJobs.filter(j => j.status === 'completed').length === 0 ? (
                <p className="text-xs text-muted-foreground">No completed index jobs yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {indexJobs.filter(j => j.status === 'completed').map((job) => (
                    <div key={job.id} className="rounded-md border border-border bg-background p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Branch: {job.branch}</span>
                        <span className="text-[10px] uppercase text-emerald-700">Completed</span>
                      </div>
                      {job.created_at && (
                        <div className="text-muted-foreground">Indexed at {new Date(job.created_at).toLocaleString()}</div>
                      )}
                      {project?.repository_url && (
                        <a className="inline-flex items-center gap-1 text-primary hover:underline" href={project.repository_url} target="_blank" rel="noreferrer">
                          <Link2 size={12} /> Repo
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isDemo && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <div className="font-semibold text-sm flex items-center gap-2"><Github size={14} /> Demo codebases</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    { name: 'opsnest/frontend', branch: 'main', status: 'Completed', lastIndexed: 'Today 10:15', files: '1,420 files', images: '58 images', repoUrl: 'https://github.com/js713-lab/opsNest-frontend', primary: 'Next.js + Tailwind' },
                    { name: 'opsnest/backend', branch: 'develop', status: 'Completed', lastIndexed: 'Today 09:42', files: '980 files', images: '21 images', repoUrl: 'https://github.com/js713-lab/opsNest-backend', primary: 'Node.js + Supabase' },
                  ].map((demo) => (
                    <div key={demo.name} className="rounded-md border border-border bg-background p-2 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold flex items-center gap-1"><Github size={12} /> {demo.name}</span>
                        <span className="text-[10px] uppercase text-emerald-700">{demo.status}</span>
                      </div>
                      <div className="text-muted-foreground">Branch: {demo.branch}</div>
                      <div className="text-muted-foreground">Indexed at {demo.lastIndexed}</div>
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white text-muted-foreground"><FileText size={12} /> {demo.files}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white text-muted-foreground"><Image size={12} /> {demo.images}</span>
                        {demo.primary && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white text-muted-foreground"><Tag size={12} /> {demo.primary}</span>}
                        {demo.repoUrl && (
                          <a className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-white text-primary hover:underline" href={demo.repoUrl} target="_blank" rel="noreferrer">
                            <Link2 size={12} /> GitHub
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="testing">
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <h3 className="font-semibold">Testing</h3>
                  <p className="text-sm text-muted-foreground">Unit, integration, and E2E results.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => goToTab('indexing')}><RefreshCcw className="mr-2 h-4 w-4" /> Go to indexing</Button>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                <Layers size={14} /> Indexing must complete before all test artifacts are viewable/rerunnable. Cron rescan (Indexing tab) refreshes this table automatically based on file growth.
              </div>

              <div className="rounded-xl border bg-card">
                <div className="w-full flex items-center justify-between px-4 py-3">
                  <div>
                    <h4 className="font-semibold">Default templates</h4>
                    <p className="text-sm text-muted-foreground">Reusable checks for images, dark mode, translation, mobile responsive.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowTemplates((v) => !v)}>
                      {showTemplates ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>
                {showTemplates && (
                  <div className="border-t p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {defaultCheckColumns.map((col) => (
                          <span key={col} className="text-[11px] px-2 py-1 rounded-full border bg-white text-muted-foreground">
                            {col}
                          </span>
                        ))}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => handleApplyTemplate(defaultModuleTemplates[0])}>Quick add</Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {defaultModuleTemplates.map((tmpl) => (
                        <div key={tmpl.title} className="rounded-lg border p-3 bg-muted/30 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-sm">{tmpl.title}</div>
                            <div className="text-xs text-muted-foreground">{tmpl.scenario}</div>
                            <div className="text-[11px] text-muted-foreground">Module: {tmpl.module}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => handleApplyTemplate(tmpl)}>Add</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-semibold">Test cases</h4>
                  <p className="text-xs text-muted-foreground">Filters and quick adds stay bundled with the results.</p>
                </div>
              </div>
              <div className="px-4 py-3 border-b flex flex-wrap items-center gap-3 justify-between">
                <div className="flex flex-wrap gap-2 items-center">
                  <Input
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    className="w-56"
                    placeholder="Search test cases..."
                  />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={testModuleFilter}
                    onChange={(e) => setTestModuleFilter(e.target.value)}
                  >
                    <option value="all">All modules</option>
                    {testModuleOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={testStatusFilter}
                    onChange={(e) => setTestStatusFilter(e.target.value)}
                  >
                    <option value="all">All status</option>
                    <option value="PASSED">Passed</option>
                    <option value="FAILED">Failed</option>
                    <option value="RUNNING">Running</option>
                    <option value="PENDING">Pending</option>
                    <option value="PENDING REVIEW">Pending review</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Input value={testName} onChange={(e) => setTestName(e.target.value)} className="w-40" placeholder="TC_smoke_001" />
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={testStatus}
                    onChange={(e) => setTestStatus(e.target.value as any)}
                  >
                    <option value="PASSED">PASSED</option>
                    <option value="FAILED">FAILED</option>
                    <option value="RUNNING">RUNNING</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                  <Button size="sm" onClick={handleAddTestResult}><Wrench className="mr-2 h-4 w-4" /> Add</Button>
                  <Button size="sm" variant="outline" onClick={addTemplateTests}>Add default templates</Button>
                  <Button size="sm" className="bg-black text-white hover:bg-slate-900">Run all tests</Button>
                </div>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                      <th>Test ID</th>
                      <th>Module</th>
                      <th>Scenario</th>
                      <th>Status</th>
                      <th>Duration</th>
                      <th>Last run</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                  {filteredTests.map((tr) => (
                      <tr key={tr.id} className="border-t [&>td]:px-3 [&>td]:py-2">
                      <td className="font-semibold text-primary">{tr.test_id}</td>
                        <td className="text-xs text-muted-foreground">{tr.module || '—'}</td>
                        <td className="text-xs text-muted-foreground">{tr.scenario || '—'}</td>
                        <td className="text-xs font-semibold uppercase">{tr.status}</td>
                      <td className="text-xs text-muted-foreground">{(tr as any).duration || '—'}</td>
                        <td className="text-xs text-muted-foreground">
                        {(tr as any).last_run_at ? new Date((tr as any).last_run_at).toLocaleString() : '—'}
                        </td>
                      <td className="text-xs text-muted-foreground">{(tr as any).source || 'Auto-gen'}</td>
                      </tr>
                    ))}
                  {filteredTests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                          No test results yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><RefreshCcw size={16} /> Indexing cron settings</h3>
                <p className="text-sm text-muted-foreground">Configure rescan cadence and growth threshold. Marketplace links removed per request.</p>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium flex items-center gap-2"><CalendarClock size={14} /> Rescan every (hours)</label>
                  <Input
                    type="number"
                    value={cronHours}
                    onChange={(e) => setCronHours(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium flex items-center gap-2"><Layers size={14} /> Growth threshold (files)</label>
                  <Input
                    type="number"
                    value={growthThreshold}
                    onChange={(e) => setGrowthThreshold(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Last indexed: {indexingConfig?.last_indexed_at ? new Date(indexingConfig.last_indexed_at).toLocaleString() : 'Not yet'}
              </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => goToTab('indexing')}>Back to indexing</Button>
              <Button size="sm" className="bg-black text-white hover:bg-slate-900" onClick={handleSaveIndexingConfig}>Save cron settings</Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      {selectedFinding && (
        <div className="fixed inset-0 w-screen h-screen z-50 m-0 p-0 !mt-0 !pt-0 bg-black/40 backdrop-blur-sm flex items-stretch justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full overflow-y-auto shadow-2xl p-6 border-l border-border relative animate-in slide-in-from-right duration-200">
            <button className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" onClick={() => setSelectedFinding(null)}>
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <GitBranch size={14} /> {selectedFinding.branch}
              {selectedFinding.cronRef && (
                <span className="px-2 py-1 rounded-full border bg-muted text-muted-foreground ml-auto text-[11px]">
                  {selectedFinding.cronRef}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold mt-2">{selectedFinding.title}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Bug size={14} /> {selectedFinding.source}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`text-[11px] px-2 py-1 rounded-full border ${severityBadge(selectedFinding.severity)}`}>{selectedFinding.severity}</span>
              <span className="text-[11px] px-2 py-1 rounded-full border bg-muted text-muted-foreground uppercase">{selectedFinding.status}</span>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm font-semibold">{selectedFinding.createdAt}</p>
              </div>
              <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {selectedFinding.tags.map((tag) => (
                    <span key={tag} className="text-[11px] px-2 py-1 rounded-full border bg-muted text-muted-foreground">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-4 leading-relaxed text-sm">{selectedFinding.message}</p>
            <div className="mt-3 text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <Link2 size={14} />
                {selectedFinding.logsUrl ? (
                  <a className="underline text-primary" href={selectedFinding.logsUrl} target="_blank" rel="noreferrer">
                    {selectedFinding.logsUrl}
                  </a>
                ) : (
                  <span>No logs attached</span>
                )}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button onClick={() => { goToTab('testing'); setSelectedFinding(null); }}>Fix it</Button>
              <Button variant="outline" onClick={() => handleViewLogs(selectedFinding)}>View logs</Button>
              <Button variant="outline" onClick={() => { openSubmit(selectedFinding); setSelectedFinding(null); }}>Submit to marketplace</Button>
            </div>
          </div>
        </div>
      )}

      {logDrawerFinding && (
        <div className="fixed inset-0 w-screen h-screen z-50 m-0 p-0 !mt-0 !pt-0 bg-black/40 backdrop-blur-sm flex items-stretch justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-screen overflow-y-auto shadow-2xl p-6 border-l border-border relative animate-in slide-in-from-right duration-200">
            <button className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" onClick={() => setLogDrawerFinding(null)}>
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link2 size={14} />
              Logs & diagnostics
            </div>
            <h2 className="text-xl font-bold mt-2">{logDrawerFinding.title}</h2>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`text-[11px] px-2 py-1 rounded-full border ${severityBadge(logDrawerFinding.severity)}`}>{logDrawerFinding.severity}</span>
              <span className="text-[11px] px-2 py-1 rounded-full border bg-muted text-muted-foreground uppercase">{logDrawerFinding.status}</span>
              <span className="text-[11px] px-2 py-1 rounded-full border bg-muted text-muted-foreground flex items-center gap-1">
                <GitBranch size={12} /> {logDrawerFinding.branch}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">Log source</p>
                {logDrawerFinding.logsUrl ? (
                  <a className="text-sm underline text-primary break-all" href={logDrawerFinding.logsUrl} target="_blank" rel="noreferrer">
                    {logDrawerFinding.logsUrl}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">No log URL attached. Showing captured context instead.</p>
                )}
              </div>
              <div className="rounded-md border bg-card p-3">
                <p className="text-xs text-muted-foreground mb-2">Excerpt</p>
                <pre className="text-xs whitespace-pre-wrap leading-relaxed text-foreground">{logDrawerFinding.message || 'No log content available.'}</pre>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 justify-end">
              <Button variant="ghost" onClick={() => setLogDrawerFinding(null)}>Close</Button>
              <Button variant="outline" onClick={() => { setSelectedFinding(logDrawerFinding); setLogDrawerFinding(null); }}>View details</Button>
              <Button onClick={() => { openSubmit(logDrawerFinding); setLogDrawerFinding(null); }}>Submit to marketplace</Button>
            </div>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 w-screen h-screen z-50 m-0 p-0 !mt-0 !pt-0 bg-black/50 backdrop-blur-sm flex items-center justify-center overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[92vh] mx-4 sm:mx-8 lg:mx-12 rounded-xl shadow-2xl border border-border p-6 relative overflow-y-auto">
            <button className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" onClick={() => setShowSubmitModal(false)}>
              <X size={18} />
            </button>
            <h3 className="text-xl font-bold mb-1">Submit to marketplace</h3>
            <p className="text-sm text-muted-foreground mb-4">Provide enough context for responders: severity, repro, logs, and impact.</p>
            <form className="space-y-4" onSubmit={handleSubmitMarketplace}>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input value={submitForm.title} onChange={(e) => setSubmitForm((f) => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Severity</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={submitForm.severity}
                    onChange={(e) => setSubmitForm((f) => ({ ...f, severity: e.target.value as Severity }))}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input value={submitForm.category} onChange={(e) => setSubmitForm((f) => ({ ...f, category: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Repo URL</label>
                  <Input value={submitForm.repoUrl} onChange={(e) => setSubmitForm((f) => ({ ...f, repoUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Branch/Tag</label>
                  <Input value={submitForm.branch} onChange={(e) => setSubmitForm((f) => ({ ...f, branch: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Commit SHA (optional)</label>
                  <Input value={submitForm.commitSha} onChange={(e) => setSubmitForm((f) => ({ ...f, commitSha: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Cron reference</label>
                  <Input value={submitForm.cronRef} onChange={(e) => setSubmitForm((f) => ({ ...f, cronRef: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Logs URL</label>
                  <Input value={submitForm.logsUrl} onChange={(e) => setSubmitForm((f) => ({ ...f, logsUrl: e.target.value }))} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Repro steps</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={3}
                    value={submitForm.reproSteps}
                    onChange={(e) => setSubmitForm((f) => ({ ...f, reproSteps: e.target.value }))}
                  />
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="text-sm font-medium">Expected</label>
                    <Input value={submitForm.expected} onChange={(e) => setSubmitForm((f) => ({ ...f, expected: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Actual</label>
                    <Input value={submitForm.actual} onChange={(e) => setSubmitForm((f) => ({ ...f, actual: e.target.value }))} />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Impact</label>
                  <Input value={submitForm.impact} onChange={(e) => setSubmitForm((f) => ({ ...f, impact: e.target.value }))} placeholder="e.g., blocks deploy, SLO breach" />
                </div>
                <div>
                  <label className="text-sm font-medium">Tags</label>
                  <Input value={submitForm.tags} onChange={(e) => setSubmitForm((f) => ({ ...f, tags: e.target.value }))} placeholder="indexing, cron, logs" />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact email</label>
                  <Input type="email" value={submitForm.contactEmail} onChange={(e) => setSubmitForm((f) => ({ ...f, contactEmail: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Attachments</label>
                  <div className="h-10 rounded-md border border-dashed border-input bg-muted/50 px-3 flex items-center text-sm text-muted-foreground">
                    Drop links to logs or artifacts
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
                <Button type="submit">Submit</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSdlcDrawer && (
        <div className="fixed inset-0 w-screen h-screen z-50 m-0 p-0 !mt-0 !pt-0 bg-black/40 backdrop-blur-sm flex items-stretch justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-screen overflow-y-auto shadow-2xl p-6 border-l border-border relative animate-in slide-in-from-right duration-200">
            <button className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" onClick={() => setShowSdlcDrawer(false)}>
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={18} />
              <div>
                <h2 className="text-lg font-semibold">sdlc.md (summary)</h2>
                <p className="text-xs text-muted-foreground">Condensed phases pulled from the SDLC guide.</p>
              </div>
            </div>
            <div className="space-y-3">
              {sdlcDrawerItems.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 bg-muted/30 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.summary}</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full border text-muted-foreground bg-background capitalize">
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{item.outputs}</p>
                </div>
              ))}
              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">AI prompt starter (editable)</p>
                  <Button size="sm" variant="ghost" className="h-8 px-2" onClick={handleCopySdlcPrompt}>
                    <Copy size={14} className="mr-1" />
                    Copy
                  </Button>
                </div>
                <textarea
                  className="w-full min-h-[180px] rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed"
                  value={sdlcPrompt}
                  onChange={(e) => setSdlcPrompt(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showCanvasDrawer && (
        <div className="fixed inset-0 w-screen h-screen z-50 m-0 p-0 !mt-0 !pt-0 bg-black/40 backdrop-blur-sm flex items-stretch justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-full overflow-hidden shadow-2xl border-l border-border relative animate-in slide-in-from-right duration-200 flex flex-col">
            <div className="flex items-center justify-between gap-4 px-4 pb-2 pt-0">
              <div className="min-w-0">
                <h3 className="text-xl font-semibold">SDLC canvas</h3>
                <p className="text-sm text-muted-foreground">Drag nodes, connect flows, switch views. Saves to Supabase when authenticated.</p>
              </div>
              <Button variant="outline" onClick={() => setShowCanvasDrawer(false)}>Close</Button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto px-4 pb-4 pt-0">
              <SdlcWorkflowCanvas projectId={project?.id || undefined} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoCard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) => (
  <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
    <div>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
    <div className="text-muted-foreground">{icon}</div>
  </div>
);

export default ProjectDetailPage;

