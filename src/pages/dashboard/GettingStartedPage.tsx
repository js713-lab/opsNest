import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Github, CheckCircle2, ArrowRight, Search, ShieldCheck, ListChecks, Sparkles } from 'lucide-react';
import { buildGithubAuthUrl, fetchGithubRepos, getGithubToken, GithubRepo } from '@/lib/github';

type Step = 1 | 2 | 3;

type Props = {
  onComplete?: () => void;
};

const demoRepos: GithubRepo[] = [
  { id: 1, name: 'kampungCameron', full_name: 'js713/kampungCameron', default_branch: 'main', html_url: 'https://github.com/js713/kampungCameron', owner: { login: 'js713' } },
  { id: 2, name: 'htmlPersonalWebsites', full_name: 'js713/htmlPersonalWebsites', default_branch: 'main', html_url: 'https://github.com/js713/htmlPersonalWebsites', owner: { login: 'js713' } },
  { id: 3, name: 'garageManagementSystem', full_name: 'js713/garageManagementSystem', default_branch: 'main', html_url: 'https://github.com/js713/garageManagementSystem', owner: { login: 'js713' } },
  { id: 4, name: 'ibuNiaga_crmSystem', full_name: 'js713/ibuNiaga_crmSystem', default_branch: 'main', html_url: 'https://github.com/js713/ibuNiaga_crmSystem', owner: { login: 'js713' } },
  { id: 5, name: 'linkSphere', full_name: 'js713/linkSphere', default_branch: 'main', html_url: 'https://github.com/js713/linkSphere', owner: { login: 'js713' } },
  { id: 6, name: 'portfolio_website', full_name: 'js713/portfolio_website', default_branch: 'main', html_url: 'https://github.com/js713/portfolio_website', owner: { login: 'js713' } },
];

