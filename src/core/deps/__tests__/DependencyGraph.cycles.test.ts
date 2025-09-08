import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../DependencyGraph';

describe('DependencyGraph - cycle detection (Tarjan)', () => {
  let g: DependencyGraph;

  beforeEach(() => {
    g = new DependencyGraph();
  });

  it('returns no cycles for acyclic graph', () => {
    g.addEdge('A', 'B');
    g.addEdge('B', 'C');
    expect(g.hasCycle()).toBe(false);
    expect(g.findCycles()).toEqual([]);
  });

  it('detects a simple 3-node cycle', () => {
    g.addEdge('A', 'B');
    g.addEdge('B', 'C');
    g.addEdge('C', 'A');
    expect(g.hasCycle()).toBe(true);
    // components are sorted internally; compare ignoring order
    expect(g.findCycles()).toEqual([["A", "B", "C"]]);
  });

  it('detects a self-loop as a cycle', () => {
    g.addEdge('X', 'X');
    expect(g.hasCycle()).toBe(true);
    expect(g.findCycles()).toEqual([["X"]]);
  });

  it('detects multiple disjoint cycles', () => {
    // cycle1: A<->B
    g.addEdge('A', 'B');
    g.addEdge('B', 'A');
    // cycle2: C->D->E->C
    g.addEdge('C', 'D');
    g.addEdge('D', 'E');
    g.addEdge('E', 'C');
    // tail: F->G (no cycle)
    g.addEdge('F', 'G');

    expect(g.hasCycle()).toBe(true);
    const cycles = g.findCycles();
    // Order is deterministic: each cycle nodes sorted, cycles sorted by first element
    expect(cycles).toEqual([["A", "B"], ["C", "D", "E"]]);
  });
});

