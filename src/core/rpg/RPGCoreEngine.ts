/**
 * Repository Planning Graph (RPG) Core Engine Implementation
 * Integrates with existing DependencyGraph and IDManager
 */

import { DependencyGraph } from '../deps/DependencyGraph';
import { IDManager } from '../id/IDManager';
import {
  RPGNode,
  RPGEdge,
  RPGGraph,
  RPGNodeQuery,
  RPGEdgeQuery,
  RPGValidationResult,
  RPGSerializationFormat,
  RPGConstructionOptions,
  RPGNodeLevel,
  RPGNodeType,
  RPGEdgeType,
  _RPGNodeStatus
} from './types';
import { IRPGCoreEngine } from './interfaces';

export class RPGCoreEngine implements IRPGCoreEngine {
  private dependencyGraph: DependencyGraph;
  private idManager: IDManager;
  private nodes: Map<string, RPGNode>;
  private edges: Map<string, RPGEdge>;
  private nodeChildren: Map<string, Set<string>>;
  private nodeParents: Map<string, string>;
  private initialized: boolean = false;
  private options?: RPGConstructionOptions;

  constructor(
    dependencyGraph?: DependencyGraph,
    idManager?: IDManager,
    options?: RPGConstructionOptions
  ) {
    this.dependencyGraph = dependencyGraph || new DependencyGraph();
    this.idManager = idManager || new IDManager({
      prefix: options?.idPrefix || 'rpg_',
      auto: options?.autoGenerateIds ?? true
    });
    this.nodes = new Map();
    this.edges = new Map();
    this.nodeChildren = new Map();
    this.nodeParents = new Map();
    this.options = options;
  }

  // ============================================================================
  // Core Engine Management
  // ============================================================================

  async initialize(options?: RPGConstructionOptions & {
    dependencyGraph?: DependencyGraph;
    idManager?: IDManager;
  }): Promise<void> {
    if (options?.dependencyGraph) {
      this.dependencyGraph = options.dependencyGraph;
    }
    if (options?.idManager) {
      this.idManager = options.idManager;
    }
    if (options) {
      this.options = { ...this.options, ...options };
    }

    this.nodes.clear();
    this.edges.clear();
    this.nodeChildren.clear();
    this.nodeParents.clear();
    this.dependencyGraph.clear();

    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.nodes.clear();
    this.edges.clear();
    this.nodeChildren.clear();
    this.nodeParents.clear();
    this.dependencyGraph.clear();
    this.initialized = false;
  }

  async getStatus(): Promise<{
    initialized: boolean;
    nodeCount: number;
    edgeCount: number;
    memoryUsage?: number;
    lastOperation?: {
      type: string;
      timestamp: Date;
      duration: number;
    };
  }> {
    return {
      initialized: this.initialized,
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      memoryUsage: process.memoryUsage?.()?.heapUsed
    };
  }

  getDependencyGraph(): DependencyGraph {
    return this.dependencyGraph;
  }

  getIDManager(): IDManager {
    return this.idManager;
  }

  // ============================================================================
  // Node Management
  // ============================================================================

