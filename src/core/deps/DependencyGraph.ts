export class DependencyGraph {
  private adj: Map<string, Set<string>> = new Map();
  private rev: Map<string, Set<string>> = new Map();

  addNode(id: string): void {
    if (!this.adj.has(id)) this.adj.set(id, new Set());
    if (!this.rev.has(id)) this.rev.set(id, new Set());
  }

  hasNode(id: string): boolean {
    return this.adj.has(id);
  }

  removeNode(id: string): void {
    if (!this.adj.has(id)) return;
    // Remove outgoing edges
    const deps = this.adj.get(id)!;
    for (const to of deps) {
      const rset = this.rev.get(to);
      if (rset) rset.delete(id);
    }
    this.adj.delete(id);

    // Remove incoming edges
    const dependents = this.rev.get(id);
    if (dependents) {
      for (const from of dependents) {
        const aset = this.adj.get(from);
        if (aset) aset.delete(id);
      }
    }
    this.rev.delete(id);
  }

  addEdge(from: string, to: string): void {
    this.addNode(from);
    this.addNode(to);
    this.adj.get(from)!.add(to);
    this.rev.get(to)!.add(from);
  }

  removeEdge(from: string, to: string): void {
    this.adj.get(from)?.delete(to);
    this.rev.get(to)?.delete(from);
  }

  hasEdge(from: string, to: string): boolean {
    return this.adj.get(from)?.has(to) ?? false;
  }

  getDependencies(id: string): string[] {
    const set = this.adj.get(id);
    if (!set) return [];
    return [...set].sort();
  }

  getDependents(id: string): string[] {
    const set = this.rev.get(id);
    if (!set) return [];
    return [...set].sort();
  }

  clear(): void {
    this.adj.clear();
    this.rev.clear();
  }

  nodeCount(): number {
    return this.adj.size;
  }

  edgeCount(): number {
    let count = 0;
    for (const s of this.adj.values()) count += s.size;
    return count;
  }

  /**
   * Return list of cycles as arrays of node ids, using Tarjan SCC.
   * - Components with size > 1 are cycles
   * - Components with size === 1 are cycles only if self-loop exists
   * The nodes within each cycle and the list of cycles are deterministically sorted.
   */
  findCycles(): string[][] {
    const sccs = this.tarjanSCC();
    const cycles: string[][] = [];
    for (const comp of sccs) {
      if (comp.length > 1) {
        cycles.push([...comp].sort());
      } else {
        const v = comp[0];
        if (this.hasEdge(v, v)) cycles.push([v]);
      }
    }
    // sort cycles by their first element then length
    cycles.sort((a, b) => (a[0] === b[0] ? a.length - b.length : a[0].localeCompare(b[0])));
    return cycles;
  }

  hasCycle(): boolean {
    const sccs = this.tarjanSCC();
    for (const comp of sccs) {
      if (comp.length > 1) return true;
      if (comp.length === 1) {
        const v = comp[0];
        if (this.hasEdge(v, v)) return true;
      }
    }
    return false;
  }

  private tarjanSCC(): string[][] {
    const nodes = [...this.adj.keys()];
    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: string[][] = [];
    let idx = 0;

    const strongConnect = (v: string) => {
      index.set(v, idx);
      lowlink.set(v, idx);
      idx++;
      stack.push(v);
      onStack.add(v);

      for (const w of this.adj.get(v) ?? []) {
        if (!index.has(w)) {
          strongConnect(w);
          lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
        } else if (onStack.has(w)) {
          lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
        }
      }

      if (lowlink.get(v) === index.get(v)) {
        const comp: string[] = [];
        let w: string | undefined;
        do {
          w = stack.pop();
          if (w === undefined) break;
          onStack.delete(w);
          comp.push(w);
        } while (w !== v);
        sccs.push(comp);
      }
    };

    for (const v of nodes) {
      if (!index.has(v)) strongConnect(v);
    }
    return sccs;
  }

  /**
   * Topological sort returning dependencies before dependents.
   * Throws an error if the graph contains a cycle.
   */
  topologicalSort(): string[] {
    // Build set of all nodes present in the graph
    const nodes = new Set<string>();
    for (const k of this.adj.keys()) nodes.add(k);
    for (const k of this.rev.keys()) nodes.add(k);

    // Build reversed adjacency: dependency -> [dependents]
    const out: Map<string, Set<string>> = new Map();
    for (const n of nodes) out.set(n, new Set());
    for (const [from, tos] of this.adj.entries()) {
      for (const to of tos) {
        if (!out.has(to)) out.set(to, new Set());
        out.get(to)!.add(from);
      }
    }

    // Compute indegree in reversed graph
    const indeg: Map<string, number> = new Map();
    for (const n of nodes) indeg.set(n, 0);
    for (const [, neigh] of out.entries()) {
      for (const v of neigh) indeg.set(v, (indeg.get(v) || 0) + 1);
    }

    // Initialize queue with nodes of indegree 0 (deterministic order)
    const queue: string[] = [...nodes].sort().filter((n) => (indeg.get(n) || 0) === 0);
    const result: string[] = [];

    while (queue.length) {
      const n = queue.shift()!;
      result.push(n);
      for (const v of out.get(n) ?? []) {
        indeg.set(v, indeg.get(v)! - 1);
        if (indeg.get(v) === 0) {
          // keep queue sorted for deterministic output
          const pos = queue.findIndex((x) => x > v);
          if (pos === -1) queue.push(v);
          else queue.splice(pos, 0, v);
        }
      }
    }

    if (result.length !== nodes.size) {
      throw new Error('DependencyGraph: cycle detected during topologicalSort');
    }
    return result;
  }
}
