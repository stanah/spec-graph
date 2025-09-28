/**
 * Repository Planning Graph (RPG) Core Interfaces
 * Integration layer with existing DependencyGraph and IDManager
 */

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
  RPGEdgeType
} from './types';

/**
 * Core interface for RPG node management
 */
export interface IRPGNodeManager {
  /**
   * Add a new node to the graph
   */
  addNode(node: Omit<RPGNode, 'id' | 'createdAt' | 'updatedAt'>, nodeId?: string): Promise<RPGNode>;

  /**
   * Get a node by ID
   */
  getNode(nodeId: string): Promise<RPGNode | null>;

  /**
   * Update an existing node
   */
  updateNode(nodeId: string, updates: Partial<RPGNode>): Promise<RPGNode>;

  /**
   * Remove a node and all its associated edges
   */
  removeNode(nodeId: string): Promise<boolean>;

  /**
   * Query nodes with filtering options
   */
  queryNodes(query: RPGNodeQuery): Promise<RPGNode[]>;

  /**
   * Get all child nodes of a parent
   */
  getChildNodes(parentId: string): Promise<RPGNode[]>;

  /**
   * Get the parent node of a child
   */
  getParentNode(childId: string): Promise<RPGNode | null>;

  /**
   * Get all nodes at a specific hierarchy level
   */
  getNodesByLevel(level: RPGNodeLevel): Promise<RPGNode[]>;

  /**
   * Get all nodes of a specific type
   */
  getNodesByType(type: RPGNodeType): Promise<RPGNode[]>;
}

/**
 * Core interface for RPG edge management
 */
export interface IRPGEdgeManager {
  /**
   * Add a new edge between nodes
   */
  addEdge(edge: Omit<RPGEdge, 'id' | 'createdAt' | 'updatedAt'>, edgeId?: string): Promise<RPGEdge>;

  /**
   * Get an edge by ID
   */
  getEdge(edgeId: string): Promise<RPGEdge | null>;

  /**
   * Update an existing edge
   */
  updateEdge(edgeId: string, updates: Partial<RPGEdge>): Promise<RPGEdge>;

  /**
   * Remove an edge
   */
  removeEdge(edgeId: string): Promise<boolean>;

  /**
   * Query edges with filtering options
   */
  queryEdges(query: RPGEdgeQuery): Promise<RPGEdge[]>;

  /**
   * Get all edges of a specific type
   */
  getEdgesByType(type: RPGEdgeType): Promise<RPGEdge[]>;

  /**
   * Get all outgoing edges from a node
   */
  getOutgoingEdges(nodeId: string): Promise<RPGEdge[]>;

  /**
   * Get all incoming edges to a node
   */
  getIncomingEdges(nodeId: string): Promise<RPGEdge[]>;

  /**
   * Check if an edge exists between two nodes
   */
  hasEdge(fromId: string, toId: string, type?: RPGEdgeType): Promise<boolean>;
}

/**
 * Core interface for RPG graph operations
 */
export interface IRPGGraphManager {
  /**
   * Initialize a new RPG graph
   */
  initialize(options?: RPGConstructionOptions): Promise<void>;

  /**
   * Get the current graph state
   */
  getGraph(): Promise<RPGGraph>;

  /**
   * Clear all nodes and edges
   */
  clear(): Promise<void>;

  /**
   * Get graph statistics
   */
  getStatistics(): Promise<{
    nodeCount: number;
    edgeCount: number;
    levelDistribution: Record<RPGNodeLevel, number>;
    typeDistribution: Record<RPGNodeType, number>;
    edgeTypeDistribution: Record<RPGEdgeType, number>;
  }>;

  /**
   * Validate the entire graph structure
   */
  validate(): Promise<RPGValidationResult>;

  /**
   * Get root nodes (nodes without parents)
   */
  getRootNodes(): Promise<RPGNode[]>;

  /**
   * Get leaf nodes (nodes without children)
   */
  getLeafNodes(): Promise<RPGNode[]>;

  /**
   * Find orphaned nodes (nodes not connected to any others)
   */
  findOrphanedNodes(): Promise<RPGNode[]>;
}

/**
 * Core interface for RPG hierarchy management
 */
export interface IRPGHierarchyManager {
  /**
   * Add a child node to a parent
   */
  addChild(parentId: string, childId: string): Promise<void>;

  /**
   * Remove a child from a parent
   */
  removeChild(parentId: string, childId: string): Promise<void>;

  /**
   * Move a node to a new parent
   */
  moveNode(nodeId: string, newParentId: string): Promise<void>;

  /**
   * Get the full path from root to a node
   */
  getNodePath(nodeId: string): Promise<RPGNode[]>;

  /**
   * Get all descendants of a node
   */
  getDescendants(nodeId: string, maxDepth?: number): Promise<RPGNode[]>;

  /**
   * Get all ancestors of a node
   */
  getAncestors(nodeId: string): Promise<RPGNode[]>;

  /**
   * Check if a node is an ancestor of another
   */
  isAncestor(ancestorId: string, descendantId: string): Promise<boolean>;

  /**
   * Get the depth of a node in the hierarchy
   */
  getNodeDepth(nodeId: string): Promise<number>;

  /**
   * Get all nodes at a specific depth
   */
  getNodesAtDepth(depth: number): Promise<RPGNode[]>;
}

/**
 * Core interface for RPG dependency management (integrates with DependencyGraph)
 */
