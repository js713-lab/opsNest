import { CanvasNode } from './types';

export function computeGanttRows(tasks: CanvasNode[]) {
  const filtered = tasks.filter((n) => n.type === 'sdlc');
  const total = filtered.reduce((acc, n) => {
    const start = n.data?.startDay || 0;
    const dur = n.data?.durationDays || 1;
    return Math.max(acc, start + dur);
  }, 10);
  return { tasks: filtered, total: Math.max(total, 10) };
}

