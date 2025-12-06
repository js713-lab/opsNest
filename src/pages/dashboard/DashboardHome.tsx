import React, { useEffect, useState } from 'react';
import { BarChart3, Users, DollarSign, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import GettingStartedPage from './GettingStartedPage';

const DashboardHome = () => {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => localStorage.getItem('onboardingComplete') === 'true');

  useEffect(() => {
    const handler = () => {
      setOnboardingComplete(localStorage.getItem('onboardingComplete') === 'true');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const stats = [
    { label: 'Total Projects', value: '12', change: '+2 from last month', icon: BarChart3 },
    { label: 'Active Users', value: '2,350', change: '+180 from last month', icon: Users },
    { label: 'Revenue', value: '$45,231', change: '+20.1% from last month', icon: DollarSign },
  ];

  if (!onboardingComplete) {
    return <GettingStartedPage onComplete={() => setOnboardingComplete(true)} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, js07ink!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5" /> Recent Activity
          </h3>
          <p className="text-sm text-muted-foreground">Your latest infrastructure activities</p>
        </div>
        <div className="p-6 pt-0">
          <div className="space-y-8">
            {[
              { action: 'Server deployment completed', time: '2 minutes ago', color: 'bg-green-500' },
              { action: 'Database backup created', time: '1 hour ago', color: 'bg-blue-500' },
              { action: 'SSL certificate renewed', time: '3 hours ago', color: 'bg-yellow-500' },
            ].map((item, i) => (
              <div key={i} className="flex items-center">
                <span className={`relative flex h-2 w-2 mr-4 rounded-full ${item.color}`} />
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">{item.action}</p>
                  <p className="text-sm text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {['Analytics', 'Team', 'Settings', 'Billing'].map((action) => (
            <Button key={action} variant="outline" className="h-24 flex flex-col gap-2">
               {/* Icons would go here */}
               {action}
            </Button>
          ))}
       </div>
    </div>
  );
};

export default DashboardHome;

