import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../DependencyGraph';

describe('DependencyGraph (basic)', () => {
  let g: DependencyGraph;

  beforeEach(() => {
    g = new DependencyGraph();
  });

  it('adds edges and retrieves dependencies and dependents', () => {
    g.addEdge('A', 'B');
    g.addEdge('A', 'C');

    expect(g.getDependencies('A')).toEqual(['B', 'C']);
    expect(g.getDependents('B')).toEqual(['A']);
    expect(g.hasEdge('A', 'B')).toBe(true);
    expect(g.hasEdge('A', 'X')).toBe(false);
  });

  it('prevents duplicate edges', () => {
    g.addEdge('A', 'B');
    g.addEdge('A', 'B');
    expect(g.getDependencies('A')).toEqual(['B']);
    expect(g.edgeCount()).toBe(1);
  });

  it('removes edges correctly', () => {
    g.addEdge('A', 'B');
    g.addEdge('A', 'C');
    g.removeEdge('A', 'B');
    expect(g.getDependencies('A')).toEqual(['C']);
    expect(g.getDependents('B')).toEqual([]);
    expect(g.edgeCount()).toBe(1);
  });

  it('removes node and cascades edges', () => {
    g.addEdge('A', 'B');
    g.addEdge('C', 'B');
    g.addEdge('B', 'D');
    g.removeNode('B');
    expect(g.hasNode('B')).toBe(false);
    expect(g.getDependencies('A')).toEqual([]);
    expect(g.getDependents('D')).toEqual([]);
    expect(g.edgeCount()).toBe(0);
  });

  it('returns empty for unknown nodes', () => {
    expect(g.getDependencies('Z')).toEqual([]);
    expect(g.getDependents('Z')).toEqual([]);
  });

  it('reports node and edge counts', () => {
    g.addEdge('A', 'B');
    g.addEdge('A', 'C');
    g.addEdge('D', 'E');
    expect(g.nodeCount()).toBe(5);
    expect(g.edgeCount()).toBe(3);
  });
});

