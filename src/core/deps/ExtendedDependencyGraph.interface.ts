/**
 * Extended Dependency Graph Interface for RPG Algorithm Integration
 * Extends the basic DependencyGraph to support RPG node/edge attributes and advanced dependency management
 */

import {
  RPGNode,
  RPGEdge,
  RPGNodeLevel,
  RPGNodeType,
  RPGEdgeType,
  RPGNodeStatus
} from '../rpg/types';

/**
 * Extended node attributes for RPG integration
 */
export interface ExtendedNodeAttributes {
  /** RPG node hierarchy level */
  level?: RPGNodeLevel;
  /** RPG node type */
  type?: RPGNodeType;
  /** Implementation status */
  status?: RPGNodeStatus;
  /** File path if applicable */
  filePath?: string;
  /** Programming language */
  language?: string;
  /** Type signature */
  typeSignature?: string;
  /** Parent node ID for hierarchical relationships */
  parentId?: string;
  /** Priority for build ordering (higher = build first) */
  priority?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Implementation details */
  implementation?: {
    content?: string;
    lineRange?: { start: number; end: number };
    testCoverage?: { covered: boolean; percentage?: number };
  };
}

/**
 * Extended edge attributes for RPG integration
 */
export interface ExtendedEdgeAttributes {
  /** RPG edge type */
  type?: RPGEdgeType;
  /** Edge weight for priority or strength */
  weight?: number;
  /** Whether this edge is bidirectional */
  bidirectional?: boolean;
  /** Constraint information */
  constraint?: {
    required: boolean;
    reason?: string;
  };
  /** Data flow information */
  dataFlow?: {
    dataType?: string;
    schema?: Record<string, any>;
    direction?: 'input' | 'output' | 'bidirectional';
  };
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Build order generation options
 */
export interface BuildOrderOptions {
  /** Consider node priorities */
  considerPriorities?: boolean;
  /** Consider edge weights */
  considerWeights?: boolean;
  /** Filter by specific edge types */
  edgeTypes?: RPGEdgeType[];
  /** Maximum parallelism level */
  maxParallelism?: number;
  /** Include partial ordering information */
  includePartialOrder?: boolean;
}

/**
 * Build group representing nodes that can be built in parallel
 */
export interface BuildGroup {
  /** Group index in build order */
  order: number;
  /** Nodes in this group */
  nodes: string[];
  /** Estimated build time (if available) */
  estimatedTime?: number;
  /** Dependencies on previous groups */
  dependsOnGroups?: number[];
}

/**
 * Cycle detection result with detailed information
 */
export interface CycleDetectionResult {
  /** Whether cycles were found */
  hasCycles: boolean;
  /** Detected cycles */
  cycles: string[][];
  /** Detailed cycle analysis */
  analysis: Array<{
    cycle: string[];
    size: number;
    edgeTypes: RPGEdgeType[];
    edgeDetails: Array<{
      from: string;
      to: string;
      type?: RPGEdgeType;
      weight?: number;
      strength: number;
      bidirectional?: boolean;
    }>;
    complexity: {
      score: number;
      level: 'low' | 'medium' | 'high';
      factors: string[];
    };
    impact: {
      level: 'low' | 'medium' | 'high';
      affectedNodes: string[];
      affectedNodesCount: number;
      blocksTopologicalSort: boolean;
      description: string;
    };
    canBeResolved: boolean;
    resolutionSuggestions: RefactoringProposal[];
    metadata: {
      isSelfLoop: boolean;
      isSimpleCycle: boolean;
      hasWeakEdges: boolean;
      hasStrongEdges: boolean;
      affectedDescendants: number;
    };
  }>;
  /** Overall summary of all cycles */
  summary?: {
    totalCycles: number;
    simpleCycles: number;
    complexCycles: number;
    selfLoops: number;
    highImpactCycles: number;
    overallComplexity: {
      score: number;
      level: 'low' | 'medium' | 'high';
    };
    recommendations: string[];
  };
}

/**
 * Refactoring proposal for cycle resolution or general improvement
 */
export interface RefactoringProposal {
  /** Proposal ID */
  id: string;
  /** Proposal type */
  type: 'split_node' | 'extract_interface' | 'reverse_dependency' | 'add_abstraction' | 'merge_nodes' | 'remove_edge';
  /** Human-readable description */
  description: string;
  /** Detailed explanation */
  explanation: string;
  /** Affected nodes */
  affectedNodes: string[];
  /** Proposed changes */
  changes: Array<{
    action: 'add_node' | 'remove_node' | 'modify_node' | 'add_edge' | 'remove_edge' | 'modify_edge';
    target: string;
    details: any;
  }>;
  /** Estimated impact */
  impact: {
    complexity: 'low' | 'medium' | 'high';
    riskLevel: 'low' | 'medium' | 'high';
    benefits: string[];
    drawbacks: string[];
  };
  /** Whether this proposal can be auto-applied */
  autoApplicable: boolean;
  /** Additional metadata for the proposal */
  metadata?: Record<string, any>;
}

/**
 * Advanced dependency validation result
 */
export interface DependencyValidationResult {
  /** Overall validation status */
  isValid: boolean;
  /** Detected issues */
  issues: Array<{
    type: 'cycle' | 'orphan' | 'invalid_reference' | 'constraint_violation' | 'hierarchy_violation';
    severity: 'error' | 'warning' | 'info';
    description: string;
    affectedNodes: string[];
    suggestedFix?: RefactoringProposal;
  }>;
  /** Statistics */
  statistics: {
    totalNodes: number;
    totalEdges: number;
    orphanNodes: number;
    invalidReferences: number;
    constraintViolations: number;
  };
}

/**
 * Query options for filtering nodes/edges
 */
export interface QueryOptions {
  /** Filter by node level */
  level?: RPGNodeLevel;
  /** Filter by node type */
  nodeType?: RPGNodeType;
  /** Filter by node status */
  status?: RPGNodeStatus;
  /** Filter by edge type */
  edgeType?: RPGEdgeType;
  /** Filter by file path pattern */
  filePathPattern?: string;
  /** Filter by language */
  language?: string;
  /** Include metadata in results */
  includeMetadata?: boolean;
}

/**
 * Main interface for Extended Dependency Graph
 */
export interface IExtendedDependencyGraph {
  // === Basic operations (maintaining compatibility) ===

