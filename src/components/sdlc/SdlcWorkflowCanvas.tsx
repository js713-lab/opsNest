import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeProps,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Beaker,
  Clock3,
  Database,
  FileText,
  GitFork,
  Layers,
  ListChecks,
  Mail,
  PanelBottom,
  PanelLeftClose,
  PanelRightOpen,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  Save,
  Share2,
  Split,
  TimerReset,
  User,
  Workflow,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { getSdlcWorkflow, saveSdlcWorkflow, SdlcWorkflowViewMode } from '@/lib/supabase';
import { CanvasNodeData } from './types';
import { computeGanttRows } from './gantt';

const nodeBadge = (status?: CanvasNodeData['status']) => {
  if (status === 'done') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'in_progress') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const SdlcNode = ({ data }: NodeProps<CanvasNodeData>) => (
  <div className="rounded-lg border border-slate-200 bg-white shadow-sm px-3 py-2 min-w-[190px]">
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{data.category || 'Task'}</p>
        <p className="font-semibold text-sm leading-tight">{data.label}</p>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${nodeBadge(data.status)}`}>
        {data.status ? data.status.replace('_', ' ') : 'pending'}
      </span>
    </div>
    {data.actions && data.actions.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {data.actions.slice(0, 4).map((action) => (
          <span
            key={action}
            className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600"
          >
            {action}
          </span>
        ))}
      </div>
    )}
  </div>
);

const nodeTypes = { sdlc: SdlcNode };

const defaultNodes: Node<CanvasNodeData>[] = [
  {
    id: 'start',
    type: 'sdlc',
    position: { x: -80, y: 120 },
    data: { label: 'Start', category: 'Trigger', status: 'done', actions: ['Document event'], startDay: 0, durationDays: 0.5 },
  },
  {
    id: 'planning',
    type: 'sdlc',
    position: { x: 140, y: 40 },
    data: {
      label: 'Planning / Requirements',
      category: 'Planning',
      status: 'in_progress',
      actions: ['Gantt', 'Flows', 'Use cases', 'Docs', 'Minutes', 'Notes'],
      startDay: 1,
      durationDays: 4,
    },
  },
  {
    id: 'design',
    type: 'sdlc',
    position: { x: 140, y: 220 },
    data: {
      label: 'Design',
      category: 'Design',
      status: 'pending',
      actions: ['DB design', 'Low-fi', 'System diagram'],
      startDay: 5,
      durationDays: 3,
    },
  },
  {
    id: 'check_amount',
    type: 'sdlc',
    position: { x: 420, y: 40 },
    data: {
      label: 'Gate: Definition of Ready',
      category: 'Condition',
      status: 'pending',
      actions: ['Requirements locked', 'Risks logged', 'Owners set'],
      startDay: 9,
      durationDays: 1,
    },
  },
  {
    id: 'development',
    type: 'sdlc',
    position: { x: 680, y: 10 },
    data: {
      label: 'Development',
      category: 'Execution',
      status: 'in_progress',
      actions: ['Pipelines', 'Reviews', 'Feature checklist'],
      startDay: 10,
      durationDays: 7,
    },
  },
  {
    id: 'testing',
    type: 'sdlc',
    position: { x: 680, y: 170 },
    data: {
      label: 'Testing',
      category: 'Quality',
      status: 'pending',
      actions: ['Cases', 'Scenarios', 'Results', 'Bug queue'],
      startDay: 16,
      durationDays: 5,
    },
  },
  {
    id: 'uat',
    type: 'sdlc',
    position: { x: 920, y: 90 },
    data: {
      label: 'UAT',
      category: 'Customer',
      status: 'pending',
      actions: ['Scripts', 'Sign-offs', 'Rollout plan'],
      startDay: 21,
      durationDays: 3,
    },
  },
  {
    id: 'deployment',
    type: 'sdlc',
    position: { x: 1150, y: 120 },
    data: {
      label: 'Deployment / Maintenance',
      category: 'Ops',
      status: 'pending',
      actions: ['Env matrix', 'Scripts', 'Domains', 'Backups', 'Monitoring'],
      startDay: 25,
      durationDays: 4,
    },
  },
];

const defaultEdges: Edge[] = [
  { id: 'e0', source: 'start', target: 'planning', type: 'smoothstep' },
  { id: 'e1', source: 'start', target: 'design', type: 'smoothstep' },
  { id: 'e2', source: 'planning', target: 'check_amount', type: 'smoothstep' },
  { id: 'e3', source: 'design', target: 'check_amount', type: 'smoothstep' },
  { id: 'e4', source: 'check_amount', target: 'development', type: 'smoothstep' },
  { id: 'e5', source: 'check_amount', target: 'testing', type: 'smoothstep' },
  { id: 'e6', source: 'development', target: 'uat', type: 'smoothstep' },
  { id: 'e7', source: 'testing', target: 'uat', type: 'smoothstep' },
  { id: 'e8', source: 'uat', target: 'deployment', type: 'smoothstep' },
];

const palette = [
  { key: 'task', label: 'Task', icon: <ListChecks size={14} />, category: 'Task', actions: ['Assignee', 'Checklist'] },
  { key: 'email', label: 'Email', icon: <Mail size={14} />, category: 'Communication', actions: ['Template', 'Recipients'] },
  { key: 'parallel', label: 'Parallel task', icon: <Split size={14} />, category: 'Parallel', actions: ['Branch A', 'Branch B'] },
  { key: 'condition', label: 'Condition', icon: <GitFork size={14} />, category: 'Gate', actions: ['<10000', '>10000'] },
  { key: 'assign', label: 'Assign data', icon: <Layers size={14} />, category: 'Data', actions: ['Map fields'] },
  { key: 'wait', label: 'Wait for event', icon: <PauseCircle size={14} />, category: 'Event', actions: ['Webhook', 'Signal'] },
  { key: 'delay', label: 'Time delay', icon: <Clock3 size={14} />, category: 'Delay', actions: ['Hours', 'Days'] },
  { key: 'list', label: 'List view', icon: <PanelBottom size={14} />, category: 'List', actions: ['Checklist'] },
  { key: 'variables', label: 'Variables', icon: <Beaker size={14} />, category: 'Variables', actions: ['Context'] },
  { key: 'validation', label: 'Validation', icon: <TimerReset size={14} />, category: 'Validation', actions: ['Rules'] },
];

const diagramPalette = [
  { key: 'actor', label: 'Actor', icon: <User size={14} />, category: 'Actor', actions: ['Role'] },
  { key: 'system', label: 'System', icon: <Layers size={14} />, category: 'System', actions: ['Boundary'] },
  { key: 'process', label: 'Process', icon: <Split size={14} />, category: 'Process', actions: ['Step'] },
  { key: 'datastore', label: 'Data store', icon: <Database size={14} />, category: 'Data', actions: ['CRUD'] },
  { key: 'external', label: 'External', icon: <PanelBottom size={14} />, category: 'External', actions: ['Integration'] },
  { key: 'note', label: 'Note', icon: <FileText size={14} />, category: 'Note', actions: ['Context'] },
];

const defaultViewport = { x: 0, y: 0, zoom: 0.9 };

type Props = {
  projectId?: string;
  hideHeaderActions?: boolean;
};

export type SdlcWorkflowCanvasHandle = {
  save: () => Promise<void>;
  publishDraft: () => void;
  fitView: () => void;
};

export const SdlcWorkflowCanvas = forwardRef<SdlcWorkflowCanvasHandle, Props>(({ projectId, hideHeaderActions }, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNodeData>(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
  const [viewMode, setViewMode] = useState<SdlcWorkflowViewMode>('workflow');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!projectId);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [version, setVersion] = useState<number>(1);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isDemo = !projectId || projectId.startsWith('demo');
  const [mermaidSnippet, setMermaidSnippet] = useState<string>('A-->B\nB-->C');

  const displayedEdges = useMemo(() => {
    const marker =
      viewMode === 'workflow'
        ? { type: MarkerType.ArrowClosed, color: '#0f172a', width: 16, height: 16 }
        : undefined;
    return edges.map((edge) => ({
      ...edge,
      markerEnd: marker,
      style: viewMode === 'workflow' ? { stroke: '#0f172a', strokeWidth: 2 } : edge.style,
    }));
  }, [edges, viewMode]);

  const handleSave = useCallback(
    async (quiet?: boolean) => {
      if (isDemo || !projectId) {
        setIsDirty(false);
        setLastSaved(new Date().toISOString());
        return;
      }
      setSaving(true);
      try {
        const saved = await saveSdlcWorkflow(projectId, {
          data: { nodes, edges },
          view_mode: viewMode,
          version: version + 1,
        });
        setVersion(saved.version || version + 1);
        setLastSaved(new Date().toISOString());
        setIsDirty(false);
        if (!quiet) toast.success('SDLC workflow saved');
      } catch (err) {
        console.error(err);
        toast.error('Failed to save SDLC workflow');
      } finally {
        setSaving(false);
      }
    },
    [edges, nodes, projectId, version, viewMode, isDemo]
  );

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      setLastSaved(new Date().toISOString());
      return;
    }
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const existing = await getSdlcWorkflow(projectId);
        if (cancelled) return;
        if (existing?.data?.nodes && existing?.data?.edges) {
          setNodes(existing.data.nodes as Node<CanvasNodeData>[]);
          setEdges(existing.data.edges as Edge[]);
          setViewMode((existing.view_mode as SdlcWorkflowViewMode) || 'workflow');
          setVersion(existing.version || 1);
          setLastSaved(existing.updated_at || existing.created_at || null);
        } else {
          setIsDirty(true);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load SDLC workflow');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, setEdges, setNodes, isDemo]);

  useEffect(() => {
    if (isDemo) return;
    if (!isDirty || !projectId) return;
    const timer = setTimeout(() => {
      handleSave(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [edges, nodes, viewMode, isDirty, projectId, handleSave, isDemo]);

  const onConnect = useCallback(
    (connection: Connection | Edge) => {
      setEdges((eds) => addEdge(connection, eds));
      setIsDirty(true);
    },
    [setEdges]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const payload = event.dataTransfer.getData('application/reactflow');
      if (!payload) return;
      const data = JSON.parse(payload) as (typeof palette)[number];
      if (!reactFlowInstance || !wrapperRef.current) return;
      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      const id = crypto.randomUUID();
      const newNode: Node<CanvasNodeData> = {
        id,
        type: 'sdlc',
        position,
        data: {
          label: data.label,
          category: data.category,
          actions: data.actions,
          status: 'pending',
          startDay: Math.floor(Math.random() * 20) + 1,
          durationDays: 2,
        },
      };
      setNodes((nds) => nds.concat(newNode));
      setIsDirty(true);
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const ganttRows = useMemo(() => {
    return computeGanttRows(nodes);
  }, [nodes]);

  const statusLabel = loading ? 'Loading…' : saving ? 'Saving…' : isDirty ? 'Unsaved' : 'Saved';
  const diagramGridClass =
    viewMode === 'diagram'
      ? 'bg-[radial-gradient(circle,_rgba(148,163,184,0.25)_1px,_transparent_0)] bg-[length:18px_18px]'
      : '';

  useImperativeHandle(
    ref,
    () => ({
      save: () => handleSave(),
      publishDraft: () => setIsDirty(true),
      fitView: () => reactFlowInstance?.fitView(),
    }),
    [handleSave, reactFlowInstance]
  );

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4 h-full flex flex-col overflow-auto">
      <div className="flex items-start md:items-center gap-3 flex-wrap md:flex-nowrap">
        <div className="flex-1 min-w-[260px]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">SDLC canvas</p>
          <h4 className="font-semibold flex items-center gap-2">
            <Workflow size={16} /> Workflow / Diagram / Gantt
          </h4>
          <p className="text-sm text-muted-foreground">
            Drag from the sidebar, connect nodes, switch to Gantt for delivery view, and save to Supabase.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 w-full md:w-auto md:ml-auto">
          <div className="flex flex-wrap gap-2 items-center justify-end">
          <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground">v{version}</span>
          <span className="text-xs px-2 py-1 rounded-full border bg-muted text-muted-foreground">{statusLabel}</span>
          <Button size="sm" variant="outline" onClick={() => reactFlowInstance?.fitView()}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Fit
          </Button>
            {!hideHeaderActions && (
              <>
          <Button size="sm" variant="secondary" onClick={() => setIsDirty(true)}>
            <PlayCircle className="mr-1 h-4 w-4" /> Publish (draft)
          </Button>
          <Button size="sm" onClick={() => handleSave()}>
            <Save className="mr-1 h-4 w-4" /> Save
          </Button>
              </>
            )}
          </div>
          {lastSaved && (
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              Last saved {new Date(lastSaved).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <Button
          size="sm"
          variant={viewMode === 'workflow' ? 'default' : 'outline'}
          className={viewMode === 'workflow' ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}
          onClick={() => setViewMode('workflow')}
        >
          <Workflow size={14} className="mr-1" /> Workflow
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'diagram' ? 'default' : 'outline'}
          className={viewMode === 'diagram' ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}
          onClick={() => setViewMode('diagram')}
        >
          <Share2 size={14} className="mr-1" /> Diagram
        </Button>
        <Button
          size="sm"
          variant={viewMode === 'gantt' ? 'default' : 'outline'}
          className={viewMode === 'gantt' ? 'bg-slate-900 text-white hover:bg-slate-800' : ''}
          onClick={() => setViewMode('gantt')}
        >
          <PanelBottom size={14} className="mr-1" /> Gantt
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Sidebar</span>
          <Button size="icon" variant="ghost" onClick={() => setSidebarOpen((v) => !v)}>
            {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelRightOpen size={16} />}
          </Button>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${sidebarOpen ? 'lg:grid-cols-[260px_1fr]' : ''} gap-3 flex-1 min-h-0`}>
        {sidebarOpen && (
          <div className="rounded-lg border bg-muted/40 p-3 space-y-3 overflow-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{viewMode === 'diagram' ? 'DFD / Use case palette' : 'Palette'}</p>
              <span className="text-[11px] text-muted-foreground">Drag to canvas</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {(viewMode === 'diagram' ? diagramPalette : palette).map((item) => (
                <button
                  key={item.key}
                  className="flex items-center gap-2 rounded-lg border border-dashed bg-white px-3 py-2 text-sm text-left hover:border-primary"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/reactflow', JSON.stringify(item));
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  onClick={() => {
                    const id = crypto.randomUUID();
                    const newNode: Node<CanvasNodeData> = {
                      id,
                      type: 'sdlc',
                      position: { x: Math.random() * 600, y: Math.random() * 300 },
                      data: {
                        label: item.label,
                        category: item.category,
                        actions: item.actions,
                        status: 'pending',
                        startDay: Math.floor(Math.random() * 20) + 3,
                        durationDays: 2,
                      },
                    };
                    setNodes((nds) => nds.concat(newNode));
                    setIsDirty(true);
                  }}
                >
                  <span className="h-7 w-7 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
                    {item.icon}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.actions?.slice(0, 2).join(' · ') || 'Add'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
            {viewMode === 'diagram' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Mermaid-like edges (A → B)</p>
                <textarea
                  className="w-full h-24 rounded-md border border-dashed bg-white px-3 py-2 text-sm"
                  value={mermaidSnippet}
                  onChange={(e) => setMermaidSnippet(e.target.value)}
                  placeholder={'Actor-->System\nSystem-->DataStore'}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full bg-slate-900 text-white hover:bg-slate-800"
                  onClick={() => {
                    const lines = mermaidSnippet.split('\n').map((l) => l.trim()).filter(Boolean);
                    if (lines.length === 0) return;
                    const nodeMap = new Map<string, Node<CanvasNodeData>>();
                    nodes.forEach((n) => nodeMap.set(n.id, n));
                    const ensureNode = (name: string) => {
                      const existing = Array.from(nodeMap.values()).find((n) => n.data.label === name);
                      if (existing) return existing;
                      const id = crypto.randomUUID();
                      const newNode: Node<CanvasNodeData> = {
                        id,
                        type: 'sdlc',
                        position: { x: Math.random() * 600, y: Math.random() * 300 },
                        data: { label: name, category: 'Diagram', actions: [], status: 'pending', startDay: 0, durationDays: 1 },
                      };
                      nodeMap.set(id, newNode);
                      return newNode;
                    };
                    const newEdges: Edge[] = [];
                    lines.forEach((line) => {
                      const match = line.match(/^([\w-]+)\s*-->\s*([\w-]+)$/);
                      if (match) {
                        const [, a, b] = match;
                        const n1 = ensureNode(a);
                        const n2 = ensureNode(b);
                        if (n1 && n2) {
                          newEdges.push({
                            id: crypto.randomUUID(),
                            source: n1.id,
                            target: n2.id,
                            type: 'smoothstep',
                          });
                        }
                      }
                    });
                    setNodes(Array.from(nodeMap.values()));
                    setEdges((eds) => eds.concat(newEdges));
                    setIsDirty(true);
                    toast.success('Diagram nodes/edges added');
                  }}
                >
                  Insert from snippet
                </Button>
              </div>
            )}
          </div>
        )}

        <div className={`rounded-lg border bg-white flex-1 min-h-[520px] overflow-hidden ${diagramGridClass}`}>
          {viewMode === 'gantt' ? (
            <div className="p-4 space-y-3 h-full overflow-auto">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PanelBottom size={14} /> Timeline view (auto-built from nodes)
              </div>
              <div className="space-y-3">
                {ganttRows.tasks.map((task) => {
                  const start = task.data?.startDay || 0;
                  const dur = task.data?.durationDays || 1;
                  const pctWidth = Math.max((dur / ganttRows.total) * 100, 6);
                  const pctOffset = Math.min((start / ganttRows.total) * 100, 94);
                  return (
                    <div key={task.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{task.data?.label}</span>
                        <span className="text-xs text-muted-foreground">
                          Day {start} • {dur}d
                        </span>
                      </div>
                      <div className="h-3 rounded bg-muted relative overflow-hidden">
                        <div
                          className="absolute h-3 rounded bg-blue-500/80"
                          style={{ width: `${pctWidth}%`, left: `${pctOffset}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full" ref={wrapperRef}>
              <ReactFlow
                nodes={nodes}
                edges={displayedEdges}
                onNodesChange={(changes) => {
                  onNodesChange(changes);
                  setIsDirty(true);
                }}
                onEdgesChange={(changes) => {
                  onEdgesChange(changes);
                  setIsDirty(true);
                }}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                defaultViewport={defaultViewport}
                panOnScroll
                snapToGrid={viewMode === 'diagram'}
                snapGrid={[18, 18]}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onInit={setReactFlowInstance}
              >
                <MiniMap pannable zoomable />
                <Controls />
                <Background gap={12} size={1} />
              </ReactFlow>
            </div>
          )}
        </div>
      </div>

      {!projectId && (
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground bg-muted/30">
          No project ID provided — canvas is in local-only mode.
        </div>
      )}
    </div>
  );
});

export default SdlcWorkflowCanvas;

