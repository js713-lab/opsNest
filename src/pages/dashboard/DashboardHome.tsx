import React, { useEffect, useState } from 'react';
import { BarChart3, Globe, GitBranch, Activity, PlayCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import GettingStartedPage from './GettingStartedPage';
import { supabase, listProjects } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const DashboardHome = () => {
  const navigate = useNavigate();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => localStorage.getItem('onboardingComplete') === 'true');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    projects: 0,
    environments: 0,
    pipelines: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [userName, setUserName] = useState<string>('Dev');

  useEffect(() => {
    const handler = () => {
      setOnboardingComplete(localStorage.getItem('onboardingComplete') === 'true');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        // User
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserName(user.email.split('@')[0]);
        }

        // Stats
        const projects = await listProjects();
        
        // Since we don't have listAllEnvironments etc, we'll fetch them for the top projects or use raw count
        // For a dashboard summary, a raw count query is better but RLS might restrict.
        // We will just use what we can get from standard queries or iterate.
        // For MVP, let's iterate top 5 projects to get activity.
        
        const projectIds = projects.map(p => p.id);
        let envCount = 0;
        let pipeCount = 0;
        let activities: any[] = [];

        // Parallel fetch for top 5 projects to populate activity feed
        const topProjects = projects.slice(0, 5);
        await Promise.all(topProjects.map(async (p) => {
            // Environments
            const { data: envs } = await supabase.from('environments').select('id, status, created_at').eq('project_id', p.id);
            if (envs) {
                envCount += envs.filter(e => e.status === 'RUNNING').length;
                envs.forEach(e => {
                   activities.push({
                     type: 'environment',
                     action: 'Environment created',
                     project: p.name,
                     time: e.created_at,
                     color: 'bg-green-500'
                   });
                });
            }

            // Pipelines
            const { data: runs } = await supabase.from('pipeline_runs').select('id, status, created_at').eq('project_id', p.id);
            if (runs) {
                pipeCount += runs.length; // Total runs or maybe active? Let's do total recent.
                runs.forEach(r => {
                   activities.push({
                     type: 'pipeline',
                     action: `Pipeline ${r.status.toLowerCase()}`,
                     project: p.name,
                     time: r.created_at,
                     color: r.status === 'COMPLETED' ? 'bg-blue-500' : r.status === 'FAILED' ? 'bg-red-500' : 'bg-yellow-500'
                   });
                });
            }

            // Index jobs
            const { data: jobs } = await supabase.from('index_jobs').select('id, status, created_at').eq('project_id', p.id);
            if (jobs) {
                jobs.forEach(j => {
                   activities.push({
                     type: 'index',
                     action: `Index job ${j.status.toLowerCase()}`,
                     project: p.name,
                     time: j.created_at,
                     color: 'bg-purple-500'
                   });
                });
            }
        }));

        setStats({
            projects: projects.length,
            environments: envCount,
            pipelines: pipeCount
        });

        // Sort and slice activity
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        setRecentActivity(activities.slice(0, 5));

      } catch (e) {
        console.error('Dashboard load error', e);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const statCards = [
    { label: 'Total Projects', value: stats.projects, icon: BarChart3, desc: 'Active projects' },
    { label: 'Running Envs', value: stats.environments, icon: Globe, desc: 'Active deployments' },
    { label: 'Recent Pipelines', value: stats.pipelines, icon: PlayCircle, desc: 'Builds & checks' },
  ];

  if (!onboardingComplete) {
    return <GettingStartedPage onComplete={() => setOnboardingComplete(true)} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, {userName}!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{loading ? '-' : stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5" /> Recent Activity
          </h3>
          <p className="text-sm text-muted-foreground">Your latest infrastructure activities</p>
        </div>
        <div className="p-6 pt-0">
          <div className="space-y-8">
            {loading ? (
                 <p className="text-sm text-muted-foreground">Loading activity...</p>
            ) : recentActivity.length === 0 ? (
                 <p className="text-sm text-muted-foreground">No recent activity found.</p>
            ) : (
                recentActivity.map((item, i) => (
              <div key={i} className="flex items-center">
                <span className={`relative flex h-2 w-2 mr-4 rounded-full ${item.color}`} />
                <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{item.action} <span className="text-muted-foreground font-normal">on {item.project}</span></p>
                      <p className="text-sm text-muted-foreground">
                        {item.time ? formatDistanceToNow(new Date(item.time), { addSuffix: true }) : 'Just now'}
                      </p>
                </div>
              </div>
                ))
            )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> Alerts
                </h3>
                 <p className="text-sm text-muted-foreground">System notifications and warnings</p>
            </div>
            <div className="p-6 pt-0">
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
                         <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                         <div>
                             <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-500">Plan Limit Approaching</h4>
                             <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">You have used 80% of your pipeline minutes this month.</p>
                         </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                         <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-500 shrink-0 mt-0.5" />
                         <div>
                             <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-500">System Update</h4>
                             <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Maintenance scheduled for Saturday 2 AM UTC.</p>
                         </div>
                    </div>
                </div>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'View Projects', action: () => navigate('/dashboard/projects') },
            { name: 'View Messages', action: () => navigate('/dashboard/messages') },
            { name: 'Manage Repositories', action: () => navigate('/dashboard/repositories') },
            { name: 'Integrations Settings', action: () => navigate('/dashboard/integrations') }
          ].map((item) => (
            <Button key={item.name} variant="outline" className="h-24 flex flex-col gap-2" onClick={item.action}>
               {item.name}
            </Button>
          ))}
       </div>
    </div>
  );
};

export default DashboardHome;

