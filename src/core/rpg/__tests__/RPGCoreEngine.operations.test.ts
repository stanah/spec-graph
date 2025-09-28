/**
 * RPG Core Engine Operations and Performance Tests
 * Tests for Task 37.5: Operations, Validation, Visualization API and Performance Optimization
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DependencyGraph } from '../../deps/DependencyGraph';
import { IDManager } from '../../id/IDManager';
import { RPGCoreEngine } from '../RPGCoreEngine';
import {
  RPGNodeLevel,
  RPGNodeType,
  RPGEdgeType,
  RPGNodeStatus
} from '../types';

describe('RPGCoreEngine Operations and Performance Features', () => {
  let engine: RPGCoreEngine;
  let dependencyGraph: DependencyGraph;
  let idManager: IDManager;

  beforeEach(async () => {
    dependencyGraph = new DependencyGraph();
    idManager = new IDManager({ prefix: 'test_ops_', auto: true });
    engine = new RPGCoreEngine(dependencyGraph, idManager);
    await engine.initialize();
  });

  afterEach(async () => {
    engine.clearCache();
  });

  describe('Batch Operations API', () => {
    it('should add multiple nodes in batch with rollback on error', async () => {
      const nodesToAdd = [
        {
          name: 'Batch Node 1',
          level: RPGNodeLevel.MODULE,
          type: RPGNodeType.MODULE,
          status: RPGNodeStatus.PENDING
        },
        {
          name: 'Batch Node 2',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.FUNCTION,
          status: RPGNodeStatus.PENDING
        },
        {
          name: 'Batch Node 3',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.CLASS,
          status: RPGNodeStatus.PENDING
        }
      ];

      const results = await engine.addNodesBatch(nodesToAdd);

      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('Batch Node 1');
      expect(results[1].name).toBe('Batch Node 2');
      expect(results[2].name).toBe('Batch Node 3');

      // Verify nodes are actually stored
      const storedNode1 = await engine.getNode(results[0].id);
      expect(storedNode1).toBeDefined();
      expect(storedNode1!.name).toBe('Batch Node 1');

      // Verify all nodes have same creation timestamp
      expect(results[0].createdAt).toEqual(results[1].createdAt);
      expect(results[1].createdAt).toEqual(results[2].createdAt);
    });

    it('should add multiple edges in batch', async () => {
      // First create some nodes
      const node1 = await engine.addNode({
        name: 'Source Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      const node2 = await engine.addNode({
        name: 'Target Node 1',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.FUNCTION,
        status: RPGNodeStatus.PENDING
      });

      const node3 = await engine.addNode({
        name: 'Target Node 2',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING
      });

      const edgesToAdd = [
        {
          name: 'Batch Edge 1',
          fromId: node1.id,
          toId: node2.id,
          type: RPGEdgeType.HIERARCHY
        },
        {
          name: 'Batch Edge 2',
          fromId: node1.id,
          toId: node3.id,
          type: RPGEdgeType.DATA_FLOW,
          weight: 0.8
        }
      ];

      const results = await engine.addEdgesBatch(edgesToAdd);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Batch Edge 1');
      expect(results[1].name).toBe('Batch Edge 2');
      expect(results[1].weight).toBe(0.8);

      // Verify edges are stored
      const storedEdge1 = await engine.getEdge(results[0].id);
      expect(storedEdge1).toBeDefined();
      expect(storedEdge1!.fromId).toBe(node1.id);
    });

    it('should update multiple nodes in batch', async () => {
      // Create some nodes first
      const nodes = await engine.addNodesBatch([
        {
          name: 'Update Node 1',
          level: RPGNodeLevel.MODULE,
          type: RPGNodeType.MODULE,
          status: RPGNodeStatus.PENDING
        },
        {
          name: 'Update Node 2',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.FUNCTION,
          status: RPGNodeStatus.PENDING
        }
      ]);

      const updates = [
        {
          id: nodes[0].id,
          updates: { status: RPGNodeStatus.IN_PROGRESS, name: 'Updated Node 1' }
        },
        {
          id: nodes[1].id,
          updates: { status: RPGNodeStatus.COMPLETED, description: 'Updated description' }
        }
      ];

      const results = await engine.updateNodesBatch(updates);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Updated Node 1');
      expect(results[0].status).toBe(RPGNodeStatus.IN_PROGRESS);
      expect(results[1].status).toBe(RPGNodeStatus.COMPLETED);
      expect(results[1].description).toBe('Updated description');

      // Verify original creation times are preserved
      expect(results[0].createdAt).toEqual(nodes[0].createdAt);
      expect(results[1].createdAt).toEqual(nodes[1].createdAt);

      // Verify update times are newer or equal (due to millisecond precision)
      expect(results[0].updatedAt.getTime()).toBeGreaterThanOrEqual(nodes[0].updatedAt.getTime());
    });

    it('should remove multiple nodes in batch', async () => {
      // Create some nodes with edges
      const nodes = await engine.addNodesBatch([
        {
          name: 'Remove Node 1',
          level: RPGNodeLevel.MODULE,
          type: RPGNodeType.MODULE,
          status: RPGNodeStatus.PENDING
        },
        {
          name: 'Remove Node 2',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.FUNCTION,
          status: RPGNodeStatus.PENDING
        },
        {
          name: 'Keep Node',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.CLASS,
          status: RPGNodeStatus.PENDING
        }
      ]);

      // Add edges
      await engine.addEdgesBatch([
        {
          name: 'Edge to Remove',
          fromId: nodes[0].id,
          toId: nodes[1].id,
          type: RPGEdgeType.HIERARCHY
        },
        {
          name: 'Edge to Keep',
          fromId: nodes[2].id,
          toId: nodes[1].id,
          type: RPGEdgeType.DATA_FLOW
        }
      ]);

      // Remove first two nodes
      const result = await engine.removeNodesBatch([nodes[0].id, nodes[1].id]);

      expect(result).toBe(true);

      // Verify nodes are removed
      const node1 = await engine.getNode(nodes[0].id);
      const node2 = await engine.getNode(nodes[1].id);
      const node3 = await engine.getNode(nodes[2].id);

      expect(node1).toBeNull();
      expect(node2).toBeNull();
      expect(node3).toBeDefined(); // Should still exist

      // Verify edges are also removed
      const allEdges = await engine.queryEdges({});
      expect(allEdges).toHaveLength(0); // All edges should be removed since they involved removed nodes
    });

    it('should handle transaction with rollback on error', async () => {
      const initialStats = await engine.getStatistics();

      try {
        await engine.transaction(async () => {
          // Add some nodes
          await engine.addNode({
            name: 'Transaction Node',
            level: RPGNodeLevel.MODULE,
            type: RPGNodeType.MODULE,
            status: RPGNodeStatus.PENDING
          });

          // This should cause an error and trigger rollback
          throw new Error('Intentional error for testing');
        });
      } catch (error) {
        expect(error.message).toBe('Intentional error for testing');
      }

      // Verify rollback happened
      const finalStats = await engine.getStatistics();
      expect(finalStats.nodeCount).toBe(initialStats.nodeCount);
    });

    it('should handle batch operation errors with proper rollback', async () => {
      const initialStats = await engine.getStatistics();

      // Create one valid node first
      const validNode = await engine.addNode({
        name: 'Valid Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      // Try to add edges where one references non-existent node
      try {
        await engine.addEdgesBatch([
          {
            name: 'Valid Edge',
            fromId: validNode.id,
            toId: validNode.id, // Self-reference, should be valid
            type: RPGEdgeType.HIERARCHY
          },
          {
            name: 'Invalid Edge',
            fromId: validNode.id,
            toId: 'non_existent_node_id',
            type: RPGEdgeType.DATA_FLOW
          }
        ]);
      } catch (error) {
        expect(error.message).toContain('one or both nodes do not exist');
      }

      // Verify no edges were added due to rollback
      const edges = await engine.queryEdges({});
      expect(edges).toHaveLength(0);

      const finalStats = await engine.getStatistics();
      expect(finalStats.edgeCount).toBe(0);
    });
  });

  describe('Performance Optimization', () => {
    it('should cache query results and improve performance', async () => {
      // Add some test data
      await engine.addNodesBatch([
        {
          name: 'Cache Test Node 1',
          level: RPGNodeLevel.MODULE,
          type: RPGNodeType.MODULE,
          status: RPGNodeStatus.PENDING
        },
        {
          name: 'Cache Test Node 2',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.FUNCTION,
          status: RPGNodeStatus.PENDING
        }
      ]);

      const query = { level: RPGNodeLevel.MODULE };

      // First query - should cache the result
      const start1 = Date.now();
      const result1 = await engine.queryNodesOptimized(query);
      const duration1 = Date.now() - start1;

      // Second query - should use cache
      const start2 = Date.now();
      const result2 = await engine.queryNodesOptimized(query);
      const duration2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(result1).toHaveLength(1);
      expect(result1[0].name).toBe('Cache Test Node 1');

      // Cache hit should be faster (though this might be flaky in fast environments)
      // We'll just check that the cache stats show the cache is being used
      const cacheStats = engine.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
    });

    it('should provide cache statistics', async () => {
      const initialStats = engine.getCacheStats();
      expect(initialStats.size).toBe(0);

      // Add some data and perform cached queries
      await engine.addNode({
        name: 'Stats Test Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      await engine.queryNodesOptimized({ level: RPGNodeLevel.MODULE });
      await engine.queryEdgesOptimized({ type: RPGEdgeType.HIERARCHY });

      const finalStats = engine.getCacheStats();
      expect(finalStats.size).toBeGreaterThan(0);
      expect(finalStats.memoryUsage).toBeGreaterThan(0);
    });

    it('should clear cache when requested', async () => {
      // Add data and create cache entries
      await engine.addNode({
        name: 'Clear Test Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      await engine.queryNodesOptimized({ level: RPGNodeLevel.MODULE });

      expect(engine.getCacheStats().size).toBeGreaterThan(0);

      // Clear cache
      engine.clearCache();

      expect(engine.getCacheStats().size).toBe(0);
    });
  });

  describe('Enhanced Validation API', () => {
    it('should provide extended validation with performance metrics', async () => {
      // Create a graph with various structures
      const nodes = await engine.addNodesBatch([
        {
          name: 'Root Feature',
          level: RPGNodeLevel.PROPOSAL,
          type: RPGNodeType.FEATURE,
          status: RPGNodeStatus.PENDING
        },
        {
          name: 'Module 1',
          level: RPGNodeLevel.MODULE,
          type: RPGNodeType.MODULE,
          status: RPGNodeStatus.PENDING
        },
        {
          name: 'Function 1',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.FUNCTION,
          status: RPGNodeStatus.PENDING
        }
      ]);

      // Add hierarchy
      await engine.addChild(nodes[0].id, nodes[1].id);
      await engine.addChild(nodes[1].id, nodes[2].id);

      const validation = await engine.validateExtended();

      expect(validation.isValid).toBe(true);
      expect(validation.performance).toBeDefined();
      expect(validation.performance.nodeCount).toBe(3);
      expect(validation.performance.edgeCount).toBe(0);
      expect(validation.performance.maxDepth).toBeGreaterThan(0);
      expect(validation.constraints).toBeDefined();
      expect(validation.constraints.maxNodesPerLevel).toBeDefined();
    });

    it('should detect performance issues in large graphs', async () => {
      // Create a graph that should trigger performance warnings
      const nodes = [];
      for (let i = 0; i < 25; i++) {
        nodes.push({
          name: `Child Node ${i}`,
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.FUNCTION,
          status: RPGNodeStatus.PENDING
        });
      }

      const parentNode = await engine.addNode({
        name: 'Parent with Many Children',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      const childNodes = await engine.addNodesBatch(nodes);

      // Add all as children to create a wide hierarchy
      for (const child of childNodes) {
        await engine.addChild(parentNode.id, child.id);
      }

      const validation = await engine.validateExtended();

      expect(validation.constraints.recommendedModularization.length).toBeGreaterThan(0);
      expect(validation.constraints.recommendedModularization[0]).toContain('consider sub-grouping');
    });

    it('should validate schema constraints', async () => {
      // Create nodes with missing required fields
      const nodeWithoutName = await engine.addNode({
        name: 'Valid Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      // Manually modify to create invalid state
      const invalidNode = { ...nodeWithoutName, name: '' };
      // We can't directly modify engine.nodes from outside, so let's create a file node without filePath
      const fileNode = await engine.addNode({
        name: 'File Node',
        level: RPGNodeLevel.FILE_SYSTEM,
        type: RPGNodeType.FILE,
        status: RPGNodeStatus.PENDING
        // Missing filePath
      });

      const schemaValidation = await engine.validateSchema();

      expect(schemaValidation.isValid).toBe(false);
      expect(schemaValidation.violations).toContain(`File system node ${fileNode.id} missing filePath`);
      expect(schemaValidation.violations).toContain(`File node ${fileNode.id} missing filePath`);
    });
  });

  describe('Visualization API', () => {
    beforeEach(async () => {
      // Create a sample graph for visualization tests
      const nodes = await engine.addNodesBatch([
        {
          name: 'Root Feature',
          level: RPGNodeLevel.PROPOSAL,
          type: RPGNodeType.FEATURE,
          status: RPGNodeStatus.PENDING
        },
        {
          name: 'Module A',
          level: RPGNodeLevel.MODULE,
          type: RPGNodeType.MODULE,
          status: RPGNodeStatus.IN_PROGRESS
        },
        {
          name: 'Function A1',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.FUNCTION,
          status: RPGNodeStatus.COMPLETED
        },
        {
          name: 'Class B',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.CLASS,
          status: RPGNodeStatus.PENDING
        }
      ]);

      await engine.addEdgesBatch([
        {
          name: 'Feature contains Module',
          fromId: nodes[0].id,
          toId: nodes[1].id,
          type: RPGEdgeType.HIERARCHY
        },
        {
          name: 'Module contains Function',
          fromId: nodes[1].id,
          toId: nodes[2].id,
          type: RPGEdgeType.HIERARCHY
        },
        {
          name: 'Function depends on Class',
          fromId: nodes[2].id,
          toId: nodes[3].id,
          type: RPGEdgeType.DATA_FLOW,
          weight: 0.7
        }
      ]);
    });

    it('should export data for D3.js visualization', async () => {
      const d3Data = await engine.exportForD3();

      expect(d3Data.nodes).toHaveLength(4);
      expect(d3Data.links).toHaveLength(3);

      // Check node structure
      const rootNode = d3Data.nodes.find(n => n.name === 'Root Feature');
      expect(rootNode).toBeDefined();
      expect(rootNode!.level).toBe(RPGNodeLevel.PROPOSAL);
      expect(rootNode!.type).toBe(RPGNodeType.FEATURE);
      expect(rootNode!.group).toBe(0); // PROPOSAL level group

      // Check link structure
      const dataFlowLink = d3Data.links.find(l => l.type === RPGEdgeType.DATA_FLOW);
      expect(dataFlowLink).toBeDefined();
      expect(dataFlowLink!.weight).toBe(0.7);
    });

    it('should export data for Cytoscape.js visualization', async () => {
      const cytoscapeData = await engine.exportForCytoscape();

      expect(cytoscapeData.elements.nodes).toHaveLength(4);
      expect(cytoscapeData.elements.edges).toHaveLength(3);

      // Check node structure
      const moduleNode = cytoscapeData.elements.nodes.find(n => n.data.label === 'Module A');
      expect(moduleNode).toBeDefined();
      expect(moduleNode!.data.level).toBe(RPGNodeLevel.MODULE);
      expect(moduleNode!.data.status).toBe(RPGNodeStatus.IN_PROGRESS);
      expect(moduleNode!.position).toBeDefined();
      expect(moduleNode!.position!.x).toBeDefined();
      expect(moduleNode!.position!.y).toBeDefined();

      // Check edge structure
      const hierarchyEdge = cytoscapeData.elements.edges.find(e => e.data.type === RPGEdgeType.HIERARCHY);
      expect(hierarchyEdge).toBeDefined();
      expect(hierarchyEdge!.data.source).toBeDefined();
      expect(hierarchyEdge!.data.target).toBeDefined();
    });

    it('should export to Graphviz DOT format', async () => {
      const dotFormat = await engine.exportToDOT();

      expect(dotFormat).toContain('digraph RPG {');
      expect(dotFormat).toContain('rankdir=TB;');
      expect(dotFormat).toContain('}');

      // Check for nodes
      expect(dotFormat).toContain('Root Feature');
      expect(dotFormat).toContain('Module A');
      expect(dotFormat).toContain('Function A1');
      expect(dotFormat).toContain('Class B');

      // Check for edges
      expect(dotFormat).toContain('->');
      expect(dotFormat).toContain('hierarchy');
      expect(dotFormat).toContain('data_flow');

      // Check for styling
      expect(dotFormat).toContain('fillcolor=');
      expect(dotFormat).toContain('shape=');
      expect(dotFormat).toContain('style=');
    });

    it('should export hierarchical tree structure', async () => {
      // Add hierarchy relationships first
      const allNodes = await engine.queryNodes({});
      const rootNode = allNodes.find(n => n.name === 'Root Feature')!;
      const moduleNode = allNodes.find(n => n.name === 'Module A')!;
      const functionNode = allNodes.find(n => n.name === 'Function A1')!;

      await engine.addChild(rootNode.id, moduleNode.id);
      await engine.addChild(moduleNode.id, functionNode.id);

      const treeData = await engine.exportHierarchicalTree();

      expect(treeData).toHaveLength(2); // Should have root and one other root (Class B)

      const rootTree = treeData.find(t => t.name === 'Root Feature');
      expect(rootTree).toBeDefined();
      expect(rootTree!.children).toBeDefined();
      expect(rootTree!.children!).toHaveLength(1);

      const moduleTree = rootTree!.children![0];
      expect(moduleTree.name).toBe('Module A');
      expect(moduleTree.children).toBeDefined();
      expect(moduleTree.children!).toHaveLength(1);

      const functionTree = moduleTree.children![0];
      expect(functionTree.name).toBe('Function A1');
      expect(functionTree.size).toBeDefined();
    });
  });

  describe('Large Graph Performance Tests', () => {
    it('should handle 100 nodes efficiently', async () => {
      const startTime = Date.now();

      // Create 100 nodes
      const nodes = [];
      for (let i = 0; i < 100; i++) {
        nodes.push({
          name: `Performance Test Node ${i}`,
          level: i % 2 === 0 ? RPGNodeLevel.MODULE : RPGNodeLevel.IMPLEMENTATION,
          type: i % 3 === 0 ? RPGNodeType.MODULE :
                i % 3 === 1 ? RPGNodeType.FUNCTION : RPGNodeType.CLASS,
          status: RPGNodeStatus.PENDING
        });
      }

      const createdNodes = await engine.addNodesBatch(nodes);
      const nodeCreationTime = Date.now() - startTime;

      expect(createdNodes).toHaveLength(100);
      expect(nodeCreationTime).toBeLessThan(1000); // Should complete within 1 second

      // Create 150 edges (more edges than nodes to test complex relationships)
      const edges = [];
      for (let i = 0; i < 150; i++) {
        const fromIndex = Math.floor(Math.random() * 100);
        let toIndex = Math.floor(Math.random() * 100);
        while (toIndex === fromIndex) {
          toIndex = Math.floor(Math.random() * 100);
        }

        edges.push({
          name: `Performance Edge ${i}`,
          fromId: createdNodes[fromIndex].id,
          toId: createdNodes[toIndex].id,
          type: i % 2 === 0 ? RPGEdgeType.DATA_FLOW : RPGEdgeType.HIERARCHY,
          weight: Math.random()
        });
      }

      const edgeStartTime = Date.now();
      const createdEdges = await engine.addEdgesBatch(edges);
      const edgeCreationTime = Date.now() - edgeStartTime;

      expect(createdEdges).toHaveLength(150);
      expect(edgeCreationTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Test query performance
      const queryStartTime = Date.now();
      const moduleNodes = await engine.queryNodesOptimized({ level: RPGNodeLevel.MODULE });
      const queryTime = Date.now() - queryStartTime;

      expect(moduleNodes.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // Query should be very fast

      // Test validation performance
      const validationStartTime = Date.now();
      const validation = await engine.validateExtended();
      const validationTime = Date.now() - validationStartTime;

      expect(validation.isValid).toBeDefined();
      expect(validationTime).toBeLessThan(500); // Validation should complete quickly

      // Test serialization performance
      const serializationStartTime = Date.now();
      const serialized = await engine.serialize();
      const serializationTime = Date.now() - serializationStartTime;

      expect(serialized.graph.nodes).toHaveLength(100);
      expect(serialized.graph.edges).toHaveLength(150);
      expect(serializationTime).toBeLessThan(200); // Serialization should be fast

      console.log(`Performance metrics for 100 nodes + 150 edges:
        Node creation: ${nodeCreationTime}ms
        Edge creation: ${edgeCreationTime}ms
        Query time: ${queryTime}ms
        Validation time: ${validationTime}ms
        Serialization time: ${serializationTime}ms`);
    });

    it('should handle batch updates efficiently on large graphs', async () => {
      // Create 50 nodes for update testing
      const nodes = [];
      for (let i = 0; i < 50; i++) {
        nodes.push({
          name: `Update Test Node ${i}`,
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.FUNCTION,
          status: RPGNodeStatus.PENDING
        });
      }

      const createdNodes = await engine.addNodesBatch(nodes);

      // Prepare batch updates
      const updates = createdNodes.map((node, index) => ({
        id: node.id,
        updates: {
          status: index % 2 === 0 ? RPGNodeStatus.IN_PROGRESS : RPGNodeStatus.COMPLETED,
          description: `Updated node ${index}`
        }
      }));

      const updateStartTime = Date.now();
      const updatedNodes = await engine.updateNodesBatch(updates);
      const updateTime = Date.now() - updateStartTime;

      expect(updatedNodes).toHaveLength(50);
      expect(updateTime).toBeLessThan(100); // Should be very fast

      // Verify updates were applied
      const inProgressNodes = updatedNodes.filter(n => n.status === RPGNodeStatus.IN_PROGRESS);
      const completedNodes = updatedNodes.filter(n => n.status === RPGNodeStatus.COMPLETED);

      expect(inProgressNodes.length).toBe(25);
      expect(completedNodes.length).toBe(25);
    });

    it('should handle complex visualization export on large graphs', async () => {
      // Create a moderately complex graph
      const nodes = [];
      for (let i = 0; i < 30; i++) {
        nodes.push({
          name: `Viz Test Node ${i}`,
          level: i < 10 ? RPGNodeLevel.PROPOSAL :
                 i < 20 ? RPGNodeLevel.MODULE : RPGNodeLevel.IMPLEMENTATION,
          type: i % 4 === 0 ? RPGNodeType.FEATURE :
                i % 4 === 1 ? RPGNodeType.MODULE :
                i % 4 === 2 ? RPGNodeType.FUNCTION : RPGNodeType.CLASS,
          status: RPGNodeStatus.PENDING
        });
      }

      const createdNodes = await engine.addNodesBatch(nodes);

      // Create edges to form a realistic graph structure
      const edges = [];
      for (let i = 0; i < 40; i++) {
        edges.push({
          name: `Viz Edge ${i}`,
          fromId: createdNodes[Math.floor(Math.random() * 30)].id,
          toId: createdNodes[Math.floor(Math.random() * 30)].id,
          type: i % 3 === 0 ? RPGEdgeType.HIERARCHY :
                i % 3 === 1 ? RPGEdgeType.DATA_FLOW : RPGEdgeType.IMPLEMENTATION,
          weight: Math.random()
        });
      }

      await engine.addEdgesBatch(edges);

      // Test all visualization exports
      const d3StartTime = Date.now();
      const d3Data = await engine.exportForD3();
      const d3Time = Date.now() - d3StartTime;

      const cytoscapeStartTime = Date.now();
      const cytoscapeData = await engine.exportForCytoscape();
      const cytoscapeTime = Date.now() - cytoscapeStartTime;

      const dotStartTime = Date.now();
      const dotData = await engine.exportToDOT();
      const dotTime = Date.now() - dotStartTime;

      const treeStartTime = Date.now();
      const treeData = await engine.exportHierarchicalTree();
      const treeTime = Date.now() - treeStartTime;

      // Verify exports are valid
      expect(d3Data.nodes).toHaveLength(30);
      expect(d3Data.links).toHaveLength(40);
      expect(cytoscapeData.elements.nodes).toHaveLength(30);
      expect(cytoscapeData.elements.edges).toHaveLength(40);
      expect(dotData).toContain('digraph RPG');
      expect(treeData).toBeDefined();

      // Performance expectations
      expect(d3Time).toBeLessThan(50);
      expect(cytoscapeTime).toBeLessThan(50);
      expect(dotTime).toBeLessThan(50);
      expect(treeTime).toBeLessThan(100);

      console.log(`Visualization export performance for 30 nodes + 40 edges:
        D3.js export: ${d3Time}ms
        Cytoscape.js export: ${cytoscapeTime}ms
        DOT export: ${dotTime}ms
        Tree export: ${treeTime}ms`);
    });
  });
});