const GettingStartedPage: React.FC<Props> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [githubConnected, setGithubConnected] = useState<boolean>(() => Boolean(getGithubToken()));
  const [repos, setRepos] = useState<GithubRepo[]>(demoRepos);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userFinished, setUserFinished] = useState(false);

  const currentStep: Step = useMemo(() => {
    if (!githubConnected) return 1;
    if (selectedRepos.length === 0) return 2;
    if (!userFinished) return 3;
    return 3;
  }, [githubConnected, selectedRepos.length, userFinished]);

  useEffect(() => {
    const syncGithubState = () => {
      setGithubConnected(Boolean(getGithubToken()));
    };
    window.addEventListener('storage', syncGithubState);
    window.addEventListener('focus', syncGithubState);
    return () => {
      window.removeEventListener('storage', syncGithubState);
      window.removeEventListener('focus', syncGithubState);
    };
  }, []);

  useEffect(() => {
    if (!githubConnected) {
      setRepos(demoRepos);
      setSelectedRepos([]);
      setError(null);
    }
  }, [githubConnected]);

  useEffect(() => {
    const token = getGithubToken();
    if (!token) {
      setRepos(demoRepos);
      return;
    }

    const load = async () => {
      setLoadingRepos(true);
      try {
        const data = await fetchGithubRepos(token);
        setRepos(data.length > 0 ? data : demoRepos);
        setError(null);
      } catch (e: any) {
        console.warn('Falling back to demo repos', e);
        setRepos(demoRepos);
        setError('Using demo repos because GitHub data was not reachable.');
      } finally {
        setLoadingRepos(false);
      }
    };
    load();
  }, [githubConnected]);

  const filteredRepos = useMemo(() => {
    const q = search.toLowerCase();
    return repos.filter((r) => r.name.toLowerCase().includes(q) || r.full_name.toLowerCase().includes(q));
  }, [repos, search]);

  const handleConnectGithub = () => {
    try {
      const url = buildGithubAuthUrl();
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message || 'Missing GitHub OAuth configuration');
    }
  };

  const toggleRepo = (id: number) => {
    setSelectedRepos((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const handleFinish = () => {
    localStorage.setItem('onboardingComplete', 'true');
    setUserFinished(true);
    if (onComplete) onComplete();
    navigate('/dashboard/projects');
  };

  const renderStepBadge = (step: Step) => {
    const isDone = (step === 1 && githubConnected) || (step === 2 && selectedRepos.length > 0) || (step === 3 && userFinished);
    const isActive = currentStep === step && !isDone;
    return (
      <div
        className={`flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full ${
          isDone
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-800/60'
            : isActive
              ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-800/60'
              : 'bg-muted text-muted-foreground border border-border dark:bg-slate-900/60 dark:border-slate-800'
        }`}
      >
        {isDone ? <CheckCircle2 size={16} /> : <span className="text-xs"> {step}/3 </span>}
        <span>Step {step}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900/80 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
              <Sparkles size={14} /> New workspace onboarding
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Let&apos;s get your repos reviewed</h1>
            <p className="text-muted-foreground max-w-2xl">
              Follow the guided setup to connect GitHub, pick the repositories you want CodeRabbit to watch, and finish with a quick checklist.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {renderStepBadge(currentStep)}
            <div className="text-sm text-muted-foreground">
              {currentStep}/3 steps
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Step 1 */}
        <div className="md:col-span-1 space-y-3 rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            {renderStepBadge(1)}
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Connect</span>
          </div>
          <h3 className="text-xl font-semibold">Link GitHub</h3>
          <p className="text-sm text-muted-foreground">
            Authorize opsNest to list your repositories and enable automated code review and CI/CD hooks.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-emerald-600" /> OAuth scopes: repo, read:user, user:email</li>
            <li className="flex items-center gap-2"><ListChecks size={14} className="text-emerald-600" /> Safe to revoke anytime in GitHub settings</li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              onClick={handleConnectGithub}
              disabled={githubConnected}
              className="h-11 px-5 text-sm font-semibold bg-black text-white hover:bg-black/85 disabled:bg-muted disabled:text-muted-foreground shadow-sm"
            >
              <Github className="mr-2 h-4 w-4" />
              {githubConnected ? 'GitHub connected' : 'Connect GitHub'}
            </Button>
            {githubConnected && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-100 dark:bg-emerald-900/40 dark:border-emerald-800/60 px-3 py-1 rounded-full">
                <CheckCircle2 size={14} /> Token detected
              </span>
            )}
          </div>
          {error && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 dark:text-amber-100 dark:bg-amber-900/40 dark:border-amber-800/70 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Step 2 */}
        <div className="md:col-span-2 rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {renderStepBadge(2)}
                <span className="text-xs uppercase tracking-wide text-muted-foreground">Select</span>
              </div>
              <div>
                <h4 className="text-lg font-semibold">Select repositories</h4>
                <p className="text-sm text-muted-foreground">
                  Choose the repos to sync. We will mirror branches and pull requests for review.
                </p>
              </div>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-lg border border-dashed bg-muted/30 p-3 max-h-72 overflow-auto">
            {loadingRepos ? (
              <p className="text-sm text-muted-foreground px-2">Loading repositories from GitHub...</p>
            ) : filteredRepos.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2">No repositories match your search.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {filteredRepos.map((repo) => {
                  const checked = selectedRepos.includes(repo.id);
                  return (
                    <label
                      key={repo.id}
                      className={`flex items-start gap-3 rounded-lg border bg-white dark:bg-slate-900 p-3 shadow-sm cursor-pointer transition hover:-translate-y-[1px] ${
                        checked
                          ? 'border-blue-500 ring-1 ring-blue-200 dark:border-blue-400 dark:ring-blue-900/60'
                          : 'border-border dark:border-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={checked}
                        onChange={() => toggleRepo(repo.id)}
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{repo.name}</span>
                          <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-200">
                            {repo.owner.login}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{repo.full_name}</p>
                        <p className="text-[11px] text-muted-foreground">Default branch: {repo.default_branch}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{selectedRepos.length} selected</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="font-semibold"
                type="button"
                onClick={() => setSelectedRepos([])}
              >
                Clear
              </Button>
              <Button
                variant="default"
                size="sm"
                className="font-semibold w-full sm:w-auto"
                type="button"
                onClick={() => setUserFinished(false)}
                disabled={!githubConnected || selectedRepos.length === 0}
              >
                Continue to finish
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {renderStepBadge(3)}
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Finish</span>
            </div>
            <div>
              <h4 className="text-lg font-semibold">Finish setup</h4>
              <p className="text-sm text-muted-foreground">
                Confirm and jump into your dashboard. You can revisit setup anytime.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <span className="text-xs text-muted-foreground hidden md:inline-block">
               {githubConnected && selectedRepos.length > 0 ? 'Ready to complete' : 'Complete steps 1 & 2'}
             </span>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
            <h5 className="font-semibold mb-2 flex items-center gap-2"><Github size={16} /> Connection</h5>
            <p className="text-sm text-muted-foreground">
              {githubConnected ? 'GitHub token detected, ready to sync.' : 'Awaiting connection.'}
            </p>
          </div>
          <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
            <h5 className="font-semibold mb-2 flex items-center gap-2"><ListChecks size={16} /> Repositories</h5>
            <p className="text-sm text-muted-foreground">
              {selectedRepos.length > 0 ? `${selectedRepos.length} repository${selectedRepos.length > 1 ? 'ies' : ''} selected.` : 'Select at least one repository.'}
            </p>
          </div>
          <div className="rounded-lg border bg-white dark:bg-slate-900 p-4">
            <h5 className="font-semibold mb-2 flex items-center gap-2"><ShieldCheck size={16} /> Ready to review</h5>
            <p className="text-sm text-muted-foreground">
              We will prepare PR review hooks and branch insights once you complete this flow.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="default"
            size="lg"
            className="font-semibold shadow-sm w-full sm:w-auto"
            type="button"
            onClick={handleFinish}
            disabled={!githubConnected || selectedRepos.length === 0}
          >
            Complete setup <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              localStorage.setItem('onboardingComplete', 'true');
              if (onComplete) onComplete();
              navigate('/dashboard');
            }}
          >
            Skip for now
          </Button>
          {!githubConnected && (
            <span className="text-xs text-muted-foreground">
              Connect GitHub to enable the finish button.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GettingStartedPage;

