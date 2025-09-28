/**
 * RPG Core Engine Tests
 * Tests for type safety, validation, and basic functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DependencyGraph } from '../../deps/DependencyGraph';
import { IDManager } from '../../id/IDManager';
import { RPGCoreEngine } from '../RPGCoreEngine';
import {
  RPGNodeLevel,
  RPGNodeType,
  RPGEdgeType,
  RPGNodeStatus,
  type RPGNode,
  type RPGEdge
} from '../types';

describe('RPGCoreEngine', () => {
  let engine: RPGCoreEngine;
  let dependencyGraph: DependencyGraph;
  let idManager: IDManager;

  beforeEach(async () => {
    dependencyGraph = new DependencyGraph();
    idManager = new IDManager({ prefix: 'test_', auto: true });
    engine = new RPGCoreEngine(dependencyGraph, idManager);
    await engine.initialize();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const status = await engine.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.nodeCount).toBe(0);
      expect(status.edgeCount).toBe(0);
    });

    it('should clear all data on initialization', async () => {
      // Add some test data
      await engine.addNode({
        name: 'Test Node',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      // Re-initialize
      await engine.initialize();

      const status = await engine.getStatus();
      expect(status.nodeCount).toBe(0);
    });

    it('should provide access to underlying components', () => {
      expect(engine.getDependencyGraph()).toBe(dependencyGraph);
      expect(engine.getIDManager()).toBe(idManager);
    });
  });

  describe('Node Management', () => {
    it('should add nodes with auto-generated IDs', async () => {
      const nodeData = {
        name: 'Test Feature',
        description: 'A test feature for RPG',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      };

      const node = await engine.addNode(nodeData);

      expect(node.id).toMatch(/^test_/);
      expect(node.name).toBe(nodeData.name);
      expect(node.level).toBe(nodeData.level);
      expect(node.type).toBe(nodeData.type);
      expect(node.status).toBe(nodeData.status);
      expect(node.createdAt).toBeInstanceOf(Date);
      expect(node.updatedAt).toBeInstanceOf(Date);
    });

    it('should add nodes with manual IDs', async () => {
      const nodeData = {
        name: 'Manual ID Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      };

      const node = await engine.addNode(nodeData, 'custom_id');

      expect(node.id).toBe('test_custom_id'); // ID Manager applies prefix
      expect(node.name).toBe(nodeData.name);
    });

    it('should retrieve nodes by ID', async () => {
      const nodeData = {
        name: 'Retrievable Node',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.FUNCTION,
        status: RPGNodeStatus.PENDING
      };

      const addedNode = await engine.addNode(nodeData);
      const retrievedNode = await engine.getNode(addedNode.id);

      expect(retrievedNode).toEqual(addedNode);
    });

    it('should return null for non-existent nodes', async () => {
      const node = await engine.getNode('non_existent_id');
      expect(node).toBeNull();
    });

    it('should update existing nodes', async () => {
      const nodeData = {
        name: 'Original Name',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      };

      const originalNode = await engine.addNode(nodeData);
      const updates = {
        name: 'Updated Name',
        status: RPGNodeStatus.IN_PROGRESS,
        description: 'Updated description'
      };

      const updatedNode = await engine.updateNode(originalNode.id, updates);

      expect(updatedNode.id).toBe(originalNode.id);
      expect(updatedNode.name).toBe(updates.name);
      expect(updatedNode.status).toBe(updates.status);
      expect(updatedNode.description).toBe(updates.description);
      expect(updatedNode.level).toBe(originalNode.level); // Unchanged
      expect(updatedNode.updatedAt.getTime()).toBeGreaterThanOrEqual(originalNode.createdAt.getTime());
    });

    it('should throw error when updating non-existent node', async () => {
      await expect(
        engine.updateNode('non_existent', { name: 'New Name' })
      ).rejects.toThrow('Node with ID non_existent not found');
    });

    it('should remove nodes and their relationships', async () => {
      const nodeData = {
        name: 'Node to Remove',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      };

      const node = await engine.addNode(nodeData);
      const removed = await engine.removeNode(node.id);

      expect(removed).toBe(true);

      const retrievedNode = await engine.getNode(node.id);
      expect(retrievedNode).toBeNull();
    });

    it('should return false when removing non-existent node', async () => {
      const removed = await engine.removeNode('non_existent');
      expect(removed).toBe(false);
    });

    it('should query nodes by level', async () => {
      await engine.addNode({
        name: 'Proposal Node',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      await engine.addNode({
        name: 'Module Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      const proposalNodes = await engine.getNodesByLevel(RPGNodeLevel.PROPOSAL);
      const moduleNodes = await engine.getNodesByLevel(RPGNodeLevel.MODULE);

      expect(proposalNodes).toHaveLength(1);
      expect(proposalNodes[0].name).toBe('Proposal Node');
      expect(moduleNodes).toHaveLength(1);
      expect(moduleNodes[0].name).toBe('Module Node');
    });

    it('should query nodes by type', async () => {
      await engine.addNode({
        name: 'Feature Node',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      await engine.addNode({
        name: 'Function Node',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.FUNCTION,
        status: RPGNodeStatus.PENDING
      });

      const featureNodes = await engine.getNodesByType(RPGNodeType.FEATURE);
      const functionNodes = await engine.getNodesByType(RPGNodeType.FUNCTION);

      expect(featureNodes).toHaveLength(1);
      expect(featureNodes[0].name).toBe('Feature Node');
      expect(functionNodes).toHaveLength(1);
      expect(functionNodes[0].name).toBe('Function Node');
    });

    it('should support complex node queries', async () => {
      await engine.addNode({
        name: 'Pending Feature',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING,
        filePath: '/src/features/auth.ts'
      });

      await engine.addNode({
        name: 'In Progress Feature',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.IN_PROGRESS,
        filePath: '/src/features/user.ts'
      });

      // Query by multiple criteria
      const results = await engine.queryNodes({
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING,
        filePathPattern: '.*auth.*'
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Pending Feature');
    });
  });

  describe('Edge Management', () => {
    let sourceNode: RPGNode;
    let targetNode: RPGNode;

    beforeEach(async () => {
      sourceNode = await engine.addNode({
        name: 'Source Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      targetNode = await engine.addNode({
        name: 'Target Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });
    });

    it('should add edges between existing nodes', async () => {
      const edgeData = {
        name: 'Test Edge',
        description: 'A test edge for RPG',
        fromId: sourceNode.id,
        toId: targetNode.id,
        type: RPGEdgeType.DATA_FLOW,
        weight: 1.0
      };

      const edge = await engine.addEdge(edgeData);

      expect(edge.id).toMatch(/^test_/);
      expect(edge.name).toBe(edgeData.name);
      expect(edge.fromId).toBe(sourceNode.id);
      expect(edge.toId).toBe(targetNode.id);
      expect(edge.type).toBe(RPGEdgeType.DATA_FLOW);
      expect(edge.weight).toBe(1.0);
      expect(edge.createdAt).toBeInstanceOf(Date);
    });

    it('should throw error when adding edge with non-existent source node', async () => {
      const edgeData = {
        name: 'Invalid Edge',
        fromId: 'non_existent',
        toId: targetNode.id,
        type: RPGEdgeType.DATA_FLOW
      };

      await expect(engine.addEdge(edgeData)).rejects.toThrow('Source node non_existent does not exist');
    });

    it('should throw error when adding edge with non-existent target node', async () => {
      const edgeData = {
        name: 'Invalid Edge',
        fromId: sourceNode.id,
        toId: 'non_existent',
        type: RPGEdgeType.DATA_FLOW
      };

      await expect(engine.addEdge(edgeData)).rejects.toThrow('Target node non_existent does not exist');
    });

    it('should retrieve edges by ID', async () => {
      const edgeData = {
        name: 'Retrievable Edge',
        fromId: sourceNode.id,
        toId: targetNode.id,
        type: RPGEdgeType.IMPLEMENTATION
      };

      const addedEdge = await engine.addEdge(edgeData);
      const retrievedEdge = await engine.getEdge(addedEdge.id);

      expect(retrievedEdge).toEqual(addedEdge);
    });

    it('should get outgoing and incoming edges', async () => {
      const edge1Data = {
        name: 'Outgoing Edge',
        fromId: sourceNode.id,
        toId: targetNode.id,
        type: RPGEdgeType.DATA_FLOW
      };

      const thirdNode = await engine.addNode({
        name: 'Third Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      const edge2Data = {
        name: 'Incoming Edge',
        fromId: thirdNode.id,
        toId: sourceNode.id,
        type: RPGEdgeType.HIERARCHY
      };

      await engine.addEdge(edge1Data);
      await engine.addEdge(edge2Data);

      const outgoingEdges = await engine.getOutgoingEdges(sourceNode.id);
      const incomingEdges = await engine.getIncomingEdges(sourceNode.id);

      expect(outgoingEdges).toHaveLength(1);
      expect(outgoingEdges[0].toId).toBe(targetNode.id);
      expect(incomingEdges).toHaveLength(1);
      expect(incomingEdges[0].fromId).toBe(thirdNode.id);
    });

    it('should check edge existence', async () => {
      const edgeData = {
        name: 'Test Edge',
        fromId: sourceNode.id,
        toId: targetNode.id,
        type: RPGEdgeType.DATA_FLOW
      };

      await engine.addEdge(edgeData);

      const hasEdge = await engine.hasEdge(sourceNode.id, targetNode.id);
      const hasSpecificEdge = await engine.hasEdge(sourceNode.id, targetNode.id, RPGEdgeType.DATA_FLOW);
      const hasWrongType = await engine.hasEdge(sourceNode.id, targetNode.id, RPGEdgeType.HIERARCHY);

      expect(hasEdge).toBe(true);
      expect(hasSpecificEdge).toBe(true);
      expect(hasWrongType).toBe(false);
    });

    it('should remove edges', async () => {
      const edgeData = {
        name: 'Edge to Remove',
        fromId: sourceNode.id,
        toId: targetNode.id,
        type: RPGEdgeType.DATA_FLOW
      };

      const edge = await engine.addEdge(edgeData);
      const removed = await engine.removeEdge(edge.id);

      expect(removed).toBe(true);

      const retrievedEdge = await engine.getEdge(edge.id);
      expect(retrievedEdge).toBeNull();
    });

    it('should query edges by type', async () => {
      await engine.addEdge({
        name: 'Data Flow Edge',
        fromId: sourceNode.id,
        toId: targetNode.id,
        type: RPGEdgeType.DATA_FLOW
      });

      await engine.addEdge({
        name: 'Hierarchy Edge',
        fromId: sourceNode.id,
        toId: targetNode.id,
        type: RPGEdgeType.HIERARCHY
      });

      const dataFlowEdges = await engine.getEdgesByType(RPGEdgeType.DATA_FLOW);
      const hierarchyEdges = await engine.getEdgesByType(RPGEdgeType.HIERARCHY);

      expect(dataFlowEdges).toHaveLength(1);
      expect(dataFlowEdges[0].name).toBe('Data Flow Edge');
      expect(hierarchyEdges).toHaveLength(1);
      expect(hierarchyEdges[0].name).toBe('Hierarchy Edge');
    });
  });

  describe('Hierarchy Management', () => {
    let parentNode: RPGNode;
    let childNode: RPGNode;

    beforeEach(async () => {
      parentNode = await engine.addNode({
        name: 'Parent Node',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      childNode = await engine.addNode({
        name: 'Child Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });
    });

    it('should establish parent-child relationships', async () => {
      await engine.addChild(parentNode.id, childNode.id);

      const children = await engine.getChildNodes(parentNode.id);
      const parent = await engine.getParentNode(childNode.id);

      expect(children).toHaveLength(1);
      expect(children[0].id).toBe(childNode.id);
      expect(parent?.id).toBe(parentNode.id);
    });

    it('should move nodes between parents', async () => {
      const newParent = await engine.addNode({
        name: 'New Parent',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      await engine.addChild(parentNode.id, childNode.id);
      await engine.moveNode(childNode.id, newParent.id);

      const oldParentChildren = await engine.getChildNodes(parentNode.id);
      const newParentChildren = await engine.getChildNodes(newParent.id);
      const childParent = await engine.getParentNode(childNode.id);

      expect(oldParentChildren).toHaveLength(0);
      expect(newParentChildren).toHaveLength(1);
      expect(newParentChildren[0].id).toBe(childNode.id);
      expect(childParent?.id).toBe(newParent.id);
    });

    it('should get node paths from root', async () => {
      const grandChild = await engine.addNode({
        name: 'Grandchild Node',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.FUNCTION,
        status: RPGNodeStatus.PENDING
      });

      await engine.addChild(parentNode.id, childNode.id);
      await engine.addChild(childNode.id, grandChild.id);

      const path = await engine.getNodePath(grandChild.id);

      expect(path).toHaveLength(3);
      expect(path[0].id).toBe(parentNode.id);
      expect(path[1].id).toBe(childNode.id);
      expect(path[2].id).toBe(grandChild.id);
    });

    it('should calculate node depth', async () => {
      const grandChild = await engine.addNode({
        name: 'Grandchild Node',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.FUNCTION,
        status: RPGNodeStatus.PENDING
      });

      await engine.addChild(parentNode.id, childNode.id);
      await engine.addChild(childNode.id, grandChild.id);

      const parentDepth = await engine.getNodeDepth(parentNode.id);
      const childDepth = await engine.getNodeDepth(childNode.id);
      const grandChildDepth = await engine.getNodeDepth(grandChild.id);

      expect(parentDepth).toBe(0);
      expect(childDepth).toBe(1);
      expect(grandChildDepth).toBe(2);
    });

    it('should identify root and leaf nodes', async () => {
      const anotherRoot = await engine.addNode({
        name: 'Another Root',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      await engine.addChild(parentNode.id, childNode.id);

      const rootNodes = await engine.getRootNodes();
      const leafNodes = await engine.getLeafNodes();

      expect(rootNodes).toHaveLength(2);
      expect(rootNodes.map(n => n.id).sort()).toEqual([parentNode.id, anotherRoot.id].sort());
      expect(leafNodes).toHaveLength(2);
      expect(leafNodes.map(n => n.id).sort()).toEqual([childNode.id, anotherRoot.id].sort());
    });
  });

  describe('Dependency Management', () => {
    let nodeA: RPGNode;
    let nodeB: RPGNode;
    let nodeC: RPGNode;

    beforeEach(async () => {
      nodeA = await engine.addNode({
        name: 'Node A',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      nodeB = await engine.addNode({
        name: 'Node B',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      nodeC = await engine.addNode({
        name: 'Node C',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });
    });

    it('should manage dependencies between nodes', async () => {
      await engine.addDependency(nodeA.id, nodeB.id); // A depends on B

      const dependencies = await engine.getDependencies(nodeA.id);
      const dependents = await engine.getDependents(nodeB.id);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0]).toBe(nodeB.id);
      expect(dependents).toHaveLength(1);
      expect(dependents[0]).toBe(nodeA.id);
    });

    it('should detect dependency cycles', async () => {
      await engine.addDependency(nodeA.id, nodeB.id); // A -> B
      await engine.addDependency(nodeB.id, nodeC.id); // B -> C
      await engine.addDependency(nodeC.id, nodeA.id); // C -> A (creates cycle)

      const cycles = await engine.findDependencyCycles();

      expect(cycles.length).toBeGreaterThan(0);
      expect(cycles[0].length).toBeGreaterThanOrEqual(3);
    });

    it('should perform topological sort on acyclic dependencies', async () => {
      await engine.addDependency(nodeA.id, nodeB.id); // A depends on B
      await engine.addDependency(nodeB.id, nodeC.id); // B depends on C

      const sorted = await engine.getTopologicalOrder();

      // C should come before B, B should come before A
      const cIndex = sorted.indexOf(nodeC.id);
      const bIndex = sorted.indexOf(nodeB.id);
      const aIndex = sorted.indexOf(nodeA.id);

      expect(cIndex).toBeLessThan(bIndex);
      expect(bIndex).toBeLessThan(aIndex);
    });

    it('should validate dependencies', async () => {
      await engine.addDependency(nodeA.id, nodeB.id);

      const validation = await engine.validateDependencies();

      expect(validation.isValid).toBe(true);
      expect(validation.cycles).toHaveLength(0);
    });
  });

  describe('Graph Validation', () => {
    it('should validate empty graph', async () => {
      const validation = await engine.validate();

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect orphaned nodes', async () => {
      await engine.addNode({
        name: 'Orphaned Node',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      const orphans = await engine.findOrphanedNodes();
      const validation = await engine.validate();

      expect(orphans).toHaveLength(1);
      expect(orphans[0].name).toBe('Orphaned Node');
      expect(validation.warnings.some(w => w.type === 'missing_implementation')).toBe(true);
    });

    it('should provide graph statistics', async () => {
      await engine.addNode({
        name: 'Feature Node',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      await engine.addNode({
        name: 'Module Node',
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING
      });

      const stats = await engine.getStatistics();

      expect(stats.nodeCount).toBe(2);
      expect(stats.levelDistribution[RPGNodeLevel.PROPOSAL]).toBe(1);
      expect(stats.levelDistribution[RPGNodeLevel.MODULE]).toBe(1);
      expect(stats.typeDistribution[RPGNodeType.FEATURE]).toBe(1);
      expect(stats.typeDistribution[RPGNodeType.MODULE]).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when operating on uninitialized engine', async () => {
      const uninitializedEngine = new RPGCoreEngine();

      await expect(
        uninitializedEngine.addNode({
          name: 'Test',
          level: RPGNodeLevel.PROPOSAL,
          type: RPGNodeType.FEATURE,
          status: RPGNodeStatus.PENDING
        })
      ).rejects.toThrow('RPGCoreEngine is not initialized');
    });

    it('should handle graceful shutdown', async () => {
      await engine.addNode({
        name: 'Test Node',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING
      });

      await engine.shutdown();

      const status = await engine.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.nodeCount).toBe(0);
    });
  });
});