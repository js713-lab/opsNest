import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeGithubCode, getGithubToken, validateGithubState } from '@/lib/github';
import { supabase } from '@/lib/supabase';

const GitHubCallbackPage = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Finishing GitHub connection...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const state = params.get('state');
      const errorParam = params.get('error');

      if (errorParam) {
        setError(errorParam);
        setMessage('GitHub authorization denied.');
        return;
      }

      if (!code) {
        setError('Missing code');
        setMessage('GitHub authorization code not found.');
        return;
      }

      if (!validateGithubState(state)) {
        setError('State mismatch');
        setMessage('Security check failed (state mismatch).');
        return;
      }

      if (getGithubToken()) {
        setMessage('GitHub already connected. Redirecting...');
        setTimeout(() => navigate('/dashboard/integrations'), 1200);
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/oauth/github/callback`;
        const token = await exchangeGithubCode(code, redirectUri);
        setMessage('GitHub connected. Saving configuration...');

        setMessage('GitHub connected! Redirecting...');
        setTimeout(() => navigate('/dashboard/integrations'), 1200);
      } catch (err: any) {
        // Graceful fallback for missing backend token exchange in local/dev
        console.warn('GitHub token exchange failed; continuing to integrations.', err);
        setError('Token exchange failed (check VITE_GITHUB_TOKEN_EXCHANGE_URL).');
        setMessage('Connected locally. Redirecting...');
        setTimeout(() => navigate('/dashboard/integrations'), 1200);
      }
    };
    run();
  }, [navigate]);

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-xl font-semibold">GitHub OAuth</h1>
      <p className="text-muted-foreground text-sm">{message}</p>
      {error && <p className="text-sm text-red-600">Error: {error}</p>}
    </div>
  );
};

export default GitHubCallbackPage;

