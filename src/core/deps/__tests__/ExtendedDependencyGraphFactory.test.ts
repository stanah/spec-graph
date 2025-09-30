/**
 * Extended Dependency Graph Factory Tests
 * Testing factory methods and graph creation patterns
 */

import { ExtendedDependencyGraphFactory, extendedDependencyGraphFactory } from '../ExtendedDependencyGraphFactory';
import { DependencyGraph } from '../DependencyGraph';
import { RPGNodeLevel, RPGNodeType, RPGEdgeType, RPGNodeStatus } from '../../rpg/types';

describe('ExtendedDependencyGraphFactory', () => {
  let factory: ExtendedDependencyGraphFactory;

  beforeEach(() => {
    factory = new ExtendedDependencyGraphFactory();
  });

  describe('Basic Creation', () => {
    test('should create empty extended dependency graph', () => {
      const graph = factory.create();

      expect(graph).toBeDefined();
      expect(graph.nodeCount()).toBe(0);
      expect(graph.edgeCount()).toBe(0);
    });

    test('should create multiple independent graphs', () => {
      const graph1 = factory.create();
      const graph2 = factory.create();

      graph1.addNode('test1');
      graph2.addNode('test2');

      expect(graph1.hasNode('test1')).toBe(true);
      expect(graph1.hasNode('test2')).toBe(false);
      expect(graph2.hasNode('test1')).toBe(false);
      expect(graph2.hasNode('test2')).toBe(true);
    });
  });

  describe('Creation from Basic Dependency Graph', () => {
    test('should create from empty basic graph', () => {
      const basicGraph = new DependencyGraph();
      const extendedGraph = factory.createFromBasic(basicGraph);

      expect(extendedGraph.nodeCount()).toBe(0);
      expect(extendedGraph.edgeCount()).toBe(0);
    });

    test('should create from basic graph with nodes and edges', () => {
      const basicGraph = new DependencyGraph();
      basicGraph.addNode('a');
      basicGraph.addNode('b');
      basicGraph.addNode('c');
      basicGraph.addEdge('a', 'b');
      basicGraph.addEdge('b', 'c');

      const extendedGraph = factory.createFromBasic(basicGraph);

      expect(extendedGraph.nodeCount()).toBe(3);
      expect(extendedGraph.edgeCount()).toBe(2);
      expect(extendedGraph.hasNode('a')).toBe(true);
      expect(extendedGraph.hasNode('b')).toBe(true);
      expect(extendedGraph.hasNode('c')).toBe(true);
      expect(extendedGraph.hasEdge('a', 'b')).toBe(true);
      expect(extendedGraph.hasEdge('b', 'c')).toBe(true);
    });

    test('should create from basic graph with cycles', () => {
      const basicGraph = new DependencyGraph();
      basicGraph.addNode('a');
      basicGraph.addNode('b');
      basicGraph.addEdge('a', 'b');
      basicGraph.addEdge('b', 'a');

      const extendedGraph = factory.createFromBasic(basicGraph);

      expect(extendedGraph.nodeCount()).toBe(2);
      expect(extendedGraph.edgeCount()).toBe(2);
      expect(extendedGraph.hasCycle()).toBe(true);
    });

    test('should preserve topological order in extended graph', () => {
      const basicGraph = new DependencyGraph();
      basicGraph.addNode('a');
      basicGraph.addNode('b');
      basicGraph.addNode('c');
      basicGraph.addEdge('a', 'b');
      basicGraph.addEdge('b', 'c');

      const basicOrder = basicGraph.topologicalSort();
      const extendedGraph = factory.createFromBasic(basicGraph);
      const extendedOrder = extendedGraph.topologicalSort();

      expect(extendedOrder).toEqual(basicOrder);
    });
  });

  describe('Creation with RPG Data', () => {
    test('should create from RPG nodes and edges', () => {
      const rpgNodes = [
        {
          id: 'module1',
          name: 'Module 1',
          description: 'Test module',
          createdAt: new Date(),
          updatedAt: new Date(),
          level: RPGNodeLevel.MODULE,
          type: RPGNodeType.MODULE,
          status: RPGNodeStatus.PENDING,
          language: 'typescript'
        },
        {
          id: 'class1',
          name: 'Class 1',
          description: 'Test class',
          createdAt: new Date(),
          updatedAt: new Date(),
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.CLASS,
          status: RPGNodeStatus.IN_PROGRESS,
          parentId: 'module1'
        }
      ];

      const rpgEdges = [
        {
          id: 'edge1',
          name: 'Module to Class',
          createdAt: new Date(),
          updatedAt: new Date(),
          fromId: 'module1',
          toId: 'class1',
          type: RPGEdgeType.HIERARCHY,
          weight: 10
        }
      ];

      const extendedGraph = factory.createWithRPGData(rpgNodes, rpgEdges);

      expect(extendedGraph.nodeCount()).toBe(2);
      expect(extendedGraph.edgeCount()).toBe(1);
      expect(extendedGraph.hasNode('module1')).toBe(true);
      expect(extendedGraph.hasNode('class1')).toBe(true);
      expect(extendedGraph.hasEdge('module1', 'class1')).toBe(true);

      const module1Attrs = extendedGraph.getNodeAttributes('module1');
      expect(module1Attrs?.level).toBe(RPGNodeLevel.MODULE);
      expect(module1Attrs?.type).toBe(RPGNodeType.MODULE);
      expect(module1Attrs?.language).toBe('typescript');

      const class1Attrs = extendedGraph.getNodeAttributes('class1');
      expect(class1Attrs?.parentId).toBe('module1');

      const edgeAttrs = extendedGraph.getEdgeAttributes('module1', 'class1');
      expect(edgeAttrs?.type).toBe(RPGEdgeType.HIERARCHY);
      expect(edgeAttrs?.weight).toBe(10);
    });

    test('should handle empty RPG data', () => {
      const extendedGraph = factory.createWithRPGData([], []);

      expect(extendedGraph.nodeCount()).toBe(0);
      expect(extendedGraph.edgeCount()).toBe(0);
    });
  });

  describe('Specialized Factory Methods', () => {
    test('should create validation-enabled graph', () => {
      const graph = (factory as any).createWithValidation();

      graph.addNode('a');
      graph.addNode('b');
      graph.addEdge('a', 'b');

      // This should throw an error due to cycle validation
      expect(() => {
        graph.addEdge('b', 'a');
      }).toThrow('Adding edge b -> a would create a cycle');

      expect(graph.hasEdge('b', 'a')).toBe(false);
    });

    test('should create optimized graph for large datasets', () => {
      const graph = (factory as any).createOptimized(5000, 10000);

      expect(graph).toBeDefined();
      expect(graph.nodeCount()).toBe(0);
      expect(graph.edgeCount()).toBe(0);

      // The graph should still function normally
      graph.addNode('test');
      expect(graph.hasNode('test')).toBe(true);
    });

    test('should create read-only wrapper', () => {
      const sourceGraph = factory.create();
      sourceGraph.addNode('test');
      sourceGraph.addNode('test2');
      sourceGraph.addEdge('test', 'test2');

      const readOnlyGraph = (factory as any).createReadOnly(sourceGraph);

      // Read operations should work
      expect(readOnlyGraph.hasNode('test')).toBe(true);
      expect(readOnlyGraph.hasEdge('test', 'test2')).toBe(true);
      expect(readOnlyGraph.nodeCount()).toBe(2);
      expect(readOnlyGraph.edgeCount()).toBe(1);

      // Write operations should throw errors
      expect(() => readOnlyGraph.addNode('newNode')).toThrow('Cannot modify read-only dependency graph');
      expect(() => readOnlyGraph.removeNode('test')).toThrow('Cannot modify read-only dependency graph');
      expect(() => readOnlyGraph.addEdge('test', 'newNode')).toThrow('Cannot modify read-only dependency graph');
      expect(() => readOnlyGraph.removeEdge('test', 'test2')).toThrow('Cannot modify read-only dependency graph');
      expect(() => readOnlyGraph.clear()).toThrow('Cannot modify read-only dependency graph');
    });
  });

  describe('Singleton Factory Instance', () => {
    test('should provide singleton factory instance', () => {
      expect(extendedDependencyGraphFactory).toBeInstanceOf(ExtendedDependencyGraphFactory);
    });

    test('should create graphs using singleton instance', () => {
      const graph1 = extendedDependencyGraphFactory.create();
      const graph2 = extendedDependencyGraphFactory.create();

      expect(graph1).toBeDefined();
      expect(graph2).toBeDefined();
      expect(graph1).not.toBe(graph2); // Should be different instances
    });
  });

  describe('Complex Migration Scenarios', () => {
    test('should handle migration of complex basic graph', () => {
      const basicGraph = new DependencyGraph();

      // Create a complex graph structure
      const nodes = ['root', 'moduleA', 'moduleB', 'classA1', 'classA2', 'classB1', 'funcA1', 'funcA2'];
      nodes.forEach(node => basicGraph.addNode(node));

      // Add hierarchical structure (simulated through dependencies)
      basicGraph.addEdge('root', 'moduleA');
      basicGraph.addEdge('root', 'moduleB');
      basicGraph.addEdge('moduleA', 'classA1');
      basicGraph.addEdge('moduleA', 'classA2');
      basicGraph.addEdge('moduleB', 'classB1');
      basicGraph.addEdge('classA1', 'funcA1');
      basicGraph.addEdge('classA1', 'funcA2');

      // Add cross-module dependencies
      basicGraph.addEdge('classA2', 'classB1');

      const extendedGraph = factory.createFromBasic(basicGraph);

      expect(extendedGraph.nodeCount()).toBe(nodes.length);
      expect(extendedGraph.edgeCount()).toBe(8); // 7 edges + 1 cross-module dependency

      // Verify structure preservation
      expect(extendedGraph.getDependencies('root')).toContain('moduleA');
      expect(extendedGraph.getDependencies('root')).toContain('moduleB');
      expect(extendedGraph.getDependencies('classA1')).toContain('funcA1');
      expect(extendedGraph.getDependencies('classA1')).toContain('funcA2');
      expect(extendedGraph.getDependencies('classA2')).toContain('classB1');

      // Should be able to add RPG attributes after migration
      extendedGraph.updateNodeAttributes('root', {
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE
      });

      extendedGraph.updateNodeAttributes('moduleA', {
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE
      });

      const rootAttrs = extendedGraph.getNodeAttributes('root');
      expect(rootAttrs?.level).toBe(RPGNodeLevel.PROPOSAL);
      expect(rootAttrs?.type).toBe(RPGNodeType.FEATURE);
    });

    test('should handle round-trip conversion (basic -> extended -> basic)', () => {
      const originalBasic = new DependencyGraph();
      originalBasic.addNode('a');
      originalBasic.addNode('b');
      originalBasic.addNode('c');
      originalBasic.addEdge('a', 'b');
      originalBasic.addEdge('b', 'c');

      const extended = factory.createFromBasic(originalBasic);
      const convertedBasic = extended.getCompatibleDependencyGraph();

      expect(convertedBasic.nodeCount()).toBe(originalBasic.nodeCount());
      expect(convertedBasic.edgeCount()).toBe(originalBasic.edgeCount());
      expect(convertedBasic.hasNode('a')).toBe(true);
      expect(convertedBasic.hasNode('b')).toBe(true);
      expect(convertedBasic.hasNode('c')).toBe(true);
      expect(convertedBasic.hasEdge('a', 'b')).toBe(true);
      expect(convertedBasic.hasEdge('b', 'c')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid basic graph gracefully', () => {
      // Create a basic graph that might cause issues
      const basicGraph = new DependencyGraph();

      // This shouldn't throw an error even with empty graph
      expect(() => {
        const extendedGraph = factory.createFromBasic(basicGraph);
      }).not.toThrow();
    });

    test('should handle malformed RPG data gracefully', () => {
      const malformedNodes = [
        {
          id: 'test',
          name: 'Test',
          createdAt: new Date(),
          updatedAt: new Date(),
          level: RPGNodeLevel.MODULE,
          type: RPGNodeType.MODULE,
          status: RPGNodeStatus.PENDING
        }
      ];

      const malformedEdges = [
        {
          id: 'edge1',
          name: 'Edge 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          fromId: 'nonexistent',
          toId: 'test',
          type: RPGEdgeType.DATA_FLOW
        }
      ];

      // Should not throw error but should create graph with only valid data
      expect(() => {
        const graph = factory.createWithRPGData(malformedNodes, malformedEdges);
        expect(graph.hasNode('test')).toBe(true);
        expect(graph.hasNode('nonexistent')).toBe(true); // ExtendedDependencyGraph auto-creates missing nodes
        expect(graph.hasEdge('nonexistent', 'test')).toBe(true);
      }).not.toThrow();
    });
  });
});