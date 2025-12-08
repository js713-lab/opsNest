import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Search, Filter, CheckCircle2, Circle, ExternalLink, Box, Bot, Rabbit, Github, PlugZap, Unplug, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { buildGithubAuthUrl, clearGithubToken, getGithubToken } from '@/lib/github';
import { testCodeRabbitConnection } from '@/lib/coderabbit';
import { testGeminiConnection } from '@/lib/gemini';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  connected: boolean;
  config?: any;
}

// Using a separate table in Supabase called 'integrations_config'
// schema: id (uuid), user_id (uuid), provider (text), config (jsonb), is_active (boolean), created_at (timestamptz)

const DOC_LINKS: Record<string, string> = {
  coderabbit: 'https://docs.coderabbit.ai/',
  gemini: 'https://ai.google.dev/api',
  anthropic: 'https://docs.anthropic.com',
  github: 'https://docs.github.com/apps/oauth-apps',
  smtp: 'https://www.rfc-editor.org/rfc/rfc5321',
};

const ENV_DEFAULTS: Record<string, string | undefined> = {
  coderabbit: import.meta.env.VITE_CODERABBIT_API_KEY,
  gemini: import.meta.env.VITE_GEMINI_API_KEY,
  anthropic: import.meta.env.VITE_ANTHROPIC_API_KEY,
};

