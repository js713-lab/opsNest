import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Search, Filter, Play, CheckCircle2, XCircle, AlertCircle, RefreshCw, LayoutGrid, List, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TestingPage = () => {
  const [view, setView] = useState<'overview' | 'cases'>('cases');
  
  const tests = [
    { id: 'TC_Auth_001', module: 'Authentication', scenario: 'Verify login with valid credentials', status: 'PASSED', duration: '1.2s', lastRun: '2 hours ago', source: 'Auto-gen' },
    { id: 'TC_Auth_002', module: 'Authentication', scenario: 'Verify login with invalid password', status: 'FAILED', duration: '0.8s', lastRun: '2 hours ago', source: 'Auto-gen' },
    { id: 'TC_Auth_003', module: 'Authentication', scenario: 'Verify password reset flow', status: 'PENDING', duration: '2.1s', lastRun: '1 hour ago', source: 'Auto-gen' },
    { id: 'TC_API_001', module: 'API Gateway', scenario: 'Verify GET /users endpoint', status: 'PASSED', duration: '0.3s', lastRun: '2 hours ago', source: 'Auto-gen' },
    { id: 'TC_API_002', module: 'API Gateway', scenario: 'Verify POST /users endpoint validation', status: 'RUNNING', duration: '-', lastRun: 'Running now', source: 'Auto-gen' },
    { id: 'TC_UI_001', module: 'Dashboard', scenario: 'Verify dashboard loads with user data', status: 'PENDING', duration: '3.4s', lastRun: '30 minutes ago', source: 'Auto-gen' },
    { id: 'TC_Payment_001', module: 'Payment', scenario: 'Verify checkout flow completion', status: 'FAILED', duration: '5.2s', lastRun: '1 hour ago', source: 'Auto-gen' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED': 
        return <span className="flex items-center gap-1.5 text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full text-xs font-medium"><CheckCircle2 size={12} /> PASSED</span>;
      case 'FAILED': 
        return <span className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full text-xs font-medium"><XCircle size={12} /> FAILED</span>;
      case 'PENDING': 
        return <span className="flex items-center gap-1.5 text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full text-xs font-medium"><AlertCircle size={12} /> PENDING REVIEW</span>;
      case 'RUNNING': 
        return <span className="flex items-center gap-1.5 text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full text-xs font-medium"><RefreshCw size={12} className="animate-spin" /> RUNNING</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Testing Dashboard</h2>
          <p className="text-muted-foreground text-sm mt-1">Auto-generated test cases from code indexing · 3 awaiting review</p>
        </div>
        
        {/* View Switcher */}
        <div className="bg-muted p-1 rounded-lg inline-flex">
           <button
             onClick={() => setView('overview')}
             className={cn(
               "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
               view === 'overview' 
                 ? "bg-background text-foreground shadow-sm" 
                 : "text-muted-foreground hover:text-foreground"
             )}
           >
             <LayoutGrid size={16} />
             Overview
           </button>
           <button
             onClick={() => setView('cases')}
             className={cn(
               "flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
               view === 'cases' 
                 ? "bg-background text-foreground shadow-sm" 
                 : "text-muted-foreground hover:text-foreground"
             )}
           >
             <List size={16} />
             Test Cases
           </button>
        </div>
      </div>

      {view === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Overview Content Placeholder */}
          <div className="col-span-1 md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-sm text-muted-foreground">Total Tests</div>
                <div className="text-2xl font-bold mt-1">142</div>
                <div className="text-xs text-green-500 mt-1 flex items-center gap-1">+12 this week</div>
             </div>
             <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-sm text-muted-foreground">Pass Rate</div>
                <div className="text-2xl font-bold mt-1">94.2%</div>
                <div className="text-xs text-green-500 mt-1 flex items-center gap-1">+2.1% this week</div>
             </div>
             <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-sm text-muted-foreground">Failed</div>
                <div className="text-2xl font-bold mt-1 text-red-500">8</div>
                <div className="text-xs text-red-500 mt-1 flex items-center gap-1">Needs attention</div>
             </div>
             <div className="p-4 rounded-lg border border-border bg-card">
                <div className="text-sm text-muted-foreground">Pending Review</div>
                <div className="text-2xl font-bold mt-1 text-yellow-500">3</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">Action required</div>
             </div>
          </div>
          
          <div className="col-span-1 md:col-span-3 p-12 border border-border border-dashed rounded-lg bg-muted/30 flex flex-col items-center justify-center text-center">
             <LayoutGrid className="h-12 w-12 text-muted-foreground/50 mb-4" />
             <h3 className="text-lg font-medium">Detailed Overview Coming Soon</h3>
             <p className="text-muted-foreground text-sm max-w-md mt-2">
               We are building comprehensive charts and insights to help you visualize your testing coverage and performance metrics.
             </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border border-border shadow-sm">
             <div className="relative w-full sm:w-96">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <input
                 type="search"
                 placeholder="Search test cases..."
                 className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-ring"
               />
             </div>
             <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none justify-between gap-2">
                   All Modules <Filter size={14} />
                </Button>
                <Button variant="outline" className="flex-1 sm:flex-none justify-between gap-2">
                   All Status <Filter size={14} />
                </Button>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                   <Play size={14} /> Run All Tests
                </Button>
             </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium">Test ID</th>
                    <th className="px-6 py-3 font-medium">Module</th>
                    <th className="px-6 py-3 font-medium">Scenario</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Duration</th>
                    <th className="px-6 py-3 font-medium">Last Run</th>
                    <th className="px-6 py-3 font-medium">Source</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tests.map((test) => (
                    <tr key={test.id} className="bg-card hover:bg-accent/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-blue-500">{test.id}</td>
                      <td className="px-6 py-4">{test.module}</td>
                      <td className="px-6 py-4 font-medium">{test.scenario}</td>
                      <td className="px-6 py-4">{getStatusBadge(test.status)}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">{test.duration}</td>
                      <td className="px-6 py-4 text-muted-foreground">{test.lastRun}</td>
                      <td className="px-6 py-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <RefreshCw size={10} /> {test.source}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8">
                           <div className="flex items-center gap-2 text-xs">
                             <span>Details</span>
                             <ArrowUpRight size={12} />
                           </div>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestingPage;
