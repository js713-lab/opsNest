import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fetchGithubRepos, getGithubToken, GithubRepo } from '@/lib/github';
import { supabase } from '@/lib/supabase';
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

type TokenSource = 'local' | 'supabase' | null;

const RepositoriesPage = () => {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [tokenSource, setTokenSource] = useState<TokenSource>(null);

  const loadRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      let token = getGithubToken();
      let source: TokenSource = token ? 'local' : null;

      // Fallback to Supabase-stored token if localStorage is empty.
      if (!token) {
        const { data } = await supabase
          .from('integrations_config')
          .select('config')
          .eq('provider', 'github')
          .limit(1);
        const configToken = data?.[0]?.config?.token as string | undefined;
        if (configToken) {
          token = configToken;
          source = 'supabase';
        }
      }

      if (!token) {
        setError('Connect GitHub in Integrations first, then retry.');
        setRepos([]);
        setTokenSource(null);
        return;
      }

      const list = await fetchGithubRepos(token);
      setRepos(list);
      setTokenSource(source);
    } catch (err: any) {
      setError(err?.message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.name.toLowerCase().includes(q) || r.full_name.toLowerCase().includes(q));
  }, [repos, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Repositories</h2>
          <p className="text-muted-foreground text-sm">
            GitHub repos available to your workspace. Connect GitHub in Integrations to refresh this list.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tokenSource && (
            <span className="text-xs text-muted-foreground">
              Token source: {tokenSource === 'local' ? 'local storage' : 'Supabase'}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={loadRepos} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Input
            type="search"
            placeholder="Search repositories..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">🔍</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {loading ? 'Loading repositories...' : `${filtered.length} repo${filtered.length === 1 ? '' : 's'}`}
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-800 px-4 py-3 rounded-md text-sm">
          {error}{' '}
          {error.toLowerCase().includes('connect') && (
            <Link to="/dashboard/integrations" className="underline">
              Go to Integrations
            </Link>
          )}
        </div>
      )}

      {!error && !loading && filtered.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          No repositories match your search.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((repo) => (
          <div key={repo.id} className="border border-border rounded-lg p-4 bg-card shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="font-semibold text-base">{repo.name}</div>
                <div className="text-xs text-muted-foreground">{repo.full_name}</div>
              </div>
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Open ${repo.name} on GitHub`}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
            <div className="text-xs text-muted-foreground flex gap-3">
              <span>Default branch: {repo.default_branch}</span>
              <span>Owner: {repo.owner?.login}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RepositoriesPage;

