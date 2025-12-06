import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Link } from 'react-router-dom';
import { Code2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import AuthShowcase from '@/components/auth/AuthShowcase';

const ForgotPasswordPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        const message = error.message?.toLowerCase() || '';
        if (message.includes('user') && message.includes('not') && message.includes('found')) {
          toast.error('No account is registered with that email.');
        } else {
          toast.error(error.message || 'Failed to send reset email');
        }
        return;
      }

      toast.success('Password reset email sent if the account exists.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-mono bg-white text-slate-900">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 p-8 flex flex-col justify-center items-center bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="flex items-center gap-2 mb-8">
            <Code2 className="h-8 w-8" />
            <span className="font-bold text-xl">CODECRAFTER_</span>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight">Forgot password</h2>
            <p className="text-muted-foreground mt-2">Enter your email to reset your password</p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="email">
                Email
              </label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                id="email"
                placeholder="you@example.com"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Reset Email
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link to="/login" className="font-bold text-foreground hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <AuthShowcase />
    </div>
  );
};

export default ForgotPasswordPage;

