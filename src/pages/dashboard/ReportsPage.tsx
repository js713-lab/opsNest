import React from 'react';
import { Button } from '@/components/ui/Button';
import { BarChart, Download } from 'lucide-react';

const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground">
            Coming soon — exportable summaries for deployments, tests, and audits.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" disabled>
            <Download size={14} /> Export CSV
          </Button>
          <Button size="sm" className="gap-2" disabled>
            <BarChart size={14} /> Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {['Deployments', 'Test Runs', 'Incidents'].map((title) => (
          <div key={title} className="rounded-lg border border-dashed bg-card p-4 shadow-sm">
            <div className="text-sm text-muted-foreground mb-2">{title}</div>
            <div className="text-sm text-muted-foreground">
              Placeholder data. Detailed charts and exports will appear here.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;

