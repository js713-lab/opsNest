import React from 'react';

const GenericPage = ({ title }: { title: string }) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">This module is currently under development.</p>
      </div>
      <div className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-lg bg-muted/10">
        <div className="text-center">
          <p className="text-muted-foreground">Content for {title} will appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default GenericPage;

