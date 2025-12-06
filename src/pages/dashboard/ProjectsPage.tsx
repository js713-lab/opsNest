import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, GitBranch, Clock, MoreVertical, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { createProject, listProjects, Project, supabase } from '@/lib/supabase';
import { fetchGithubRepos, getGithubToken, GithubRepo } from '@/lib/github';

const ProjectsPage = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const forceDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const [form, setForm] = useState({
    name: '',
    description: '',
    repository_url: '',
    branch: 'main'
  });
  const [ghRepos, setGhRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const LOCAL_PROJECTS_KEY = 'opsnest_demo_projects';

  const readLocalProjects = useCallback((): Project[] => {
    try {
      const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const writeLocalProjects = useCallback((data: Project[]) => {
    try {
      localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(data));
    } catch {
      // best-effort; ignore quota failures
    }
  }, []);

  const demoProjects = useMemo<Project[]>(() => ([
      {
        id: 'demo-1',
        name: 'api-gateway-service',
        status: 'ACTIVE',
        branch: 'main',
        description: 'Core API gateway handling authentication and routing',
        repository_url: 'https://github.com/example/api-gateway'
      },
      {
        id: 'demo-2',
        name: 'analytics-engine',
        status: 'IDLE',
        branch: 'main',
        description: 'Real-time data processing and analytics',
        repository_url: 'https://github.com/example/analytics'
      }
    ]), []);

  const loadDemoProjects = useCallback(() => {
    setIsDemoMode(true);
    setError('Demo mode: connect Supabase auth to persist projects.');
    const local = readLocalProjects();
    setProjects(local.length > 0 ? local : demoProjects);
  }, [demoProjects, readLocalProjects]);

  useEffect(() => {
    const load = async () => {
      if (forceDemoMode) {
        loadDemoProjects();
        setLoading(false);
        return;
      }

      try {
        const data = await listProjects();
        // If Supabase is reachable but empty, still seed demo for a better first-run experience
        if (data.length === 0) {
          loadDemoProjects();
        } else {
          setProjects(data);
        }
      } catch (err) {
        console.warn('Falling back to demo data. Reason:', err);
        loadDemoProjects();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [forceDemoMode, loadDemoProjects]);

  const handleCreateProject = async () => {
    if (!form.name.trim()) {
      setError('Project name is required.');
      return;
    }

    try {
      const { data: auth } = await supabase.auth.getUser();
      const noUser = !auth?.user;
      const useDemo = isDemoMode || forceDemoMode || noUser;

      if (noUser && !isDemoMode) {
        setIsDemoMode(true);
        setError('Demo mode: connect Supabase auth to persist projects.');
      }

      let created: Project;
      if (useDemo) {
        created = {
          id: crypto.randomUUID(),
          name: form.name,
          description: form.description,
          repository_url: form.repository_url || undefined,
          branch: form.branch || undefined,
          status: 'SETUP'
        };
      } else {
        created = await createProject({
          name: form.name,
          description: form.description,
          repository_url: form.repository_url || undefined,
          branch: form.branch || undefined,
          status: 'SETUP'
        });
      }

      setProjects((prev) => {
        const next = [created, ...prev];
        if (useDemo) {
          writeLocalProjects(next);
        }
        return next;
      });
      setIsCreateModalOpen(false);
      setForm({ name: '', description: '', repository_url: '', branch: 'main' });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    }
  };

  const loadGithubRepos = async () => {
    const token = getGithubToken();
    if (!token) {
      setError('Connect GitHub in Integrations first.');
      return;
    }
    setLoadingRepos(true);
    try {
      const repos = await fetchGithubRepos(token);
      setGhRepos(repos);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load GitHub repos');
    } finally {
      setLoadingRepos(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'IDLE': return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
      case 'ERROR': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'SETUP': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const emptyState = useMemo(() => projects.length === 0, [projects]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">Manage your development projects and workflows</p>
          {error && (
            <div className="mt-2 inline-flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 px-3 py-1 rounded-md border border-amber-200">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:bg-primary/90 border border-primary/60"
        >
          <Plus className="mr-2 h-4 w-4" /> Create project
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading projects...</div>
      ) : emptyState ? (
        <div className="rounded-xl border bg-card p-8 text-center space-y-3">
          <p className="text-lg font-semibold">No projects yet</p>
          <p className="text-sm text-muted-foreground">Create your first project to wire SDLC, environments, scripts, indexing, and testing.</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create project
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="group relative flex h-full flex-col justify-between rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Plus className="h-3.5 w-3.5" /> New Project
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition duration-200 group-hover:scale-105">
                <Plus className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-6 space-y-3">
              <p className="text-lg font-semibold tracking-tight">Start something new</p>
              <p className="text-sm text-muted-foreground">Spin up a workspace to wire SDLC, environments, and integrations.</p>
              <span className="inline-flex w-fit items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold shadow-sm shadow-primary/30 transition group-hover:translate-y-px group-hover:shadow-md">
                <span className="h-2 w-2 rounded-full bg-white" />
                Launch modal
              </span>
            </div>
          </button>

          {projects.map((project) => (
            <div 
              key={project.id} 
              className="group relative rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate(`/dashboard/projects/${project.id}`)}
            >
              <div className="flex items-center justify-between mb-4">
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical size={16} />
                </Button>
              </div>
              
              <h3 className="text-lg font-bold tracking-tight mb-2">{project.name}</h3>
              <p className="text-sm text-muted-foreground mb-6 h-10 line-clamp-2">{project.description || 'No description yet.'}</p>

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground border-t border-border pt-4">
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500"></span>Pipeline Stage</span>
                  <span className="font-medium text-foreground">
                     {project.status === 'SETUP' ? 'Plan' : project.status === 'ERROR' ? 'Deploy' : 'Test'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5"><GitBranch size={12} /> Branch</span>
                  <span className="font-medium text-foreground font-mono">{project.branch || 'main'}</span>
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <span className="flex items-center gap-1.5"><Clock size={12} /> Last Deploy</span>
                  <span className="font-medium text-foreground">
                    {project.last_deploy_at ? new Date(project.last_deploy_at).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Capture the basics. You can wire SDLC, environments, scripts, indexing, and testing inside each project later.</p>

           <div className="space-y-2">
            <label className="text-sm font-medium">Project name</label>
              <Input 
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="api-gateway-service"
              />
           </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Core API gateway handling authentication and routing"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Repository URL</label>
            <Input
              value={form.repository_url}
              onChange={(e) => setForm({ ...form, repository_url: e.target.value })}
              placeholder="https://github.com/your/repo (optional)"
            />
             </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Branch</label>
            <Input
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
              placeholder="main (optional)"
            />
             </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="text-sm font-medium">Import from GitHub</label>
              <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={loadGithubRepos} disabled={loadingRepos}>
                {loadingRepos ? 'Loading...' : 'Load repos'}
              </Button>
            </div>
            {ghRepos.length > 0 ? (
              <div className="max-h-48 overflow-auto border rounded-md divide-y">
                {ghRepos.map((repo) => (
                  <button 
                    key={repo.id}
                    className="w-full text-left px-3 py-2 hover:bg-accent"
                    onClick={() => setForm({
                      ...form,
                      name: repo.name,
                      repository_url: repo.html_url,
                      branch: repo.default_branch || 'main'
                    })}
                  >
                    <div className="text-sm font-medium">{repo.full_name}</div>
                    <div className="text-xs text-muted-foreground">Default branch: {repo.default_branch}</div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Connect GitHub in Integrations and click “Load repos”.</p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <Button className="w-full h-11 text-base font-semibold bg-black text-white hover:bg-black/85" onClick={handleCreateProject}>
              Create project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