export interface IRPGDependencyManager {
  /**
   * Add a dependency relationship between nodes
   */
  addDependency(dependentId: string, dependencyId: string): Promise<void>;

  /**
   * Remove a dependency relationship
   */
  removeDependency(dependentId: string, dependencyId: string): Promise<void>;

  /**
   * Get all dependencies of a node
   */
  getDependencies(nodeId: string): Promise<string[]>;

  /**
   * Get all dependents of a node
   */
  getDependents(nodeId: string): Promise<string[]>;

  /**
   * Check if there's a dependency path between two nodes
   */
  hasDependencyPath(fromId: string, toId: string): Promise<boolean>;

  /**
   * Find dependency cycles in the graph
   */
  findDependencyCycles(): Promise<string[][]>;

  /**
   * Get topological sort of nodes based on dependencies
   */
  getTopologicalOrder(): Promise<string[]>;

  /**
   * Validate dependency constraints
   */
  validateDependencies(): Promise<{
    isValid: boolean;
    cycles: string[][];
    orphans: string[];
    invalidReferences: string[];
  }>;
}

/**
 * Core interface for RPG construction algorithms
 */
export interface IRPGConstructor {
  /**
   * Build RPG from proposal-level planning
   * Convert natural language specifications to high-level feature nodes
   */
  buildFromProposal(
    specification: {
      title: string;
      description: string;
      requirements?: string[];
      constraints?: string[];
    }
  ): Promise<RPGNode[]>;

  /**
   * Refine nodes from proposal to implementation level
   * Break down high-level features into concrete implementation units
   */
  refineToImplementation(
    proposalNodeIds: string[],
    options?: {
      targetLanguage?: string;
      architecturePattern?: string;
      frameworkPreferences?: string[];
    }
  ): Promise<{
    newNodes: RPGNode[];
    newEdges: RPGEdge[];
  }>;

  /**
   * Generate file structure from implementation nodes
   */
  generateFileStructure(
    implementationNodeIds: string[],
    baseDirectory?: string
  ): Promise<{
    fileNodes: RPGNode[];
    directoryNodes: RPGNode[];
    structureEdges: RPGEdge[];
  }>;

  /**
   * Auto-generate dependencies based on node relationships
   */
  inferDependencies(
    nodeIds: string[],
    options?: {
      includeDataFlow?: boolean;
      includeHierarchy?: boolean;
      includeFileOrder?: boolean;
    }
  ): Promise<RPGEdge[]>;
}

/**
 * Core interface for RPG persistence and serialization
 */
export interface IRPGPersistence {
  /**
   * Serialize the graph to a format for persistence
   */
  serialize(format?: 'json' | 'graphml' | 'custom'): Promise<RPGSerializationFormat>;

  /**
   * Deserialize and load a graph from serialized data
   */
  deserialize(data: RPGSerializationFormat): Promise<void>;

  /**
   * Save graph to file
   */
  saveToFile(filePath: string, format?: 'json' | 'graphml' | 'custom'): Promise<void>;

  /**
   * Load graph from file
   */
  loadFromFile(filePath: string): Promise<void>;

  /**
   * Create a snapshot of the current graph state
   */
  createSnapshot(label?: string): Promise<string>;

  /**
   * Restore graph from a snapshot
   */
  restoreSnapshot(snapshotId: string): Promise<void>;

  /**
   * Get diff between two graph states
   */
  getDiff(
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
  }>;
}

/**
 * Main RPG Core Engine interface that combines all managers
 */
export interface IRPGCoreEngine extends
  IRPGNodeManager,
  IRPGEdgeManager,
  IRPGGraphManager,
  IRPGHierarchyManager,
  IRPGDependencyManager,
  IRPGConstructor,
  IRPGPersistence {

  /**
   * Get the underlying dependency graph instance
   */
  getDependencyGraph(): any; // DependencyGraph type

  /**
   * Get the underlying ID manager instance
   */
  getIDManager(): any; // IDManager type

  /**
   * Initialize the RPG engine with existing components
   */
  initialize(options?: RPGConstructionOptions & {
    dependencyGraph?: any;
    idManager?: any;
  }): Promise<void>;

  /**
   * Shutdown and cleanup resources
   */
  shutdown(): Promise<void>;

  /**
   * Get engine status and health information
   */
  getStatus(): Promise<{
    initialized: boolean;
    nodeCount: number;
    edgeCount: number;
    memoryUsage?: number;
    lastOperation?: {
      type: string;
      timestamp: Date;
      duration: number;
    };
  }>;
}

/**
 * Factory interface for creating RPG components
 */
export interface IRPGFactory {
  /**
   * Create a new RPG core engine instance
   */
  createEngine(options?: RPGConstructionOptions): Promise<IRPGCoreEngine>;

  /**
   * Create a node manager instance
   */
  createNodeManager(): IRPGNodeManager;

  /**
   * Create an edge manager instance
   */
  createEdgeManager(): IRPGEdgeManager;

  /**
   * Create a dependency manager instance
   */
  createDependencyManager(): IRPGDependencyManager;

  /**
   * Create a hierarchy manager instance
   */
  createHierarchyManager(): IRPGHierarchyManager;

  /**
   * Create a constructor instance
   */
  createConstructor(): IRPGConstructor;

  /**
   * Create a persistence manager instance
   */
  createPersistence(): IRPGPersistence;
}