const ENV_VAR_NAMES: Record<string, string> = {
  coderabbit: 'VITE_CODERABBIT_API_KEY',
  gemini: 'VITE_GEMINI_API_KEY',
  anthropic: 'VITE_ANTHROPIC_API_KEY',
};

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'anthropic',
      name: 'Anthropic AI',
      description: 'Advanced AI models for code generation and analysis.',
      icon: Bot,
      connected: false
    },
    {
      id: 'coderabbit',
      name: 'CodeRabbit',
      description: 'AI-powered code review and pull request analysis.',
      icon: Rabbit,
      connected: false
    },
    // Placeholder for other integrations to match the grid look
    {
      id: 'smtp',
      name: 'SMTP',
      description: 'Configure SMTP to send emails directly from your workspace.',
      icon: Mail,
      connected: false
    },
    {
      id: 'github',
      name: 'GitHub',
      description: 'Sync repositories, branches, commits, and pull requests.',
      icon: Github,
      connected: false
    }
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    apiKey: '',
    environment: 'sandbox',
    aiProvider: 'anthropic',
    model: 'gemini-2.5-flash',
    baseUrl: '',
    host: '',
    port: '',
    username: '',
    password: '',
    fromEmail: '',
    authMethod: 'ssl' as 'ssl' | 'tls' | 'none',
    testEmail: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'connected' | 'disconnected'>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const LOCAL_CONFIG_KEY = 'integrations_config_local';

  const readLocalConfigs = () => {
    try {
      const raw = localStorage.getItem(LOCAL_CONFIG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const writeLocalConfig = (provider: string, config: any) => {
    const existing = readLocalConfigs().filter((c: any) => c.provider !== provider);
    const next = [...existing, { provider, config, is_active: true, updated_at: new Date().toISOString() }];
    localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    const init = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setUserId(null);
        setUserEmail(null);
      } else {
        setUserId(auth.user.id);
        setUserEmail(auth.user.email || null);
      }
      fetchIntegrations(auth.user?.id || null, auth.user?.email || null);
    };
    init();
  }, []);

  const fetchIntegrations = async (uid: string | null = userId, email: string | null = userEmail) => {
    // Only fetch configs scoped to the current user to avoid cross-user leakage
    if (uid) {
      try {
        const { data } = await supabase.from('integrations_config').select('*').eq('user_id', uid);
        if (data) {
          setIntegrations(prev => prev.map(integration => {
            const config = data.find((d: any) => d.provider === integration.id);
            const allowEnv = integration.id === 'anthropic' || integration.id === 'github'
              ? (email || '').toLowerCase() === 'js07ink@gmail.com'
              : true;
            const envKey = allowEnv ? ENV_DEFAULTS[integration.id] : undefined;
            const mergedConfig = config ? config.config : integration.config;
            const withEnvKey = envKey ? { ...(mergedConfig || {}), apiKey: envKey } : mergedConfig;
            const connected = config?.is_active || Boolean(envKey);
            return (config || envKey)
              ? { ...integration, connected, config: withEnvKey }
              : integration;
          }));
          return;
        }
      } catch (e) {
        console.log("Table might not exist yet or network error");
      }
    }

    // Fallback: try localStorage cache (per-browser)
    const localConfigs = readLocalConfigs();
    if (localConfigs.length > 0) {
      setIntegrations(prev =>
        prev.map(integration => {
          const config = localConfigs.find((d: any) => d.provider === integration.id);
          const envKey = ENV_DEFAULTS[integration.id];
          const mergedConfig = config ? config.config : integration.config;
          const withEnvKey = envKey ? { ...(mergedConfig || {}), apiKey: envKey } : mergedConfig;
          const connected = config?.is_active || Boolean(envKey);
          return (config || envKey)
            ? { ...integration, connected, config: withEnvKey }
            : integration;
        })
      );
      return;
    }

    // Fallback: apply env defaults even if table doesn't exist yet
    setIntegrations(prev =>
      prev.map(integration => {
        const allowEnv = integration.id === 'anthropic' || integration.id === 'github'
          ? (userEmail || '').toLowerCase() === 'js07ink@gmail.com'
          : true;
        const envKey = allowEnv ? ENV_DEFAULTS[integration.id] : undefined;
        return envKey
          ? { ...integration, connected: true, config: { ...(integration.config || {}), apiKey: envKey } }
          : integration;
      })
    );
  };

  const handleConnect = (integration: Integration) => {
    if (integration.id === 'github') {
      try {
        const url = buildGithubAuthUrl();
        window.location.href = url;
        return;
      } catch (err: any) {
        toast.error(err.message || 'Missing GitHub OAuth configuration');
        return;
      }
    }

    setSelectedIntegration(integration);
    const allowEnv = integration.id === 'anthropic' || integration.id === 'github'
      ? (userEmail || '').toLowerCase() === 'js07ink@gmail.com'
      : true;
    const envApiKey = allowEnv ? (ENV_DEFAULTS[integration.id] || '') : '';
    const defaultConfig = {
      apiKey: envApiKey,
      environment: 'sandbox',
      aiProvider: 'anthropic',
      model: 'gemini-2.5-flash',
      baseUrl: '',
      host: '',
      port: '',
      username: '',
      password: '',
      fromEmail: '',
      authMethod: 'ssl' as 'ssl' | 'tls' | 'none',
      testEmail: '',
    };
    // Load existing config if available
    if (integration.config) {
      setConfigForm({
        apiKey: integration.config.apiKey || envApiKey || '',
        environment: integration.config.environment || 'sandbox',
        aiProvider: integration.config.aiProvider || 'anthropic',
        model: integration.config.model || 'gemini-2.5-flash',
        baseUrl: integration.config.baseUrl || '',
        host: integration.config.host || '',
        port: integration.config.port || '',
        username: integration.config.username || '',
        password: integration.config.password || '',
        fromEmail: integration.config.fromEmail || '',
        authMethod: integration.config.authMethod || 'ssl',
        testEmail: integration.config.testEmail || '',
      });
    } else {
      setConfigForm(defaultConfig);
    }
    setIsModalOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return;
    if (!userId) {
      toast.error('Please sign in to save integrations.');
      return;
    }
    setIsLoading(true);
    const requiresApiKey = !['smtp', 'github'].includes(selectedIntegration.id);
    const resolvedConfig = {
      ...configForm,
      apiKey: configForm.apiKey || ENV_DEFAULTS[selectedIntegration.id] || '',
      user_id: userId,
    };

    if (requiresApiKey && !resolvedConfig.apiKey) {
      toast.error('API key is required for this integration.');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('integrations_config')
        .upsert({
          provider: selectedIntegration.id,
          config: resolvedConfig,
          is_active: true,
          user_id: userId,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider' });

      if (error) throw error;

      // Update local state
      setIntegrations(prev => prev.map(i => 
        i.id === selectedIntegration.id 
          ? { ...i, connected: true, config: resolvedConfig } 
          : i
      ));
      writeLocalConfig(selectedIntegration.id, resolvedConfig);
      
      setIsModalOpen(false);
      toast.success('Configuration saved successfully');
    } catch (err) {
      console.error('Error saving integration:', err);
      writeLocalConfig(selectedIntegration.id, resolvedConfig);
      setIntegrations(prev => prev.map(i => 
        i.id === selectedIntegration.id 
          ? { ...i, connected: true, config: resolvedConfig } 
          : i
      ));
      toast.warning('Saved locally because Supabase table is missing. Add the migration to persist.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!selectedIntegration) return;
    const provider = selectedIntegration.id;
    const apiKey = configForm.apiKey || ENV_DEFAULTS[provider];

    if (!apiKey && !['smtp', 'github'].includes(provider)) {
      toast.error('Add an API key first to test this integration.');
      return;
    }

    setIsTesting(true);
    try {
      if (provider === 'coderabbit') {
        const result = await testCodeRabbitConnection(apiKey, configForm.baseUrl || undefined);
        if (result.warning) {
          toast.warning(result.warning);
        } else {
          toast.success('CodeRabbit responded (report ping).');
        }
      } else if (provider === 'gemini') {
        await testGeminiConnection({
          apiKey,
          model: configForm.model,
          baseUrl: configForm.baseUrl || undefined,
        });
        toast.success('Gemini responded to the health check.');
      } else if (provider === 'smtp') {
        if (!configForm.host || !configForm.port || !configForm.username || !configForm.password) {
          throw new Error('Host, port, username, and password are required for SMTP test.');
        }
        const payload = {
          host: configForm.host,
          port: Number(configForm.port),
          username: configForm.username,
          password: configForm.password,
          fromEmail: configForm.fromEmail || configForm.username,
          toEmail: configForm.testEmail || configForm.fromEmail || configForm.username,
          authMethod: configForm.authMethod,
        };
        console.info('SMTP test payload (client-side only demo):', payload);
        toast.success(`Would send test email to ${payload.toEmail}. (Hook backend SMTP test here.)`);
      } else {
        toast.info('No live test implemented for this integration yet.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Integration test failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnectGithub = async () => {
    clearGithubToken();
    try {
      if (userId) {
        await supabase.from('integrations_config').delete().eq('provider', 'github').eq('user_id', userId);
      } else {
        await supabase.from('integrations_config').delete().eq('provider', 'github');
      }
    } catch (e) {
      console.warn('Could not delete github integration (demo):', e);
    }
    setIntegrations(prev => prev.map(i => i.id === 'github' ? { ...i, connected: false } : i));
    toast.success('Disconnected GitHub (token cleared locally).');
  };

  useEffect(() => {
    const token = getGithubToken();
    if (token) {
      setIntegrations(prev => prev.map(i => i.id === 'github' ? { ...i, connected: true, config: { token } } : i));
    }
  }, []);

  const handleViewAccount = async (integration: Integration) => {
    if (integration.id === 'github') {
      const token = getGithubToken() || (integration.config as any)?.token;
      if (!token) {
        toast.error('No GitHub token found. Please reconnect.');
        return;
      }
      try {
        const res = await fetch('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
        });
        if (res.status === 401 || res.status === 403) {
          clearGithubToken();
          toast.error('GitHub token expired or invalid. Please reconnect.');
          return;
        }
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Failed to load GitHub user (${res.status}) ${body || res.statusText}`);
        }
        const json = await res.json();
        toast.success(`GitHub: ${json.login || 'connected'}`);
      } catch (e: any) {
        toast.error(e?.message || 'Unable to fetch GitHub account.');
      }
    } else {
      toast.info(`${integration.name} is connected.`);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Integrations & Workflows</h2>
        <p className="text-muted-foreground">Supercharge your workflow and connect the tools you and your team use every day.</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border border-border shadow-sm">
         <div className="relative w-full sm:w-96">
           <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
           <Input
             type="search"
             placeholder="Search integrations..."
             className="pl-9"
             value={search}
             onChange={(e) => setSearch(e.target.value)}
           />
         </div>
         <div className="flex items-center gap-3">
           <label className="text-sm text-muted-foreground flex items-center gap-2">
             <Filter size={14} /> Status
           </label>
           <select
             className="h-10 rounded-md border border-input bg-background px-3 text-sm"
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value as any)}
           >
             <option value="all">All</option>
             <option value="connected">Connected</option>
             <option value="disconnected">Not connected</option>
           </select>
         </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {integrations
          .filter(i => {
            const q = search.toLowerCase();
            const matches = i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
            const statusOk =
              statusFilter === 'all' ||
              (statusFilter === 'connected' && i.connected) ||
              (statusFilter === 'disconnected' && !i.connected);
            return matches && statusOk;
          })
          .map((integration) => (
          <div key={integration.id} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col h-full">
             <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                      <integration.icon size={24} />
                   </div>
                   <div>
                      <h3 className="font-bold text-lg">{integration.name}</h3>
                      <span className="text-xs text-muted-foreground capitalize">Integration</span>
                   </div>
                </div>
                <a
                  href={DOC_LINKS[integration.id] || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                   <ExternalLink size={16} />
                </a>
             </div>
             
             <p className="text-sm text-muted-foreground mb-6 flex-1">
               {integration.description}
             </p>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-auto pt-4 border-t border-border">
              <div className="flex flex-wrap items-center gap-2">
                {integration.id === 'github' ? (
                  integration.connected ? (
                    <>
                      <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={handleDisconnectGithub}>
                        <Unplug className="mr-2 h-4 w-4" /> Disconnect
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="whitespace-nowrap"
                        onClick={() => handleViewAccount(integration)}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" /> View account
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" className="whitespace-nowrap" onClick={() => handleConnect(integration)}>
                      <PlugZap className="mr-2 h-4 w-4" /> Connect with GitHub
                    </Button>
                  )
                ) : (
                  <>
                    <Button
                      variant={integration.connected ? 'default' : 'outline'}
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={() => handleConnect(integration)}
                    >
                      {integration.connected ? 'Configure' : '+ Add Account'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="whitespace-nowrap"
                      onClick={() => handleViewAccount(integration)}
                      disabled={!integration.connected}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" /> View account
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${
                    integration.connected
                      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      : 'text-muted-foreground bg-muted border-border'
                  }`}
                >
                  <Circle size={10} className={integration.connected ? 'text-emerald-500' : 'text-muted-foreground'} />
                  {integration.connected ? 'Connected' : 'Not connected'}
                 </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Config Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${selectedIntegration?.name} Configuration`}
      >
         <div className="space-y-6">
            <div className="space-y-4">
               {/* Show credential environment toggles only where it makes sense */}
               {selectedIntegration && !['smtp', 'coderabbit', 'gemini', 'anthropic'].includes(selectedIntegration.id) && (
                 <>
               <h4 className="text-sm font-medium">Credential Type <span className="text-red-500">*</span></h4>
               
               <div className="grid grid-cols-2 gap-4">
                  <div 
                    className={`cursor-pointer rounded-lg border p-4 transition-all ${configForm.environment === 'sandbox' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setConfigForm({...configForm, environment: 'sandbox'})}
                  >
                     <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${configForm.environment === 'sandbox' ? 'border-primary' : 'border-muted-foreground'}`}>
                           {configForm.environment === 'sandbox' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="font-medium text-sm">Sandbox Credentials</span>
                     </div>
                     <p className="text-xs text-muted-foreground pl-6">For testing environment</p>
                  </div>

                  <div 
                    className={`cursor-pointer rounded-lg border p-4 transition-all ${configForm.environment === 'production' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setConfigForm({...configForm, environment: 'production'})}
                  >
                     <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${configForm.environment === 'production' ? 'border-primary' : 'border-muted-foreground'}`}>
                           {configForm.environment === 'production' && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <span className="font-medium text-sm">Production Credentials</span>
                     </div>
                     <p className="text-xs text-muted-foreground pl-6">For live environment</p>
                  </div>
               </div>
                 </>
               )}

               <div className="space-y-3 pt-2">
                  {selectedIntegration?.id === 'gemini' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Model</label>
                        <Input
                          value={configForm.model}
                          onChange={(e) => setConfigForm({ ...configForm, model: e.target.value })}
                          placeholder="gemini-2.5-flash"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Base URL (optional)</label>
                        <Input
                          value={configForm.baseUrl}
                          onChange={(e) => setConfigForm({ ...configForm, baseUrl: e.target.value })}
                          placeholder="https://generativelanguage.googleapis.com/v1beta/openai"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Defaults to Google&apos;s OpenAI-compatible endpoint; override when proxying or using Vertex AI.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedIntegration?.id === 'coderabbit' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">API Key <span className="text-red-500">*</span></label>
                        <Input
                          value={configForm.apiKey}
                          onChange={(e) => setConfigForm({ ...configForm, apiKey: e.target.value })}
                          placeholder="cr-..."
                          type="password"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Use your CodeRabbit API key (header: x-coderabbitai-api-key).
                        </p>
                        {ENV_DEFAULTS['coderabbit'] && !configForm.apiKey && (
                          <p className="text-[10px] text-muted-foreground">
                            Using VITE_CODERABBIT_API_KEY from your environment.
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Base URL (optional)</label>
                        <Input
                          value={configForm.baseUrl}
                          onChange={(e) => setConfigForm({ ...configForm, baseUrl: e.target.value })}
                          placeholder="https://api.coderabbit.ai/api/v1"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Leave blank for the default CodeRabbit API; override if self-hosted/proxied.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedIntegration?.id === 'smtp' ? (
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">SMTP Host <span className="text-red-500">*</span></label>
                        <Input
                          value={configForm.host}
                          onChange={(e) => setConfigForm({ ...configForm, host: e.target.value })}
                          placeholder="smtp.mailprovider.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Port <span className="text-red-500">*</span></label>
                        <Input
                          value={configForm.port}
                          onChange={(e) => setConfigForm({ ...configForm, port: e.target.value })}
                          placeholder="587"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Username <span className="text-red-500">*</span></label>
                        <Input
                          value={configForm.username}
                          onChange={(e) => setConfigForm({ ...configForm, username: e.target.value })}
                          placeholder="smtp-user"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Password <span className="text-red-500">*</span></label>
                        <Input
                          type="password"
                          value={configForm.password}
                          onChange={(e) => setConfigForm({ ...configForm, password: e.target.value })}
                          placeholder="••••••••"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium block">Encryption</label>
                        <select
                          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                          value={configForm.authMethod}
                          onChange={(e) => setConfigForm({ ...configForm, authMethod: e.target.value as 'ssl' | 'tls' | 'none' })}
                        >
                          <option value="ssl">SSL</option>
                          <option value="tls">TLS/STARTTLS</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">From Email</label>
                        <Input
                          type="email"
                          value={configForm.fromEmail}
                          onChange={(e) => setConfigForm({ ...configForm, fromEmail: e.target.value })}
                          placeholder="alerts@yourdomain.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Test email (optional)</label>
                        <Input
                          type="email"
                          value={configForm.testEmail}
                          onChange={(e) => setConfigForm({ ...configForm, testEmail: e.target.value })}
                          placeholder="you@yourdomain.com"
                        />
                        <p className="text-[10px] text-muted-foreground">Used for the “Test connection” email.</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Your SMTP credentials are encrypted and stored securely.
                      </p>
                    </div>
                  ) : selectedIntegration?.id !== 'coderabbit' ? (
                  <div className="space-y-1">
                     <label className="text-sm font-medium">API Key <span className="text-red-500">*</span></label>
                     <Input 
                       value={configForm.apiKey}
                       onChange={(e) => setConfigForm({...configForm, apiKey: e.target.value})}
                       placeholder="sk-..."
                       type="password"
                     />
                     <p className="text-[10px] text-muted-foreground">
                        Your API key is encrypted and stored securely.
                     </p>
                     {selectedIntegration && ENV_DEFAULTS[selectedIntegration.id] && !configForm.apiKey && (
                       <p className="text-[10px] text-muted-foreground">
                         Using {ENV_VAR_NAMES[selectedIntegration.id]} from your environment.
                       </p>
                     )}
                  </div>
                  ) : null}
               </div>
            </div>

            <div className="flex justify-between pt-4">
               <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                  {isTesting ? 'Testing...' : 'Test connection'}
               </Button>
               <Button onClick={handleSaveConfig} disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Save Configuration'}
               </Button>
            </div>
         </div>
      </Modal>
    </div>
  );
};

export default IntegrationsPage;
