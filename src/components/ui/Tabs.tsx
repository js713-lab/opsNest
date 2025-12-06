import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs = ({ defaultValue, value, onValueChange, children, className }: TabsProps) => {
  const isControlled = value !== undefined;
  const [activeTab, setActiveTab] = useState(value ?? defaultValue ?? '');

  // Sync controlled value into internal state for rendering
  React.useEffect(() => {
    if (isControlled && value !== activeTab) {
      setActiveTab(value as string);
    }
  }, [isControlled, value, activeTab]);

  const handleSetActive = (next: string) => {
    if (!isControlled) {
      setActiveTab(next);
    }
    onValueChange?.(next);
  };

  return (
    <div className={cn("w-full", className)}>
       {React.Children.map(children, child => {
         if (React.isValidElement(child)) {
            return React.cloneElement(child as any, { activeTab, setActiveTab: handleSetActive });
         }
         return child;
       })}
    </div>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
  className?: string;
}

export const TabsList = ({ children, activeTab, setActiveTab, className }: TabsListProps) => {
  return (
    <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>
      {React.Children.map(children, child => {
         if (React.isValidElement(child)) {
            return React.cloneElement(child as any, { 
              isActive: activeTab === child.props.value, 
              onClick: () => setActiveTab?.(child.props.value) 
            });
         }
         return child;
      })}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
}

export const TabsTrigger = ({ value, children, isActive, onClick, className }: TabsTriggerProps) => {
  return (
    <button
      aria-pressed={isActive}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border",
        isActive
          ? "bg-slate-900 text-white shadow-md border-slate-900"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900",
        className
      )}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
}

export const TabsContent = ({ value, children, activeTab }: TabsContentProps) => {
  if (value !== activeTab) return null;
  return (
    <div className="mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      {children}
    </div>
  );
};

