import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';

interface PipelineRun {
  id: string;
  branch: string;
  trigger_event: string;
  status: string;
  duration: string;
  created_at: string;
}

const SDLCPage = () => {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock stages for the visual pipeline (in a real app, this would be dynamic per run)
  const stages = [
    {
      id: 'plan',
      name: 'Plan',
      status: 'completed',
      items: [
        { name: 'Requirements Gathering', duration: '2h' },
        { name: 'Architecture Design', duration: '4h 30m' },
        { name: 'Sprint Planning', duration: '1h 45m' }
      ],
      color: 'text-purple-500 border-purple-500'
    },
    {
      id: 'code',
      name: 'Code',
      status: 'completed',
      items: [
        { name: 'Feature Development', duration: '12h 20m' },
        { name: 'Code Review', duration: '45m' },
        { name: 'Merge to Main', duration: '5m' }
      ],
      color: 'text-blue-500 border-blue-500'
    },
    {
      id: 'test',
      name: 'Test',
      status: 'running',
      items: [
        { name: 'Unit Tests', duration: '3m 12s' },
        { name: 'Integration Tests', duration: 'Running...' },
        { name: 'E2E Tests', duration: '-' }
      ],
      color: 'text-green-500 border-green-500'
    },
    {
      id: 'deploy',
      name: 'Deploy',
      status: 'pending',
      items: [
        { name: 'Build Artifacts', duration: '-' },
        { name: 'Deploy to Staging', duration: '-' },
        { name: 'Production Release', duration: '-' }
      ],
      color: 'text-orange-500 border-orange-500'
    }
  ];

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      // In a real scenario, we'd join with projects, but for now just fetch runs
      // Assuming RLS allows us to see runs for our projects
      const { data, error } = await supabase
        .from('pipeline_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) {
        setRuns(data);
      }
      
      // If empty (because no data yet), keep mock data or show empty state?
      // For this demo, let's just use the state.
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">SDLC Pipeline</h2>
          <p className="text-muted-foreground">Plan → Code → Test → Deploy</p>
        </div>
        <Button>
           <PlayCircle className="mr-2 h-4 w-4" /> Run Pipeline
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stages.map((stage) => (
          <div key={stage.id} className={`relative rounded-xl border bg-card p-6 shadow-sm ${stage.status === 'running' ? 'ring-2 ring-primary' : ''}`}>
             {/* Connector Line (Desktop) */}
             {stage.id !== 'deploy' && (
                <div className="hidden lg:block absolute top-1/2 -right-9 w-6 h-0.5 bg-border -translate-y-1/2 z-0" />
             )}

             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                   <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center ${stage.color}`}>
                      {stage.status === 'completed' ? <CheckCircle2 size={16} /> : 
                       stage.status === 'running' ? <Clock size={16} className="animate-spin" /> :
                       <Circle size={16} />}
                   </div>
                   <h3 className="font-bold text-lg">{stage.name}</h3>
                </div>
                <Clock size={16} className="text-muted-foreground" />
             </div>

             <div className="space-y-4">
               {stage.items.map((item, i) => (
                 <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                       {stage.status === 'completed' ? <CheckCircle2 size={14} className="text-green-500" /> : 
                        (stage.status === 'running' && item.duration === 'Running...') ? <Clock size={14} className="text-blue-500 animate-spin" /> :
                        <Circle size={14} className="text-muted-foreground" />}
                       <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-mono text-xs">{item.duration}</span>
                 </div>
               ))}
             </div>
          </div>
        ))}
      </div>

      {/* Recent Runs */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
         <div className="p-6 border-b border-border">
            <h3 className="font-semibold">Recent Pipeline Runs</h3>
         </div>
         <div className="p-0">
            {isLoading ? (
               <div className="p-8 flex justify-center">
                  <Loader2 className="animate-spin text-muted-foreground" />
               </div>
            ) : runs.length === 0 ? (
               <div className="p-8 text-center text-muted-foreground">
                  No pipeline runs found.
               </div>
            ) : (
               runs.map((run) => (
               <div key={run.id} className="flex items-center justify-between p-4 border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                     <div className={`h-8 w-8 rounded-full flex items-center justify-center bg-muted text-xs font-bold ${run.status === 'FAILED' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                        {run.status === 'COMPLETED' ? <CheckCircle2 size={16} /> : run.status === 'FAILED' ? <AlertCircle size={16} /> : <Circle size={16} />}
                     </div>
                     <div>
                        <div className="font-bold font-mono">{run.id.slice(0, 8)}... <span className="text-muted-foreground font-normal text-sm">· {run.branch} · {run.trigger_event}</span></div>
                        <div className="text-xs text-muted-foreground">{formatTimeAgo(run.created_at)}</div>
                     </div>
                  </div>
                  <div className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${run.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : run.status === 'FAILED' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                     {run.status}
                  </div>
                  <div className="font-mono text-sm text-muted-foreground hidden md:block">
                     {run.duration || '-'}
                  </div>
               </div>
            )))}
         </div>
      </div>
    </div>
  );
};

export default SDLCPage;