  /** Add a node with optional attributes */
  addNode(id: string, attributes?: ExtendedNodeAttributes): void;

  /** Check if node exists */
  hasNode(id: string): boolean;

  /** Remove a node and all its edges */
  removeNode(id: string): void;

  /** Add an edge with optional attributes */
  addEdge(from: string, to: string, attributes?: ExtendedEdgeAttributes): void;

  /** Remove an edge */
  removeEdge(from: string, to: string): void;

  /** Check if edge exists */
  hasEdge(from: string, to: string): boolean;

  /** Get direct dependencies */
  getDependencies(id: string): string[];

  /** Get direct dependents */
  getDependents(id: string): string[];

  /** Clear all nodes and edges */
  clear(): void;

  /** Get node count */
  nodeCount(): number;

  /** Get edge count */
  edgeCount(): number;

  // === Extended attribute management ===

  /** Get node attributes */
  getNodeAttributes(id: string): ExtendedNodeAttributes | undefined;

  /** Update node attributes */
  updateNodeAttributes(id: string, attributes: Partial<ExtendedNodeAttributes>): void;

  /** Get edge attributes */
  getEdgeAttributes(from: string, to: string): ExtendedEdgeAttributes | undefined;

  /** Update edge attributes */
  updateEdgeAttributes(from: string, to: string, attributes: Partial<ExtendedEdgeAttributes>): void;

  // === Advanced query operations ===

  /** Query nodes with filtering */
  queryNodes(options: QueryOptions): string[];

  /** Query edges with filtering */
  queryEdges(options: QueryOptions): Array<{ from: string; to: string; attributes: ExtendedEdgeAttributes }>;

  /** Get nodes by hierarchy level */
  getNodesByLevel(level: RPGNodeLevel): string[];

  /** Get nodes by type */
  getNodesByType(type: RPGNodeType): string[];

  /** Get nodes by status */
  getNodesByStatus(status: RPGNodeStatus): string[];

  /** Get child nodes in hierarchy */
  getChildNodes(parentId: string): string[];

  /** Get parent node in hierarchy */
  getParentNode(childId: string): string | undefined;

  /** Get all ancestors of a node */
  getAncestors(nodeId: string): string[];

  /** Get all descendants of a node */
  getDescendants(nodeId: string, maxDepth?: number): string[];

  // === Advanced cycle detection and resolution ===

  /** Enhanced cycle detection with detailed analysis */
  findCyclesDetailed(): CycleDetectionResult;

