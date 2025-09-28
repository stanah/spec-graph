/**
 * Repository Planning Graph (RPG) Core Engine Implementation
 * Integrates with existing DependencyGraph and IDManager
 */

import * as fs from 'fs/promises';
import * as path from 'path';
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
  RPGNodeStatus
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
  private snapshots: Map<string, { data: RPGSerializationFormat; label?: string; createdAt: Date }> = new Map();

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
    } catch {
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

  async buildFromProposal(
    specification: {
      title: string;
      description: string;
      requirements?: string[];
      constraints?: string[];
    }
  ): Promise<RPGNode[]> {
    this.ensureInitialized();

    const proposalNodes: RPGNode[] = [];

    // Create main feature node from specification
    const mainFeatureNode = await this.addNode({
      name: specification.title,
      description: specification.description,
      level: RPGNodeLevel.PROPOSAL,
      type: RPGNodeType.FEATURE,
      status: RPGNodeStatus.PENDING,
      metadata: {
        source: 'proposal',
        specification: specification
      }
    });

    proposalNodes.push(mainFeatureNode);

    // Parse requirements into sub-feature nodes
    if (specification.requirements && specification.requirements.length > 0) {
      for (const requirement of specification.requirements) {
        // Extract key features from requirement text
        const featureName = this.extractFeatureName(requirement);
        const featureDescription = requirement;

        const requirementNode = await this.addNode({
          name: featureName,
          description: featureDescription,
          level: RPGNodeLevel.PROPOSAL,
          type: RPGNodeType.FEATURE,
          status: RPGNodeStatus.PENDING,
          parentId: mainFeatureNode.id,
          metadata: {
            source: 'requirement',
            originalText: requirement
          }
        });

        proposalNodes.push(requirementNode);

        // Create hierarchy edge
        await this.addEdge({
          name: `${mainFeatureNode.name} contains ${requirementNode.name}`,
          fromId: mainFeatureNode.id,
          toId: requirementNode.id,
          type: RPGEdgeType.HIERARCHY,
          description: 'Parent-child feature relationship'
        });
      }
    }

    // Add constraint metadata to nodes
    if (specification.constraints && specification.constraints.length > 0) {
      for (const node of proposalNodes) {
        const updatedNode = await this.updateNode(node.id, {
          metadata: {
            ...node.metadata,
            constraints: specification.constraints
          }
        });
        // Update the node in our result array
        const index = proposalNodes.findIndex(n => n.id === node.id);
        if (index >= 0) {
          proposalNodes[index] = updatedNode;
        }
      }
    }

    return proposalNodes;
  }

  async refineToImplementation(
    proposalNodeIds: string[],
    options?: {
      targetLanguage?: string;
      architecturePattern?: string;
      frameworkPreferences?: string[];
    }
  ): Promise<{ newNodes: RPGNode[]; newEdges: RPGEdge[] }> {
    this.ensureInitialized();

    const newNodes: RPGNode[] = [];
    const newEdges: RPGEdge[] = [];
    const language = options?.targetLanguage || 'typescript';
    const architecture = options?.architecturePattern || 'layered';

    for (const proposalNodeId of proposalNodeIds) {
      const proposalNode = await this.getNode(proposalNodeId);
      if (!proposalNode) {
        throw new Error(`Proposal node ${proposalNodeId} not found`);
      }

      // Only refine proposal-level nodes
      if (proposalNode.level !== RPGNodeLevel.PROPOSAL) {
        continue;
      }

      // Generate module-level nodes based on feature
      const moduleNodes = await this.generateModuleNodes(proposalNode, language, architecture);
      newNodes.push(...moduleNodes);

      // Generate implementation-level nodes for each module
      for (const moduleNode of moduleNodes) {
        const implementationNodes = await this.generateImplementationNodes(moduleNode, language);
        newNodes.push(...implementationNodes);

        // Create hierarchy edges from module to implementation
        for (const implNode of implementationNodes) {
          const hierarchyEdge = await this.addEdge({
            name: `${moduleNode.name} contains ${implNode.name}`,
            fromId: moduleNode.id,
            toId: implNode.id,
            type: RPGEdgeType.HIERARCHY,
            description: 'Module contains implementation'
          });
          newEdges.push(hierarchyEdge);
        }
      }

      // Create hierarchy edges from proposal to modules
      for (const moduleNode of moduleNodes) {
        const hierarchyEdge = await this.addEdge({
          name: `${proposalNode.name} implemented by ${moduleNode.name}`,
          fromId: proposalNode.id,
          toId: moduleNode.id,
          type: RPGEdgeType.HIERARCHY,
          description: 'Feature implemented by module'
        });
        newEdges.push(hierarchyEdge);
      }
    }

    return { newNodes, newEdges };
  }

  async generateFileStructure(
    implementationNodeIds: string[],
    baseDirectory?: string
  ): Promise<{ fileNodes: RPGNode[]; directoryNodes: RPGNode[]; structureEdges: RPGEdge[] }> {
    this.ensureInitialized();

    const fileNodes: RPGNode[] = [];
    const directoryNodes: RPGNode[] = [];
    const structureEdges: RPGEdge[] = [];
    const basePath = baseDirectory || './src';

    // Create base directory structure
    const srcDirNode = await this.addNode({
      name: 'src',
      description: 'Source code directory',
      level: RPGNodeLevel.FILE_SYSTEM,
      type: RPGNodeType.DIRECTORY,
      status: RPGNodeStatus.PENDING,
      filePath: basePath
    });
    directoryNodes.push(srcDirNode);

    // Group implementation nodes by their logical modules
    const moduleGroups = await this.groupNodesByModule(implementationNodeIds);

    for (const [moduleName, nodeIds] of moduleGroups) {
      // Create module directory
      const moduleDir = await this.addNode({
        name: moduleName,
        description: `${moduleName} module directory`,
        level: RPGNodeLevel.FILE_SYSTEM,
        type: RPGNodeType.DIRECTORY,
        status: RPGNodeStatus.PENDING,
        filePath: `${basePath}/${moduleName}`,
        parentId: srcDirNode.id
      });
      directoryNodes.push(moduleDir);

      // Create directory structure edge
      const dirEdge = await this.addEdge({
        name: `src contains ${moduleName}`,
        fromId: srcDirNode.id,
        toId: moduleDir.id,
        type: RPGEdgeType.FILE_ORDER,
        description: 'Directory containment'
      });
      structureEdges.push(dirEdge);

      // Create files for each implementation node
      for (const nodeId of nodeIds) {
        const implNode = await this.getNode(nodeId);
        if (!implNode) continue;

        const fileName = this.generateFileName(implNode);
        const fileNode = await this.addNode({
          name: fileName,
          description: `${implNode.name} implementation file`,
          level: RPGNodeLevel.FILE_SYSTEM,
          type: RPGNodeType.FILE,
          status: RPGNodeStatus.PENDING,
          filePath: `${basePath}/${moduleName}/${fileName}`,
          parentId: moduleDir.id,
          metadata: {
            implementationNodeId: nodeId,
            language: 'typescript'
          }
        });
        fileNodes.push(fileNode);

        // Create file structure edge
        const fileEdge = await this.addEdge({
          name: `${moduleName} contains ${fileName}`,
          fromId: moduleDir.id,
          toId: fileNode.id,
          type: RPGEdgeType.FILE_ORDER,
          description: 'File containment'
        });
        structureEdges.push(fileEdge);

        // Create implementation edge
        const implEdge = await this.addEdge({
          name: `${implNode.name} implemented in ${fileName}`,
          fromId: nodeId,
          toId: fileNode.id,
          type: RPGEdgeType.IMPLEMENTATION,
          description: 'Implementation relationship'
        });
        structureEdges.push(implEdge);
      }
    }

    return { fileNodes, directoryNodes, structureEdges };
  }

  async inferDependencies(
    nodeIds: string[],
    options?: {
      includeDataFlow?: boolean;
      includeHierarchy?: boolean;
      includeFileOrder?: boolean;
    }
  ): Promise<RPGEdge[]> {
    this.ensureInitialized();

    const opts = {
      includeDataFlow: options?.includeDataFlow ?? true,
      includeHierarchy: options?.includeHierarchy ?? true,
      includeFileOrder: options?.includeFileOrder ?? true
    };

    const dependencyEdges: RPGEdge[] = [];

    for (const nodeId of nodeIds) {
      const node = await this.getNode(nodeId);
      if (!node) continue;

      // Infer data flow dependencies based on node types and names
      if (opts.includeDataFlow) {
        const dataFlowEdges = await this.inferDataFlowDependencies(node, nodeIds);
        dependencyEdges.push(...dataFlowEdges);
      }

      // Infer hierarchy dependencies
      if (opts.includeHierarchy) {
        const hierarchyEdges = await this.inferHierarchyDependencies(node, nodeIds);
        dependencyEdges.push(...hierarchyEdges);
      }

      // Infer file order dependencies
      if (opts.includeFileOrder) {
        const fileOrderEdges = await this.inferFileOrderDependencies(node, nodeIds);
        dependencyEdges.push(...fileOrderEdges);
      }
    }

    // Remove duplicate edges
    const uniqueEdges = this.removeDuplicateEdges(dependencyEdges);

    return uniqueEdges;
  }

  async serialize(format: 'json' | 'graphml' | 'custom' = 'json'): Promise<RPGSerializationFormat> {
    this.ensureInitialized();

    // Convert Maps to Arrays for serialization
    const nodes = Array.from(this.nodes.values());
    const edges = Array.from(this.edges.values());
    const rootNodeIds = await this.getRootNodeIds();

    // Get current graph metadata
    const currentGraph = await this.getGraph();

    const serializedFormat: RPGSerializationFormat = {
      format: {
        version: '1.0.0',
        timestamp: new Date(),
        compression: format === 'json' ? undefined : format
      },
      graph: {
        metadata: currentGraph.metadata,
        nodes,
        edges,
        rootNodeIds
      }
    };

    return serializedFormat;
  }

  async deserialize(data: RPGSerializationFormat): Promise<void> {
    this.ensureInitialized();

    // Clear current graph state
    await this.clear();

    // Validate serialization format
    if (!data.format || !data.graph) {
      throw new Error('Invalid serialization format: missing required fields');
    }

    // Load nodes
    for (const nodeData of data.graph.nodes) {
      this.nodes.set(nodeData.id, nodeData);

      // Rebuild hierarchy structures
      if (nodeData.parentId) {
        this.nodeParents.set(nodeData.id, nodeData.parentId);
      }
      if (nodeData.childIds) {
        this.nodeChildren.set(nodeData.id, new Set(nodeData.childIds));
      }
    }

    // Load edges
    for (const edgeData of data.graph.edges) {
      this.edges.set(edgeData.id, edgeData);

      // Add to dependency graph if it's a dependency edge
      if (edgeData.type === RPGEdgeType.DATA_FLOW ||
          edgeData.type === RPGEdgeType.IMPLEMENTATION ||
          edgeData.type === RPGEdgeType.INTER_MODULE ||
          edgeData.type === RPGEdgeType.INTRA_MODULE) {
        this.dependencyGraph.addNode(edgeData.fromId);
        this.dependencyGraph.addNode(edgeData.toId);
        this.dependencyGraph.addEdge(edgeData.fromId, edgeData.toId);
      }
    }

    // Update graph metadata if provided
    if (data.graph.metadata) {
      // Note: Graph metadata will be updated when getGraph() is called
    }
  }

  async saveToFile(filePath: string, format: 'json' | 'graphml' | 'custom' = 'json'): Promise<void> {
    this.ensureInitialized();

    try {
      // Ensure directory exists
      const directory = path.dirname(filePath);
      await fs.mkdir(directory, { recursive: true });

      // Serialize the graph
      const serializedData = await this.serialize(format);

      // Convert to appropriate file format
      let fileContent: string;
      switch (format) {
        case 'json':
          fileContent = JSON.stringify(serializedData, null, 2);
          break;
        case 'graphml':
          fileContent = this.convertToGraphML(serializedData);
          break;
        case 'custom':
          // Custom binary or compressed format could be implemented here
          fileContent = JSON.stringify(serializedData);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Write to file
      await fs.writeFile(filePath, fileContent, 'utf-8');

    } catch (error) {
      throw new Error(`Failed to save RPG to file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async loadFromFile(filePath: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Check if file exists
      await fs.access(filePath);

      // Read file content
      const fileContent = await fs.readFile(filePath, 'utf-8');

      // Determine format from file extension
      const extension = path.extname(filePath).toLowerCase();
      let serializedData: RPGSerializationFormat;

      switch (extension) {
        case '.json':
          serializedData = JSON.parse(fileContent);
          break;
        case '.graphml':
        case '.xml':
          serializedData = this.parseGraphML(fileContent);
          break;
        default:
          // Try to parse as JSON by default
          try {
            serializedData = JSON.parse(fileContent);
          } catch {
            throw new Error(`Unsupported file format: ${extension}`);
          }
      }

      // Validate and load the data
      if (!serializedData.format || !serializedData.graph) {
        throw new Error('Invalid file format: missing required RPG data structure');
      }

      // Deserialize the loaded data
      await this.deserialize(serializedData);

    } catch (error) {
      throw new Error(`Failed to load RPG from file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createSnapshot(label?: string): Promise<string> {
    this.ensureInitialized();

    // Generate unique snapshot ID
    const snapshotId = this.idManager.generate();
    const timestamp = new Date();

    // Serialize current graph state
    const serializedData = await this.serialize();

    // Store snapshot
    this.snapshots.set(snapshotId, {
      data: serializedData,
      label: label || `Snapshot ${timestamp.toISOString()}`,
      createdAt: timestamp
    });

    return snapshotId;
  }

  async restoreSnapshot(snapshotId: string): Promise<void> {
    this.ensureInitialized();

    // Find the snapshot
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot with ID ${snapshotId} not found`);
    }

    // Restore graph state from snapshot
    await this.deserialize(snapshot.data);
  }

  async getDiff(
    fromSnapshotId: string,
    toSnapshotId: string
  ): Promise<{
    addedNodes: RPGNode[];
    removedNodes: RPGNode[];
    modifiedNodes: Array<{
      before: RPGNode;
      after: RPGNode;
    }>;
    addedEdges: RPGEdge[];
    removedEdges: RPGEdge[];
    modifiedEdges: Array<{
      before: RPGEdge;
      after: RPGEdge;
    }>;
  }> {
    this.ensureInitialized();

    // Get snapshots
    const fromSnapshot = this.snapshots.get(fromSnapshotId);
    const toSnapshot = this.snapshots.get(toSnapshotId);

    if (!fromSnapshot) {
      throw new Error(`From snapshot with ID ${fromSnapshotId} not found`);
    }
    if (!toSnapshot) {
      throw new Error(`To snapshot with ID ${toSnapshotId} not found`);
    }

    // Convert arrays to Maps for efficient comparison
    const fromNodes = new Map(fromSnapshot.data.graph.nodes.map(n => [n.id, n]));
    const toNodes = new Map(toSnapshot.data.graph.nodes.map(n => [n.id, n]));
    const fromEdges = new Map(fromSnapshot.data.graph.edges.map(e => [e.id, e]));
    const toEdges = new Map(toSnapshot.data.graph.edges.map(e => [e.id, e]));

    // Calculate node differences
    const addedNodes: RPGNode[] = [];
    const removedNodes: RPGNode[] = [];
    const modifiedNodes: Array<{ before: RPGNode; after: RPGNode }> = [];

    // Find added and modified nodes
    for (const [nodeId, toNode] of toNodes) {
      const fromNode = fromNodes.get(nodeId);
      if (!fromNode) {
        addedNodes.push(toNode);
      } else if (!this.areNodesEqual(fromNode, toNode)) {
        modifiedNodes.push({ before: fromNode, after: toNode });
      }
    }

    // Find removed nodes
    for (const [nodeId, fromNode] of fromNodes) {
      if (!toNodes.has(nodeId)) {
        removedNodes.push(fromNode);
      }
    }

    // Calculate edge differences
    const addedEdges: RPGEdge[] = [];
    const removedEdges: RPGEdge[] = [];
    const modifiedEdges: Array<{ before: RPGEdge; after: RPGEdge }> = [];

    // Find added and modified edges
    for (const [edgeId, toEdge] of toEdges) {
      const fromEdge = fromEdges.get(edgeId);
      if (!fromEdge) {
        addedEdges.push(toEdge);
      } else if (!this.areEdgesEqual(fromEdge, toEdge)) {
        modifiedEdges.push({ before: fromEdge, after: toEdge });
      }
    }

    // Find removed edges
    for (const [edgeId, fromEdge] of fromEdges) {
      if (!toEdges.has(edgeId)) {
        removedEdges.push(fromEdge);
      }
    }

    return {
      addedNodes,
      removedNodes,
      modifiedNodes,
      addedEdges,
      removedEdges,
      modifiedEdges
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Compare two nodes for equality (excluding timestamps)
   */
  private areNodesEqual(node1: RPGNode, node2: RPGNode): boolean {
    return (
      node1.id === node2.id &&
      node1.name === node2.name &&
      node1.description === node2.description &&
      node1.level === node2.level &&
      node1.type === node2.type &&
      node1.status === node2.status &&
      node1.filePath === node2.filePath &&
      node1.parentId === node2.parentId &&
      JSON.stringify(node1.childIds) === JSON.stringify(node2.childIds) &&
      node1.codeSnippet === node2.codeSnippet &&
      JSON.stringify(node1.dependencies) === JSON.stringify(node2.dependencies) &&
      JSON.stringify(node1.interfaces) === JSON.stringify(node2.interfaces) &&
      node1.priority === node2.priority &&
      node1.estimatedEffort === node2.estimatedEffort &&
      node1.assignee === node2.assignee &&
      JSON.stringify(node1.tags) === JSON.stringify(node2.tags)
    );
  }

  /**
   * Compare two edges for equality (excluding timestamps)
   */
  private areEdgesEqual(edge1: RPGEdge, edge2: RPGEdge): boolean {
    return (
      edge1.id === edge2.id &&
      edge1.fromId === edge2.fromId &&
      edge1.toId === edge2.toId &&
      edge1.type === edge2.type &&
      edge1.weight === edge2.weight &&
      edge1.description === edge2.description &&
      JSON.stringify(edge1.metadata) === JSON.stringify(edge2.metadata) &&
      edge1.executionOrder === edge2.executionOrder &&
      edge1.isOptional === edge2.isOptional
    );
  }

  /**
   * Convert RPG data to GraphML format
   */
  private convertToGraphML(data: RPGSerializationFormat): string {
    let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns
        http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">

  <!-- Node attribute definitions -->
  <key id="name" for="node" attr.name="name" attr.type="string"/>
  <key id="level" for="node" attr.name="level" attr.type="string"/>
  <key id="type" for="node" attr.name="type" attr.type="string"/>
  <key id="status" for="node" attr.name="status" attr.type="string"/>

  <!-- Edge attribute definitions -->
  <key id="edgeType" for="edge" attr.name="type" attr.type="string"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>

  <graph id="RPG" edgedefault="directed">
`;

    // Add nodes
    for (const node of data.graph.nodes) {
      graphml += `    <node id="${node.id}">
      <data key="name">${this.escapeXML(node.name)}</data>
      <data key="level">${node.level}</data>
      <data key="type">${node.type}</data>
      <data key="status">${node.status}</data>
    </node>
`;
    }

    // Add edges
    for (const edge of data.graph.edges) {
      graphml += `    <edge source="${edge.fromId}" target="${edge.toId}">
      <data key="edgeType">${edge.type}</data>
      ${edge.weight !== undefined ? `<data key="weight">${edge.weight}</data>` : ''}
    </edge>
`;
    }

    graphml += `  </graph>
</graphml>`;

    return graphml;
  }

  /**
   * Parse GraphML format to RPG data
   */
  private parseGraphML(graphmlContent: string): RPGSerializationFormat {
    // This is a simplified parser - in production, you'd use a proper XML parser
    // For now, we'll throw an error indicating full GraphML support is not implemented
    throw new Error('Full GraphML parsing not implemented yet. Use JSON format instead.');
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

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

  // ============================================================================
  // Helper Methods for RPG Construction Algorithms
  // ============================================================================

  private extractFeatureName(requirement: string): string {
    // Simple extraction - take first few words or capitalize key terms
    const words = requirement.trim().split(/\s+/);
    if (words.length === 0) return 'Feature';

    // Look for action words and nouns
    const actionWords = ['implement', 'create', 'add', 'build', 'develop', 'support'];
    let featureName = '';

    for (let i = 0; i < Math.min(words.length, 6); i++) {
      const word = words[i];
      if (actionWords.includes(word.toLowerCase())) {
        // Take next 2-3 words as feature name
        const nameWords = words.slice(i + 1, i + 4);
        featureName = nameWords.join(' ');
        break;
      }
    }

    if (!featureName) {
      // Fallback: take first 3 words
      featureName = words.slice(0, 3).join(' ');
    }

    // Capitalize first letter
    return featureName.charAt(0).toUpperCase() + featureName.slice(1);
  }

  private async generateModuleNodes(
    proposalNode: RPGNode,
    language: string,
    architecture: string
  ): Promise<RPGNode[]> {
    const moduleNodes: RPGNode[] = [];
    const featureName = proposalNode.name;

    // Generate common modules based on architecture pattern
    const moduleTemplates = this.getModuleTemplates(architecture, language);

    for (const template of moduleTemplates) {
      const moduleName = template.name.replace('{feature}', featureName);

      const moduleNode = await this.addNode({
        name: moduleName,
        description: template.description.replace('{feature}', featureName),
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.PENDING,
        parentId: proposalNode.id,
        metadata: {
          architecture,
          language,
          template: template.name
        }
      });

      moduleNodes.push(moduleNode);
    }

    return moduleNodes;
  }

  private async generateImplementationNodes(
    moduleNode: RPGNode,
    language: string
  ): Promise<RPGNode[]> {
    const implementationNodes: RPGNode[] = [];
    const moduleName = moduleNode.name;

    // Generate typical implementation components
    const implementations = this.getImplementationTemplates(language);

    for (const impl of implementations) {
      const implName = impl.name.replace('{module}', moduleName);

      const implNode = await this.addNode({
        name: implName,
        description: impl.description.replace('{module}', moduleName),
        level: RPGNodeLevel.IMPLEMENTATION,
        type: impl.type,
        status: RPGNodeStatus.PENDING,
        parentId: moduleNode.id,
        metadata: {
          language,
          template: impl.name
        }
      });

      implementationNodes.push(implNode);
    }

    return implementationNodes;
  }

  private async groupNodesByModule(nodeIds: string[]): Promise<Map<string, string[]>> {
    const groups = new Map<string, string[]>();

    for (const nodeId of nodeIds) {
      const node = await this.getNode(nodeId);
      if (!node) continue;

      // Determine module name from node name, parent, or metadata
      let moduleName = 'core';

      // Try to extract feature name from node name first
      const featureName = this.extractFeatureNameFromNode(node);
      if (featureName) {
        moduleName = featureName;
      } else if (node.parentId) {
        const parent = await this.getNode(node.parentId);
        if (parent && parent.level === RPGNodeLevel.MODULE) {
          moduleName = parent.name.toLowerCase().replace(/\s+/g, '-');
        }
      } else if (node.metadata?.template) {
        moduleName = this.extractModuleNameFromTemplate(node.metadata.template);
      }

      if (!groups.has(moduleName)) {
        groups.set(moduleName, []);
      }
      groups.get(moduleName)!.push(nodeId);
    }

    return groups;
  }

  private generateFileName(node: RPGNode): string {
    const baseName = node.name.toLowerCase().replace(/\s+/g, '-');

    switch (node.type) {
      case RPGNodeType.CLASS:
        return `${baseName}.ts`;
      case RPGNodeType.INTERFACE:
        return `${baseName}.interface.ts`;
      case RPGNodeType.FUNCTION:
        return `${baseName}.ts`;
      case RPGNodeType.TEST:
        return `${baseName}.test.ts`;
      case RPGNodeType.CONFIGURATION:
        return `${baseName}.config.ts`;
      default:
        return `${baseName}.ts`;
    }
  }

  private async inferDataFlowDependencies(node: RPGNode, candidateNodeIds: string[]): Promise<RPGEdge[]> {
    const edges: RPGEdge[] = [];

    for (const candidateId of candidateNodeIds) {
      if (candidateId === node.id) continue;

      const candidate = await this.getNode(candidateId);
      if (!candidate) continue;

      // Infer data flow based on naming patterns and types
      if (this.hasDataFlowRelationship(node, candidate)) {
        const edge = await this.addEdge({
          name: `${node.name} uses ${candidate.name}`,
          fromId: node.id,
          toId: candidateId,
          type: RPGEdgeType.DATA_FLOW,
          description: 'Inferred data flow dependency',
          weight: 0.7
        });
        edges.push(edge);
      }
    }

    return edges;
  }

  private async inferHierarchyDependencies(node: RPGNode, candidateNodeIds: string[]): Promise<RPGEdge[]> {
    const edges: RPGEdge[] = [];

    // Create hierarchy dependency edges (different from structural parent-child relationships)
    // These represent logical dependencies between hierarchy levels

    for (const candidateId of candidateNodeIds) {
      if (candidateId === node.id) continue;

      const candidate = await this.getNode(candidateId);
      if (!candidate) continue;

      // Infer hierarchy based on levels and naming
      if (this.hasHierarchyRelationship(node, candidate)) {
        const edge = await this.addEdge({
          name: `${candidate.name} contains ${node.name}`,
          fromId: candidateId,
          toId: node.id,
          type: RPGEdgeType.HIERARCHY,
          description: 'Inferred hierarchy relationship',
          weight: 0.8
        });
        edges.push(edge);
      }
    }

    return edges;
  }

  private async inferFileOrderDependencies(node: RPGNode, candidateNodeIds: string[]): Promise<RPGEdge[]> {
    const edges: RPGEdge[] = [];

    if (node.level !== RPGNodeLevel.FILE_SYSTEM) return edges;

    for (const candidateId of candidateNodeIds) {
      if (candidateId === node.id) continue;

      const candidate = await this.getNode(candidateId);
      if (!candidate || candidate.level !== RPGNodeLevel.FILE_SYSTEM) continue;

      // Infer file order based on dependencies and file types
      if (this.hasFileOrderRelationship(node, candidate)) {
        const edge = await this.addEdge({
          name: `${candidate.name} before ${node.name}`,
          fromId: candidateId,
          toId: node.id,
          type: RPGEdgeType.FILE_ORDER,
          description: 'Inferred file order dependency',
          weight: 0.6
        });
        edges.push(edge);
      }
    }

    return edges;
  }

  private removeDuplicateEdges(edges: RPGEdge[]): RPGEdge[] {
    const seen = new Set<string>();
    const unique: RPGEdge[] = [];

    for (const edge of edges) {
      const key = `${edge.fromId}-${edge.toId}-${edge.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(edge);
      }
    }

    return unique;
  }

  private getModuleTemplates(architecture: string, language: string): Array<{
    name: string;
    description: string;
  }> {
    const templates = [
      {
        name: '{feature} Controller',
        description: 'Handle {feature} HTTP requests and responses'
      },
      {
        name: '{feature} Service',
        description: 'Business logic for {feature} operations'
      },
      {
        name: '{feature} Repository',
        description: 'Data access layer for {feature}'
      },
      {
        name: '{feature} Model',
        description: 'Data model for {feature} entities'
      }
    ];

    if (architecture === 'layered') {
      templates.push({
        name: '{feature} Validator',
        description: 'Input validation for {feature} operations'
      });
    }

    return templates;
  }

  private getImplementationTemplates(language: string): Array<{
    name: string;
    description: string;
    type: RPGNodeType;
  }> {
    const templates = [
      {
        name: '{module} Interface',
        description: 'Interface definition for {module}',
        type: RPGNodeType.INTERFACE
      },
      {
        name: '{module} Implementation',
        description: 'Main implementation class for {module}',
        type: RPGNodeType.CLASS
      },
      {
        name: '{module} Utils',
        description: 'Utility functions for {module}',
        type: RPGNodeType.FUNCTION
      }
    ];

    if (language === 'typescript') {
      templates.push({
        name: '{module} Types',
        description: 'Type definitions for {module}',
        type: RPGNodeType.INTERFACE
      });
    }

    return templates;
  }

  private extractFeatureNameFromNode(node: RPGNode): string | null {
    const nodeName = node.name.toLowerCase();

    // Extract feature name from common patterns
    // Examples:
    // "product-catalog-with-controller-interface" → "product-catalog"
    // "shopping-cart-functionality-controller-interface" → "shopping-cart"
    // "user-authentication-service-implementation" → "user-authentication"

    // Remove common suffixes
    const suffixes = [
      '-controller-interface', '-controller-implementation', '-controller-utils', '-controller-types',
      '-service-interface', '-service-implementation', '-service-utils', '-service-types',
      '-repository-interface', '-repository-implementation', '-repository-utils', '-repository-types',
      '-model-interface', '-model-implementation', '-model-utils', '-model-types',
      '-validator-interface', '-validator-implementation', '-validator-utils', '-validator-types',
      '-with-controller', '-with-service', '-with-repository', '-with-model', '-with-validator',
      '-functionality', '-system', '-management'
    ];

    let featureName = nodeName;
    for (const suffix of suffixes) {
      if (featureName.endsWith(suffix)) {
        featureName = featureName.slice(0, -suffix.length);
        break;
      }
    }

    // If we extracted something meaningful and it's not too short
    if (featureName && featureName.length > 3 && featureName !== nodeName) {
      return featureName;
    }

    return null;
  }

  private extractModuleNameFromTemplate(template: string): string {
    // Extract module name from template strings
    if (template.includes('Controller')) return 'controllers';
    if (template.includes('Service')) return 'services';
    if (template.includes('Repository')) return 'repositories';
    if (template.includes('Model')) return 'models';
    if (template.includes('Validator')) return 'validators';
    return 'core';
  }

  private hasDataFlowRelationship(node: RPGNode, candidate: RPGNode): boolean {
    // Simple heuristics for data flow relationships
    const nodeNameLower = node.name.toLowerCase();
    const candidateNameLower = candidate.name.toLowerCase();

    // Service -> Repository pattern
    if (nodeNameLower.includes('service') && candidateNameLower.includes('repository')) {
      return true;
    }

    // Controller -> Service pattern
    if (nodeNameLower.includes('controller') && candidateNameLower.includes('service')) {
      return true;
    }

    // Any -> Model pattern
    if (candidateNameLower.includes('model')) {
      return true;
    }

    return false;
  }

  private hasHierarchyRelationship(node: RPGNode, candidate: RPGNode): boolean {
    // Hierarchy based on levels
    if (candidate.level === RPGNodeLevel.PROPOSAL && node.level === RPGNodeLevel.MODULE) {
      return true;
    }

    if (candidate.level === RPGNodeLevel.MODULE && node.level === RPGNodeLevel.IMPLEMENTATION) {
      return true;
    }

    return false;
  }

  private hasFileOrderRelationship(node: RPGNode, candidate: RPGNode): boolean {
    // File order based on file types
    const nodeFileName = node.name.toLowerCase();
    const candidateFileName = candidate.name.toLowerCase();

    // Interface files come before implementation files
    if (candidateFileName.includes('.interface.') && !nodeFileName.includes('.interface.')) {
      return true;
    }

    // Type files come before implementation files
    if (candidateFileName.includes('.types.') && !nodeFileName.includes('.types.')) {
      return true;
    }

    // Model files come before service files
    if (candidateFileName.includes('model') && nodeFileName.includes('service')) {
      return true;
    }

    return false;
  }
}