  async addNode(node: Omit<RPGNode, 'id' | 'createdAt' | 'updatedAt'>, nodeId?: string): Promise<RPGNode> {
    this.ensureInitialized();

    const id = this.idManager.assign(nodeId);
    const now = new Date();

    const newNode: RPGNode = {
      ...node,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.nodes.set(id, newNode);
    this.dependencyGraph.addNode(id);

    // Handle hierarchy
    if (newNode.parentId) {
      await this.addChild(newNode.parentId, id);
    }

    if (newNode.childIds) {
      this.nodeChildren.set(id, new Set(newNode.childIds));
      for (const childId of newNode.childIds) {
        this.nodeParents.set(childId, id);
      }
    } else {
      this.nodeChildren.set(id, new Set());
    }

    return newNode;
  }

  async getNode(nodeId: string): Promise<RPGNode | null> {
    return this.nodes.get(nodeId) || null;
  }

  async updateNode(nodeId: string, updates: Partial<RPGNode>): Promise<RPGNode> {
    this.ensureInitialized();

    const existingNode = this.nodes.get(nodeId);
    if (!existingNode) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }

    const updatedNode: RPGNode = {
      ...existingNode,
      ...updates,
      id: nodeId, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    this.nodes.set(nodeId, updatedNode);
    return updatedNode;
  }

  async removeNode(nodeId: string): Promise<boolean> {
    this.ensureInitialized();

    const node = this.nodes.get(nodeId);
    if (!node) {
      return false;
    }

    // Remove from hierarchy
    if (node.parentId) {
      await this.removeChild(node.parentId, nodeId);
    }

    // Remove children relationships
    const children = this.nodeChildren.get(nodeId);
    if (children) {
      for (const childId of children) {
        this.nodeParents.delete(childId);
      }
    }

    // Remove from dependency graph
    this.dependencyGraph.removeNode(nodeId);

    // Remove associated edges
    const edgesToRemove: string[] = [];
    for (const [edgeId, edge] of this.edges) {
      if (edge.fromId === nodeId || edge.toId === nodeId) {
        edgesToRemove.push(edgeId);
      }
    }

    for (const edgeId of edgesToRemove) {
      this.edges.delete(edgeId);
    }

    // Remove from internal maps
    this.nodes.delete(nodeId);
    this.nodeChildren.delete(nodeId);
    this.nodeParents.delete(nodeId);

    return true;
  }

  async queryNodes(query: RPGNodeQuery): Promise<RPGNode[]> {
    const results: RPGNode[] = [];

    for (const node of this.nodes.values()) {
      if (this.matchesNodeQuery(node, query)) {
        results.push(node);
      }
    }

    return results.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getChildNodes(parentId: string): Promise<RPGNode[]> {
    const childIds = this.nodeChildren.get(parentId);
    if (!childIds) {
      return [];
    }

    const children: RPGNode[] = [];
    for (const childId of childIds) {
      const child = this.nodes.get(childId);
      if (child) {
        children.push(child);
      }
    }

    return children.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getParentNode(childId: string): Promise<RPGNode | null> {
    const parentId = this.nodeParents.get(childId);
    if (!parentId) {
      return null;
    }

    return this.nodes.get(parentId) || null;
  }

  async getNodesByLevel(level: RPGNodeLevel): Promise<RPGNode[]> {
    return this.queryNodes({ level });
  }

  async getNodesByType(type: RPGNodeType): Promise<RPGNode[]> {
    return this.queryNodes({ type });
  }

  // ============================================================================
  // Edge Management
  // ============================================================================

  async addEdge(edge: Omit<RPGEdge, 'id' | 'createdAt' | 'updatedAt'>, edgeId?: string): Promise<RPGEdge> {
    this.ensureInitialized();

    // Validate that both nodes exist
    if (!this.nodes.has(edge.fromId)) {
      throw new Error(`Source node ${edge.fromId} does not exist`);
    }
    if (!this.nodes.has(edge.toId)) {
      throw new Error(`Target node ${edge.toId} does not exist`);
    }

    const id = this.idManager.assign(edgeId);
    const now = new Date();

    const newEdge: RPGEdge = {
      ...edge,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.edges.set(id, newEdge);

    // Add to dependency graph if it's a dependency type
    if (edge.type === RPGEdgeType.DATA_FLOW ||
        edge.type === RPGEdgeType.IMPLEMENTATION ||
        edge.type === RPGEdgeType.INTER_MODULE ||
        edge.type === RPGEdgeType.INTRA_MODULE) {
      this.dependencyGraph.addEdge(edge.fromId, edge.toId);
    }

    return newEdge;
  }

  async getEdge(edgeId: string): Promise<RPGEdge | null> {
    return this.edges.get(edgeId) || null;
  }

  async updateEdge(edgeId: string, updates: Partial<RPGEdge>): Promise<RPGEdge> {
    this.ensureInitialized();

    const existingEdge = this.edges.get(edgeId);
    if (!existingEdge) {
      throw new Error(`Edge with ID ${edgeId} not found`);
    }

    const updatedEdge: RPGEdge = {
      ...existingEdge,
      ...updates,
      id: edgeId, // Ensure ID doesn't change
      updatedAt: new Date()
    };

    this.edges.set(edgeId, updatedEdge);
    return updatedEdge;
  }

  async removeEdge(edgeId: string): Promise<boolean> {
    this.ensureInitialized();

    const edge = this.edges.get(edgeId);
    if (!edge) {
      return false;
    }

    // Remove from dependency graph if it was added there
    if (edge.type === RPGEdgeType.DATA_FLOW ||
        edge.type === RPGEdgeType.IMPLEMENTATION ||
        edge.type === RPGEdgeType.INTER_MODULE ||
        edge.type === RPGEdgeType.INTRA_MODULE) {
      this.dependencyGraph.removeEdge(edge.fromId, edge.toId);
    }

    this.edges.delete(edgeId);
    return true;
  }

  async queryEdges(query: RPGEdgeQuery): Promise<RPGEdge[]> {
    const results: RPGEdge[] = [];

    for (const edge of this.edges.values()) {
      if (this.matchesEdgeQuery(edge, query)) {
        results.push(edge);
      }
    }

    return results.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getEdgesByType(type: RPGEdgeType): Promise<RPGEdge[]> {
    return this.queryEdges({ type });
  }

  async getOutgoingEdges(nodeId: string): Promise<RPGEdge[]> {
    return this.queryEdges({ fromId: nodeId });
  }

  async getIncomingEdges(nodeId: string): Promise<RPGEdge[]> {
    return this.queryEdges({ toId: nodeId });
  }

  async hasEdge(fromId: string, toId: string, type?: RPGEdgeType): Promise<boolean> {
    const query: RPGEdgeQuery = { fromId, toId };
    if (type) {
      query.type = type;
    }

    const edges = await this.queryEdges(query);
    return edges.length > 0;
  }

  // ============================================================================
  // Graph Management
  // ============================================================================

  async getGraph(): Promise<RPGGraph> {
    return {
      metadata: {
        version: '1.0.0',
        createdAt: new Date(), // TODO: Track actual creation time
        updatedAt: new Date(),
        description: 'RPG Graph'
      },
      nodes: new Map(this.nodes),
      edges: new Map(this.edges),
      rootNodeIds: await this.getRootNodeIds()
    };
  }

  async clear(): Promise<void> {
    this.nodes.clear();
    this.edges.clear();
    this.nodeChildren.clear();
    this.nodeParents.clear();
    this.dependencyGraph.clear();
  }

  async getStatistics(): Promise<{
    nodeCount: number;
    edgeCount: number;
    levelDistribution: Record<RPGNodeLevel, number>;
    typeDistribution: Record<RPGNodeType, number>;
    edgeTypeDistribution: Record<RPGEdgeType, number>;
  }> {
    const levelDist: Record<RPGNodeLevel, number> = {} as any;
    const typeDist: Record<RPGNodeType, number> = {} as any;
    const edgeTypeDist: Record<RPGEdgeType, number> = {} as any;

    // Initialize distributions
    Object.values(RPGNodeLevel).forEach(level => levelDist[level] = 0);
    Object.values(RPGNodeType).forEach(type => typeDist[type] = 0);
    Object.values(RPGEdgeType).forEach(type => edgeTypeDist[type] = 0);

    // Count nodes
    for (const node of this.nodes.values()) {
      levelDist[node.level]++;
      typeDist[node.type]++;
    }

    // Count edges
    for (const edge of this.edges.values()) {
      edgeTypeDist[edge.type]++;
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      levelDistribution: levelDist,
      typeDistribution: typeDist,
      edgeTypeDistribution: edgeTypeDist
    };
  }

  async validate(): Promise<RPGValidationResult> {
    const errors: RPGValidationResult['errors'] = [];
    const warnings: RPGValidationResult['warnings'] = [];

    // Check for dependency cycles using the dependency graph
    try {
      const cycles = this.dependencyGraph.findCycles();
      if (cycles.length > 0) {
        errors.push({
          type: 'cycle',
          message: `Found ${cycles.length} dependency cycles`,
          nodeIds: cycles.flat()
        });
      }
    } catch (_e) {
      errors.push({
        type: 'cycle',
        message: 'Error checking for cycles',
        nodeIds: []
      });
    }

    // Check for orphaned nodes
    const orphans = await this.findOrphanedNodes();
    if (orphans.length > 0) {
      warnings.push({
        type: 'missing_implementation',
        message: `Found ${orphans.length} orphaned nodes`,
        nodeIds: orphans.map(n => n.id)
      });
    }

    // Check for invalid edge references
    for (const edge of this.edges.values()) {
      if (!this.nodes.has(edge.fromId)) {
        errors.push({
          type: 'invalid_reference',
          message: `Edge ${edge.id} references non-existent source node ${edge.fromId}`,
          edgeIds: [edge.id]
        });
      }
      if (!this.nodes.has(edge.toId)) {
        errors.push({
          type: 'invalid_reference',
          message: `Edge ${edge.id} references non-existent target node ${edge.toId}`,
          edgeIds: [edge.id]
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getRootNodes(): Promise<RPGNode[]> {
    const rootIds = await this.getRootNodeIds();
    const roots: RPGNode[] = [];

    for (const id of rootIds) {
      const node = this.nodes.get(id);
      if (node) {
        roots.push(node);
      }
    }

    return roots;
  }

  async getLeafNodes(): Promise<RPGNode[]> {
    const leaves: RPGNode[] = [];

    for (const node of this.nodes.values()) {
      const children = this.nodeChildren.get(node.id);
      if (!children || children.size === 0) {
        leaves.push(node);
      }
    }

    return leaves;
  }

  async findOrphanedNodes(): Promise<RPGNode[]> {
    const orphans: RPGNode[] = [];

    for (const node of this.nodes.values()) {
      const hasParent = this.nodeParents.has(node.id);
      const hasChildren = this.nodeChildren.get(node.id)?.size ?? 0 > 0;
      const hasIncomingEdges = (await this.getIncomingEdges(node.id)).length > 0;
      const hasOutgoingEdges = (await this.getOutgoingEdges(node.id)).length > 0;

      if (!hasParent && !hasChildren && !hasIncomingEdges && !hasOutgoingEdges) {
        orphans.push(node);
      }
    }

    return orphans;
  }

  // ============================================================================
  // Hierarchy Management
  // ============================================================================

  async addChild(parentId: string, childId: string): Promise<void> {
    if (!this.nodes.has(parentId)) {
      throw new Error(`Parent node ${parentId} does not exist`);
    }
    if (!this.nodes.has(childId)) {
      throw new Error(`Child node ${childId} does not exist`);
    }

    let children = this.nodeChildren.get(parentId);
    if (!children) {
      children = new Set();
      this.nodeChildren.set(parentId, children);
    }

    children.add(childId);
    this.nodeParents.set(childId, parentId);

    // Update the parent node's childIds array
    const parentNode = this.nodes.get(parentId)!;
    const updatedParent = {
      ...parentNode,
      childIds: [...children],
      updatedAt: new Date()
    };
    this.nodes.set(parentId, updatedParent);

    // Update the child node's parentId
    const childNode = this.nodes.get(childId)!;
    const updatedChild = {
      ...childNode,
      parentId,
      updatedAt: new Date()
    };
    this.nodes.set(childId, updatedChild);
  }

  async removeChild(parentId: string, childId: string): Promise<void> {
    const children = this.nodeChildren.get(parentId);
    if (children) {
      children.delete(childId);

      // Update parent node
      const parentNode = this.nodes.get(parentId);
      if (parentNode) {
        const updatedParent = {
          ...parentNode,
          childIds: [...children],
          updatedAt: new Date()
        };
        this.nodes.set(parentId, updatedParent);
      }
    }

    this.nodeParents.delete(childId);

    // Update child node
    const childNode = this.nodes.get(childId);
    if (childNode) {
      const updatedChild = {
        ...childNode,
        parentId: undefined,
        updatedAt: new Date()
      };
      this.nodes.set(childId, updatedChild);
    }
  }

  async moveNode(nodeId: string, newParentId: string): Promise<void> {
    const currentParentId = this.nodeParents.get(nodeId);

    if (currentParentId) {
      await this.removeChild(currentParentId, nodeId);
    }

    await this.addChild(newParentId, nodeId);
  }

  async getNodePath(nodeId: string): Promise<RPGNode[]> {
    const path: RPGNode[] = [];
    let currentId: string | undefined = nodeId;

    while (currentId) {
      const node = this.nodes.get(currentId);
      if (!node) break;

      path.unshift(node);
      currentId = this.nodeParents.get(currentId);
    }

    return path;
  }

  async getDescendants(nodeId: string, maxDepth?: number): Promise<RPGNode[]> {
    const descendants: RPGNode[] = [];
    const visited = new Set<string>();

    const traverse = (id: string, depth: number) => {
      if (maxDepth !== undefined && depth >= maxDepth) return;
      if (visited.has(id)) return;

      visited.add(id);
      const children = this.nodeChildren.get(id);

      if (children) {
        for (const childId of children) {
          const child = this.nodes.get(childId);
          if (child) {
            descendants.push(child);
            traverse(childId, depth + 1);
          }
        }
      }
    };

    traverse(nodeId, 0);
    return descendants;
  }

  async getAncestors(nodeId: string): Promise<RPGNode[]> {
    const ancestors: RPGNode[] = [];
    let currentId = this.nodeParents.get(nodeId);

    while (currentId) {
      const node = this.nodes.get(currentId);
      if (!node) break;

      ancestors.unshift(node);
      currentId = this.nodeParents.get(currentId);
    }

    return ancestors;
  }

  async isAncestor(ancestorId: string, descendantId: string): Promise<boolean> {
    const ancestors = await this.getAncestors(descendantId);
    return ancestors.some(node => node.id === ancestorId);
  }

  async getNodeDepth(nodeId: string): Promise<number> {
    const path = await this.getNodePath(nodeId);
    return path.length - 1; // Subtract 1 because path includes the node itself
  }

  async getNodesAtDepth(depth: number): Promise<RPGNode[]> {
    const nodesAtDepth: RPGNode[] = [];

    for (const node of this.nodes.values()) {
      const nodeDepth = await this.getNodeDepth(node.id);
      if (nodeDepth === depth) {
        nodesAtDepth.push(node);
      }
    }

    return nodesAtDepth;
  }

  // ============================================================================
  // Dependency Management
  // ============================================================================

  async addDependency(dependentId: string, dependencyId: string): Promise<void> {
    this.dependencyGraph.addEdge(dependentId, dependencyId);
  }

  async removeDependency(dependentId: string, dependencyId: string): Promise<void> {
    this.dependencyGraph.removeEdge(dependentId, dependencyId);
  }

  async getDependencies(nodeId: string): Promise<string[]> {
    return this.dependencyGraph.getDependencies(nodeId);
  }

  async getDependents(nodeId: string): Promise<string[]> {
    return this.dependencyGraph.getDependents(nodeId);
  }

  async hasDependencyPath(fromId: string, toId: string): Promise<boolean> {
    // Use DFS to find if there's a path
    const visited = new Set<string>();
    const stack = [fromId];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === toId) return true;
      if (visited.has(current)) continue;

      visited.add(current);
      const deps = this.dependencyGraph.getDependencies(current);
      stack.push(...deps);
    }

    return false;
  }

  async findDependencyCycles(): Promise<string[][]> {
    return this.dependencyGraph.findCycles();
  }

  async getTopologicalOrder(): Promise<string[]> {
    try {
      return this.dependencyGraph.topologicalSort();
    } catch (error) {
      throw new Error(`Cannot perform topological sort: ${error}`);
    }
  }

  async validateDependencies(): Promise<{
    isValid: boolean;
    cycles: string[][];
    orphans: string[];
    invalidReferences: string[];
  }> {
    const cycles = await this.findDependencyCycles();
    const orphans = (await this.findOrphanedNodes()).map(n => n.id);
    const invalidReferences: string[] = [];

    // Check for invalid references in the dependency graph
    // This is a simplified check - in practice, you might want more sophisticated validation

    return {
      isValid: cycles.length === 0 && invalidReferences.length === 0,
      cycles,
      orphans,
      invalidReferences
    };
  }

  // ============================================================================
  // Stub implementations for interfaces that will be implemented in subsequent tasks
  // ============================================================================

  async buildFromProposal(): Promise<RPGNode[]> {
    throw new Error('buildFromProposal: Implementation pending for Task 37.3');
  }

  async refineToImplementation(): Promise<{ newNodes: RPGNode[]; newEdges: RPGEdge[] }> {
    throw new Error('refineToImplementation: Implementation pending for Task 37.3');
  }

  async generateFileStructure(): Promise<{ fileNodes: RPGNode[]; directoryNodes: RPGNode[]; structureEdges: RPGEdge[] }> {
    throw new Error('generateFileStructure: Implementation pending for Task 37.3');
  }

  async inferDependencies(): Promise<RPGEdge[]> {
    throw new Error('inferDependencies: Implementation pending for Task 37.3');
  }

  async serialize(): Promise<RPGSerializationFormat> {
    throw new Error('serialize: Implementation pending for Task 37.4');
  }

  async deserialize(): Promise<void> {
    throw new Error('deserialize: Implementation pending for Task 37.4');
  }

  async saveToFile(): Promise<void> {
    throw new Error('saveToFile: Implementation pending for Task 37.4');
  }

  async loadFromFile(): Promise<void> {
    throw new Error('loadFromFile: Implementation pending for Task 37.4');
  }

  async createSnapshot(): Promise<string> {
    throw new Error('createSnapshot: Implementation pending for Task 37.4');
  }

  async restoreSnapshot(): Promise<void> {
    throw new Error('restoreSnapshot: Implementation pending for Task 37.4');
  }

  async getDiff(): Promise<any> {
    throw new Error('getDiff: Implementation pending for Task 37.4');
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('RPGCoreEngine is not initialized. Call initialize() first.');
    }
  }

  private async getRootNodeIds(): Promise<string[]> {
    const roots: string[] = [];

    for (const node of this.nodes.values()) {
      if (!this.nodeParents.has(node.id)) {
        roots.push(node.id);
      }
    }

    return roots.sort();
  }

  private matchesNodeQuery(node: RPGNode, query: RPGNodeQuery): boolean {
    if (query.level) {
      const levels = Array.isArray(query.level) ? query.level : [query.level];
      if (!levels.includes(node.level)) return false;
    }

    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      if (!types.includes(node.type)) return false;
    }

    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      if (!statuses.includes(node.status)) return false;
    }

    if (query.parentId && node.parentId !== query.parentId) {
      return false;
    }

    if (query.filePathPattern && node.filePath) {
      const regex = new RegExp(query.filePathPattern);
      if (!regex.test(node.filePath)) return false;
    }

    if (query.searchText) {
      const searchLower = query.searchText.toLowerCase();
      const nameMatch = node.name.toLowerCase().includes(searchLower);
      const descMatch = node.description?.toLowerCase().includes(searchLower);
      if (!nameMatch && !descMatch) return false;
    }

    return true;
  }

  private matchesEdgeQuery(edge: RPGEdge, query: RPGEdgeQuery): boolean {
    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      if (!types.includes(edge.type)) return false;
    }

    if (query.fromId && edge.fromId !== query.fromId) {
      return false;
    }

    if (query.toId && edge.toId !== query.toId) {
      return false;
    }

    if (query.nodeId && edge.fromId !== query.nodeId && edge.toId !== query.nodeId) {
      return false;
    }

    if (query.weightRange && edge.weight !== undefined) {
      if (query.weightRange.min !== undefined && edge.weight < query.weightRange.min) {
        return false;
      }
      if (query.weightRange.max !== undefined && edge.weight > query.weightRange.max) {
        return false;
      }
    }

    return true;
  }
}