  /** Check for cycles (existing method) */
  hasCycle(): boolean;

  /** Find cycles (existing method) */
  findCycles(): string[][];

  /** Generate cycle resolution proposals */
  generateCycleResolutionProposals(cycles?: string[][]): RefactoringProposal[];

  // === Advanced topological sorting and build ordering ===

  /** Basic topological sort (existing method) */
  topologicalSort(): string[];

  /** Advanced topological sort with options */
  topologicalSortAdvanced(options?: BuildOrderOptions): string[];

  /** Generate optimal build order with parallelization */
  generateBuildOrder(options?: BuildOrderOptions): BuildGroup[];

  /** Generate optimal build order for partial graph (MVS-inspired approach) */
  generatePartialBuildOrder(targetNodes: string[], options?: BuildOrderOptions): BuildGroup[];

  /** Get build dependencies for a specific node */
  getBuildDependencies(nodeId: string, options?: BuildOrderOptions): string[];

  /** Analyze parallelization potential for the entire graph */
  analyzeParallelizationPotential(options?: BuildOrderOptions): {
    maxParallelism: number;
    criticalPath: string[];
    criticalPathTime: number;
    totalSequentialTime: number;
    parallelizationRatio: number;
    bottlenecks: Array<{ nodeId: string; reason: string; impact: number }>;
    recommendations: string[];
  };

  /** Check if two nodes can be built in parallel */
  canBuildInParallel(nodeA: string, nodeB: string, options?: BuildOrderOptions): boolean;

  // === Refactoring and optimization ===

  /** Generate general refactoring proposals */
  generateRefactoringProposals(targetNodes?: string[]): RefactoringProposal[];

  /** Apply a refactoring proposal */
  applyRefactoringProposal(proposal: RefactoringProposal): boolean;

  /** Preview the effect of a refactoring proposal */
  previewRefactoringProposal(proposal: RefactoringProposal): {
    addedNodes: Array<{ id: string; attributes: ExtendedNodeAttributes }>;
    removedNodes: string[];
    addedEdges: Array<{ from: string; to: string; attributes: ExtendedEdgeAttributes }>;
    removedEdges: Array<{ from: string; to: string }>;
    modifiedNodes: Array<{ id: string; oldAttributes: ExtendedNodeAttributes; newAttributes: ExtendedNodeAttributes }>;
  };

  // === Validation and integrity ===

  /** Comprehensive dependency validation */
  validateDependencies(): DependencyValidationResult;

  /** Check hierarchy integrity */
  validateHierarchy(): boolean;

  /** Check constraint compliance */
  validateConstraints(): Array<{ nodeId: string; issue: string; severity: 'error' | 'warning' }>;

  // === Integration with RPG and ID Manager ===

  /** Import nodes and edges from RPG structure */
  importFromRPG(nodes: RPGNode[], edges: RPGEdge[]): void;

  /** Export to RPG-compatible format */
  exportToRPG(): { nodes: RPGNode[]; edges: RPGEdge[] };

  /** Sync with external ID manager */
  syncWithIDManager(idManager: any): void;

  /** Get compatible dependency graph (for legacy integrations) */
  getCompatibleDependencyGraph(): any;

  // === Statistics and analysis ===

  /** Get detailed graph statistics */
  getStatistics(): {
    nodeCount: number;
    edgeCount: number;
    levelDistribution: Record<RPGNodeLevel, number>;
    typeDistribution: Record<RPGNodeType, number>;
    edgeTypeDistribution: Record<RPGEdgeType, number>;
    statusDistribution: Record<RPGNodeStatus, number>;
    averageDepth: number;
    maxDepth: number;
    cyclomaticComplexity: number;
  };

  /** Analyze graph complexity */
  analyzeComplexity(): {
    overall: 'low' | 'medium' | 'high';
    factors: Array<{ factor: string; score: number; description: string }>;
    recommendations: string[];
  };
}

/**
 * Factory interface for creating extended dependency graphs
 */
export interface IExtendedDependencyGraphFactory {
  /** Create a new extended dependency graph */
  create(): IExtendedDependencyGraph;

  /** Create from existing basic dependency graph */
  createFromBasic(basicGraph: any): IExtendedDependencyGraph;

  /** Create with initial RPG data */
  createWithRPGData(nodes: RPGNode[], edges: RPGEdge[]): IExtendedDependencyGraph;
}