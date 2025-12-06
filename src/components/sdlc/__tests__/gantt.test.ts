import { describe, expect, it } from 'vitest';
import { computeGanttRows } from '../gantt';
import { CanvasNodeData } from '../types';

const makeNode = (id: string, startDay: number, durationDays: number, label = 'Task') => ({
  id,
  type: 'sdlc' as const,
  position: { x: 0, y: 0 },
  data: { label, startDay, durationDays } as CanvasNodeData,
});

describe('computeGanttRows', () => {
  it('calculates total timeline length from start and duration', () => {
    const nodes = [makeNode('a', 0, 2), makeNode('b', 5, 3)];
    const result = computeGanttRows(nodes as any);
    expect(result.total).toBe(10); // min 10 fallback
    expect(result.tasks.length).toBe(2);
  });

  it('expands total when tasks run long', () => {
    const nodes = [makeNode('a', 4, 12)];
    const result = computeGanttRows(nodes as any);
    expect(result.total).toBe(16);
  });
});

