import { Node } from 'reactflow';

export type CanvasNodeStatus = 'pending' | 'in_progress' | 'done';

export type CanvasNodeData = {
  label: string;
  category?: string;
  status?: CanvasNodeStatus;
  actions?: string[];
  lane?: string;
  durationDays?: number;
  startDay?: number;
};

export type CanvasNode = Node<CanvasNodeData>;

