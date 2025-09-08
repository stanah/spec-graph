import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../DependencyGraph';

describe('DependencyGraph - topological sort (dependencies-first)', () => {
  let g: DependencyGraph;
  beforeEach(() => {
    g = new DependencyGraph();
  });

  it('sorts a linear chain with dependencies first', () => {
    // A depends on B, B depends on C  => order: C, B, A
    g.addEdge('A', 'B');
    g.addEdge('B', 'C');
    expect(g.topologicalSort()).toEqual(['C', 'B', 'A']);
  });

  it('ensures dependencies come before dependents in branching graph', () => {
    // A depends on B and C
    g.addEdge('A', 'B');
    g.addEdge('A', 'C');
    const order = g.topologicalSort();
    const idx = (n: string) => order.indexOf(n);
    expect(idx('B')).toBeGreaterThanOrEqual(0);
    expect(idx('C')).toBeGreaterThanOrEqual(0);
    expect(idx('A')).toBeGreaterThan(idx('B'));
    expect(idx('A')).toBeGreaterThan(idx('C'));
  });

  it('handles disconnected components while preserving partial orders', () => {
    // Component1: A->B   => B before A
    // Component2: D->E   => E before D
    g.addEdge('A', 'B');
    g.addEdge('D', 'E');
    const order = g.topologicalSort();
    const idx = (n: string) => order.indexOf(n);
    expect(idx('B')).toBeLessThan(idx('A'));
    expect(idx('E')).toBeLessThan(idx('D'));
  });

  it('throws on cycles', () => {
    g.addEdge('A', 'B');
    g.addEdge('B', 'A');
    expect(() => g.topologicalSort()).toThrowError();
  });

  it('throws on self-loop', () => {
    g.addEdge('X', 'X');
    expect(() => g.topologicalSort()).toThrowError();
  });
});

