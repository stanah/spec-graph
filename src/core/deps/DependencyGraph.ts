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
}

