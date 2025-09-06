import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../DependencyGraph';
import { DependencyEventStore, EventSourcedDependencyGraph } from '../EventSourcing';

describe('Event Sourcing for DependencyGraph', () => {
  let store: DependencyEventStore;
  let eg: EventSourcedDependencyGraph;

  beforeEach(() => {
    store = new DependencyEventStore();
    eg = new EventSourcedDependencyGraph(store);
  });

  it('records add/remove edge events and replays to same final state', () => {
    eg.addEdge('A', 'B');
    eg.addEdge('A', 'C');
    eg.removeEdge('A', 'B');

    const events = store.getEvents();
    expect(events.map(e => e.type)).toEqual(['AddEdge', 'AddEdge', 'RemoveEdge']);

    const replayed = new DependencyGraph();
    store.replay(replayed);
    expect(replayed.getDependencies('A')).toEqual(['C']);
  });

  it('records node removal and cascades on replay to target graph', () => {
    eg.addEdge('A', 'B');
    eg.addEdge('B', 'C');
    eg.removeNode('B');

    const replayed = new DependencyGraph();
    store.replay(replayed);

    expect(replayed.hasNode('B')).toBe(false);
    expect(replayed.getDependencies('A')).toEqual([]);
    expect(replayed.getDependents('C')).toEqual([]);
  });

  it('assigns timestamp to events and can clear the store', () => {
    eg.addEdge('X', 'Y');
    const [evt] = store.getEvents();
    expect(typeof evt.timestamp).toBe('number');
    store.clear();
    expect(store.getEvents()).toEqual([]);
  });

  it('does not override provided timestamp (including 0)', () => {
    const customTs = 1234567890;
    store.append({ type: 'AddNode', id: 'N1', timestamp: customTs });
    store.append({ type: 'AddNode', id: 'N0', timestamp: 0 });
    const events = store.getEvents();
    expect(events[0].timestamp).toBe(customTs);
    expect(events[1].timestamp).toBe(0);
  });
});
