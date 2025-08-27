import { DependencyGraph } from './DependencyGraph';

export type DependencyEvent =
  | { type: 'AddNode'; id: string; timestamp?: number; meta?: Record<string, unknown> }
  | { type: 'RemoveNode'; id: string; timestamp?: number; meta?: Record<string, unknown> }
  | { type: 'AddEdge'; from: string; to: string; timestamp?: number; meta?: Record<string, unknown> }
  | { type: 'RemoveEdge'; from: string; to: string; timestamp?: number; meta?: Record<string, unknown> };

export class DependencyEventStore {
  private events: DependencyEvent[] = [];

  append(event: DependencyEvent): void {
    if (!event.timestamp) event.timestamp = Date.now();
    this.events.push(event);
  }

  getEvents(): DependencyEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }

  replay(target: DependencyGraph): void {
    for (const e of this.events) {
      switch (e.type) {
        case 'AddNode':
          target.addNode(e.id);
          break;
        case 'RemoveNode':
          target.removeNode(e.id);
          break;
        case 'AddEdge':
          target.addEdge(e.from, e.to);
          break;
        case 'RemoveEdge':
          target.removeEdge(e.from, e.to);
          break;
      }
    }
  }
}

export class EventSourcedDependencyGraph {
  private readonly graph: DependencyGraph;
  private readonly store: DependencyEventStore;

  constructor(store?: DependencyEventStore, graph?: DependencyGraph) {
    this.store = store ?? new DependencyEventStore();
    this.graph = graph ?? new DependencyGraph();
  }

  getEventStore(): DependencyEventStore {
    return this.store;
  }

  // write operations (record event + apply)
  addNode(id: string): void {
    this.store.append({ type: 'AddNode', id });
    this.graph.addNode(id);
  }
  removeNode(id: string): void {
    this.store.append({ type: 'RemoveNode', id });
    this.graph.removeNode(id);
  }
  addEdge(from: string, to: string): void {
    this.store.append({ type: 'AddEdge', from, to });
    this.graph.addEdge(from, to);
  }
  removeEdge(from: string, to: string): void {
    this.store.append({ type: 'RemoveEdge', from, to });
    this.graph.removeEdge(from, to);
  }

  // read operations delegate to underlying graph
  hasNode(id: string): boolean { return this.graph.hasNode(id); }
  hasEdge(from: string, to: string): boolean { return this.graph.hasEdge(from, to); }
  getDependencies(id: string): string[] { return this.graph.getDependencies(id); }
  getDependents(id: string): string[] { return this.graph.getDependents(id); }
  nodeCount(): number { return this.graph.nodeCount(); }
  edgeCount(): number { return this.graph.edgeCount(); }
  topologicalSort(): string[] { return this.graph.topologicalSort(); }
  findCycles(): string[][] { return this.graph.findCycles(); }
  hasCycle(): boolean { return this.graph.hasCycle(); }
}

