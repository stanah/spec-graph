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
}
