/**
 * RPG Core Engine Persistence Tests
 * Tests for Task 37.4: RPG Persistence, Load, and Version Management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DependencyGraph } from '../../deps/DependencyGraph';
import { IDManager } from '../../id/IDManager';
import { RPGCoreEngine } from '../RPGCoreEngine';
import {
  RPGNodeLevel,
  RPGNodeType,
  RPGEdgeType,
  RPGNodeStatus
} from '../types';

describe('RPGCoreEngine Persistence Features', () => {
  let engine: RPGCoreEngine;
  let dependencyGraph: DependencyGraph;
  let idManager: IDManager;
  let testDir: string;

  beforeEach(async () => {
    dependencyGraph = new DependencyGraph();
    idManager = new IDManager({ prefix: 'test_', auto: true });
    engine = new RPGCoreEngine(dependencyGraph, idManager);
    await engine.initialize();

    // Create test directory
    testDir = path.join(process.cwd(), 'temp_test_persistence');
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Serialization and Deserialization', () => {
    it('should serialize empty graph correctly', async () => {
      const serialized = await engine.serialize();

      expect(serialized.format.version).toBe('1.0.0');
      expect(serialized.format.timestamp).toBeInstanceOf(Date);
      expect(serialized.graph.nodes).toEqual([]);
      expect(serialized.graph.edges).toEqual([]);
      expect(serialized.graph.rootNodeIds).toEqual([]);
    });

    it('should serialize and deserialize graph with nodes and edges', async () => {
      // Add some test data
      const node1 = await engine.addNode({
        name: 'Test Feature',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      const node2 = await engine.addNode({
        name: 'Test Module',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING,
        parentId: node1.id
      });

      const edge = await engine.addEdge({
        name: 'Feature contains Module',
        fromId: node1.id,
        toId: node2.id,
        type: RPGEdgeType.HIERARCHY
      });

      // Serialize
      const serialized = await engine.serialize();

      expect(serialized.graph.nodes).toHaveLength(2);
      expect(serialized.graph.edges).toHaveLength(1);
      expect(serialized.graph.rootNodeIds).toEqual([node1.id]);

      // Create new engine and deserialize
      const newEngine = new RPGCoreEngine();
      await newEngine.initialize();
      await newEngine.deserialize(serialized);

      // Verify deserialized data
      const deserializedNode1 = await newEngine.getNode(node1.id);
      const deserializedNode2 = await newEngine.getNode(node2.id);
      const deserializedEdge = await newEngine.getEdge(edge.id);

      expect(deserializedNode1).toBeDefined();
      expect(deserializedNode1?.name).toBe('Test Feature');
      expect(deserializedNode2).toBeDefined();
      expect(deserializedNode2?.name).toBe('Test Module');
      expect(deserializedEdge).toBeDefined();
      expect(deserializedEdge?.type).toBe(RPGEdgeType.HIERARCHY);

      // Verify statistics match
      const originalStats = await engine.getStatistics();
      const newStats = await newEngine.getStatistics();
      expect(newStats.nodeCount).toBe(originalStats.nodeCount);
      expect(newStats.edgeCount).toBe(originalStats.edgeCount);
    });

    it('should handle invalid serialization data', async () => {
      const invalidData = {
        format: { version: '1.0.0', timestamp: new Date() },
        // Missing graph field
      } as any;

      await expect(engine.deserialize(invalidData)).rejects.toThrow('Invalid serialization format');
    });
  });

  describe('File Operations', () => {
    it('should save and load graph to/from JSON file', async () => {
      // Add test data
      const node = await engine.addNode({
        name: 'File Test Node',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      const filePath = path.join(testDir, 'test-graph.json');

      // Save to file
      await engine.saveToFile(filePath, 'json');

      // Verify file exists and has content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const parsedContent = JSON.parse(fileContent);
      expect(parsedContent.graph.nodes).toHaveLength(1);
      expect(parsedContent.graph.nodes[0].name).toBe('File Test Node');

      // Load into new engine
      const newEngine = new RPGCoreEngine();
      await newEngine.initialize();
      await newEngine.loadFromFile(filePath);

      const loadedNode = await newEngine.getNode(node.id);
      expect(loadedNode).toBeDefined();
      expect(loadedNode?.name).toBe('File Test Node');
    });

    it('should save and load graph to/from GraphML file', async () => {
      // Add test data
      const node = await engine.addNode({
        name: 'GraphML Test Node',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      const filePath = path.join(testDir, 'test-graph.graphml');

      // Save to file (GraphML format)
      await engine.saveToFile(filePath, 'graphml');

      // Verify file exists and has GraphML content
      const fileContent = await fs.readFile(filePath, 'utf-8');
      expect(fileContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(fileContent).toContain('<graphml');
      expect(fileContent).toContain('GraphML Test Node');
    });

    it('should create nested directories when saving file', async () => {
      const nestedPath = path.join(testDir, 'nested', 'deep', 'graph.json');

      await engine.saveToFile(nestedPath);

      // Verify file exists
      await expect(fs.access(nestedPath)).resolves.not.toThrow();
    });

    it('should handle file loading errors gracefully', async () => {
      const nonExistentPath = path.join(testDir, 'nonexistent.json');

      await expect(engine.loadFromFile(nonExistentPath)).rejects.toThrow('Failed to load RPG from file');
    });
  });

  describe('Snapshot Management', () => {
    it('should create and restore snapshots correctly', async () => {
      // Add initial data
      const node1 = await engine.addNode({
        name: 'Initial Node',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      // Create snapshot
      const snapshotId = await engine.createSnapshot('Initial State');
      expect(snapshotId).toBeDefined();
      expect(typeof snapshotId).toBe('string');

      // Modify graph
      await engine.addNode({
        name: 'Added Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      const statsAfterModification = await engine.getStatistics();
      expect(statsAfterModification.nodeCount).toBe(2);

      // Restore snapshot
      await engine.restoreSnapshot(snapshotId);

      // Verify restoration
      const statsAfterRestore = await engine.getStatistics();
      expect(statsAfterRestore.nodeCount).toBe(1);

      const restoredNode = await engine.getNode(node1.id);
      expect(restoredNode).toBeDefined();
      expect(restoredNode?.name).toBe('Initial Node');
    });

    it('should handle invalid snapshot IDs', async () => {
      await expect(engine.restoreSnapshot('invalid_snapshot_id')).rejects.toThrow('Snapshot with ID invalid_snapshot_id not found');
    });

    it('should create snapshots with custom labels', async () => {
      const customLabel = 'My Custom Snapshot Label';
      const snapshotId = await engine.createSnapshot(customLabel);

      // The snapshot should be stored internally with the label
      // (This is verified by the successful creation - internal details)
      expect(snapshotId).toBeDefined();
    });
  });

  describe('Diff and Version Comparison', () => {
    it('should calculate diffs between snapshots correctly', async () => {
      // Create initial state
      const node1 = await engine.addNode({
        name: 'Original Node',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      const snapshot1 = await engine.createSnapshot('Before Changes');

      // Make changes
      const node2 = await engine.addNode({
        name: 'Added Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      const edge = await engine.addEdge({
        name: 'New Edge',
        fromId: node1.id,
        toId: node2.id,
        type: RPGEdgeType.HIERARCHY
      });

      // Modify original node
      await engine.updateNode(node1.id, {
        name: 'Modified Original Node',
        status: RPGNodeStatus.IN_PROGRESS
      });

      const snapshot2 = await engine.createSnapshot('After Changes');

      // Calculate diff
      const diff = await engine.getDiff(snapshot1, snapshot2);

      // Verify diff results
      expect(diff.addedNodes).toHaveLength(1);
      expect(diff.addedNodes[0].name).toBe('Added Node');

      expect(diff.removedNodes).toHaveLength(0);

      expect(diff.modifiedNodes).toHaveLength(1);
      expect(diff.modifiedNodes[0].before.name).toBe('Original Node');
      expect(diff.modifiedNodes[0].after.name).toBe('Modified Original Node');

      expect(diff.addedEdges).toHaveLength(1);
      expect(diff.addedEdges[0].type).toBe(RPGEdgeType.HIERARCHY);

      expect(diff.removedEdges).toHaveLength(0);
      expect(diff.modifiedEdges).toHaveLength(0);
    });

    it('should handle diffs with removed nodes and edges', async () => {
      // Create initial state with multiple nodes and edges
      const node1 = await engine.addNode({
        name: 'Node 1',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      const node2 = await engine.addNode({
        name: 'Node 2',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      const edge = await engine.addEdge({
        name: 'Edge 1-2',
        fromId: node1.id,
        toId: node2.id,
        type: RPGEdgeType.HIERARCHY
      });

      const snapshot1 = await engine.createSnapshot('Before Removal');

      // Remove node and edge
      await engine.removeEdge(edge.id);
      await engine.removeNode(node2.id);

      const snapshot2 = await engine.createSnapshot('After Removal');

      // Calculate diff
      const diff = await engine.getDiff(snapshot1, snapshot2);

      expect(diff.addedNodes).toHaveLength(0);
      expect(diff.removedNodes).toHaveLength(1);
      expect(diff.removedNodes[0].name).toBe('Node 2');

      expect(diff.addedEdges).toHaveLength(0);
      expect(diff.removedEdges).toHaveLength(1);
      expect(diff.removedEdges[0].type).toBe(RPGEdgeType.HIERARCHY);
    });

    it('should handle invalid snapshot IDs in diff calculation', async () => {
      const validSnapshot = await engine.createSnapshot('Valid');

      await expect(engine.getDiff('invalid', validSnapshot)).rejects.toThrow('From snapshot with ID invalid not found');
      await expect(engine.getDiff(validSnapshot, 'invalid')).rejects.toThrow('To snapshot with ID invalid not found');
    });
  });

  describe('Integration with Existing Features', () => {
    it('should preserve dependency graph state during serialization', async () => {
      // Create nodes with dependencies
      const serviceNode = await engine.addNode({
        name: 'User Service',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING
      });

      const repositoryNode = await engine.addNode({
        name: 'User Repository',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING
      });

      // Add dependency edge
      await engine.addEdge({
        name: 'Service uses Repository',
        fromId: serviceNode.id,
        toId: repositoryNode.id,
        type: RPGEdgeType.DATA_FLOW
      });

      // Serialize and deserialize
      const serialized = await engine.serialize();
      const newEngine = new RPGCoreEngine();
      await newEngine.initialize();
      await newEngine.deserialize(serialized);

      // Verify dependency graph was restored
      const topologicalOrder = await newEngine.getTopologicalOrder();
      expect(topologicalOrder).toContain(serviceNode.id);
      expect(topologicalOrder).toContain(repositoryNode.id);

      // Repository should come before Service in topological order
      const repoIndex = topologicalOrder.indexOf(repositoryNode.id);
      const serviceIndex = topologicalOrder.indexOf(serviceNode.id);
      expect(repoIndex).toBeLessThan(serviceIndex);
    });

    it('should preserve hierarchy relationships during serialization', async () => {
      // Create parent-child hierarchy
      const parentNode = await engine.addNode({
        name: 'Parent Feature',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      const childNode = await engine.addNode({
        name: 'Child Module',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      await engine.addChild(parentNode.id, childNode.id);

      // Serialize and deserialize
      const serialized = await engine.serialize();
      const newEngine = new RPGCoreEngine();
      await newEngine.initialize();
      await newEngine.deserialize(serialized);

      // Verify hierarchy was restored
      const restoredChild = await newEngine.getNode(childNode.id);
      expect(restoredChild?.parentId).toBe(parentNode.id);

      const childNodes = await newEngine.getChildNodes(parentNode.id);
      expect(childNodes).toHaveLength(1);
      expect(childNodes[0].id).toBe(childNode.id);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large graphs efficiently', async () => {
      // Create a moderately large graph for testing
      const nodeCount = 100;
      const nodes: any[] = [];

      // Add nodes
      for (let i = 0; i < nodeCount; i++) {
        const node = await engine.addNode({
          name: `Test Node ${i}`,
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.FUNCTION,
          status: RPGNodeStatus.PENDING
        });
        nodes.push(node);
      }

      // Add some edges
      for (let i = 0; i < nodeCount - 1; i += 2) {
        await engine.addEdge({
          name: `Edge ${i}-${i+1}`,
          fromId: nodes[i].id,
          toId: nodes[i + 1].id,
          type: RPGEdgeType.DATA_FLOW
        });
      }

      // Test serialization performance
      const startTime = Date.now();
      const serialized = await engine.serialize();
      const serializationTime = Date.now() - startTime;

      expect(serializationTime).toBeLessThan(1000); // Should complete within 1 second
      expect(serialized.graph.nodes).toHaveLength(nodeCount);

      // Test deserialization performance
      const deserializeStartTime = Date.now();
      const newEngine = new RPGCoreEngine();
      await newEngine.initialize();
      await newEngine.deserialize(serialized);
      const deserializationTime = Date.now() - deserializeStartTime;

      expect(deserializationTime).toBeLessThan(1000); // Should complete within 1 second

      const finalStats = await newEngine.getStatistics();
      expect(finalStats.nodeCount).toBe(nodeCount);
    });

    it('should handle empty state serialization correctly', async () => {
      const serialized = await engine.serialize();

      const newEngine = new RPGCoreEngine();
      await newEngine.initialize();
      await newEngine.deserialize(serialized);

      const stats = await newEngine.getStatistics();
      expect(stats.nodeCount).toBe(0);
      expect(stats.edgeCount).toBe(0);
    });
  });
});