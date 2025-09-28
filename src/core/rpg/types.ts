/**
 * Repository Planning Graph (RPG) Core Types
 * Based on the arXiv paper "RPG: A Repository Planning Graph for Unified and Scalable Codebase Generation"
 */

/**
 * Node hierarchy levels representing different abstraction layers
 */
export enum RPGNodeLevel {
  /** High-level functional requirements */
  PROPOSAL = 'proposal',
  /** Mid-level modules and components */
  MODULE = 'module',
  /** Concrete implementation units (functions, classes) */
  IMPLEMENTATION = 'implementation',
  /** File system structure (files, directories) */
  FILE_SYSTEM = 'file_system'
}

/**
 * Node types for different kinds of components
 */
export enum RPGNodeType {
  /** High-level feature or requirement */
  FEATURE = 'feature',
  /** Module or component */
  MODULE = 'module',
  /** Function implementation */
  FUNCTION = 'function',
  /** Class implementation */
  CLASS = 'class',
  /** Interface or type definition */
  INTERFACE = 'interface',
  /** File entity */
  FILE = 'file',
  /** Directory entity */
  DIRECTORY = 'directory',
  /** Configuration or data entity */
  CONFIG = 'config'
}

/**
 * Edge types for different kinds of relationships
 */
export enum RPGEdgeType {
  /** Data flow dependency between modules */
  DATA_FLOW = 'data_flow',
  /** File-level ordering within modules */
  INTRA_MODULE = 'intra_module',
  /** File-level ordering between modules */
  INTER_MODULE = 'inter_module',
  /** Hierarchical parent-child relationship */
  HIERARCHY = 'hierarchy',
  /** Implementation dependency */
  IMPLEMENTATION = 'implementation',
  /** Configuration dependency */
  CONFIG = 'config'
}

/**
 * Implementation status of a node
 */
export enum RPGNodeStatus {
  /** Not yet implemented */
  PENDING = 'pending',
  /** Currently being implemented */
  IN_PROGRESS = 'in_progress',
  /** Implementation completed */
  COMPLETED = 'completed',
  /** Implementation verified and tested */
  VERIFIED = 'verified',
  /** Implementation failed or blocked */
  FAILED = 'failed'
}

/**
 * Core attributes shared by all RPG entities
 */
export interface RPGBaseAttributes {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description */
  description?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * RPG Node representing functional or structural components
 */
export interface RPGNode extends RPGBaseAttributes {
  /** Node hierarchy level */
  level: RPGNodeLevel;
  /** Node type */
  type: RPGNodeType;
  /** Implementation status */
  status: RPGNodeStatus;
  /** File path if applicable */
  filePath?: string;
  /** Directory path if applicable */
  directoryPath?: string;
  /** Programming language if applicable */
  language?: string;
  /** Type signatures or schemas */
  typeSignature?: string;
  /** Parent node ID for hierarchical relationships */
  parentId?: string;
  /** Child node IDs */
  childIds?: string[];
  /** Implementation details */
  implementation?: {
    /** Source code content */
    content?: string;
    /** Line range in file */
    lineRange?: {
      start: number;
      end: number;
    };
    /** Dependencies */
    dependencies?: string[];
    /** Test coverage info */
    testCoverage?: {
      covered: boolean;
      percentage?: number;
    };
  };
}

/**
 * RPG Edge representing relationships between nodes
 */
export interface RPGEdge extends RPGBaseAttributes {
  /** Source node ID */
  fromId: string;
  /** Target node ID */
  toId: string;
  /** Edge type */
  type: RPGEdgeType;
  /** Edge weight for priority or strength */
  weight?: number;
  /** Whether this edge is bidirectional */
  bidirectional?: boolean;
  /** Constraint information */
  constraint?: {
    /** Whether this edge represents a hard constraint */
    required: boolean;
    /** Constraint description */
    reason?: string;
  };
  /** Data flow information for data flow edges */
  dataFlow?: {
    /** Type of data being passed */
    dataType?: string;
    /** Data schema or structure */
    schema?: Record<string, any>;
    /** Flow direction specifics */
    direction?: 'input' | 'output' | 'bidirectional';
  };
}

/**
 * RPG Graph structure containing all nodes and edges
 */
export interface RPGGraph {
  /** Graph metadata */
  metadata: {
    /** Graph version */
    version: string;
    /** Creation timestamp */
    createdAt: Date;
    /** Last modification timestamp */
    updatedAt: Date;
    /** Graph description */
    description?: string;
  };
  /** All nodes in the graph */
  nodes: Map<string, RPGNode>;
  /** All edges in the graph */
  edges: Map<string, RPGEdge>;
  /** Root node IDs (top-level features) */
  rootNodeIds: string[];
}

/**
 * RPG construction options
 */
export interface RPGConstructionOptions {
  /** Whether to auto-generate IDs */
  autoGenerateIds?: boolean;
  /** ID prefix for generated IDs */
  idPrefix?: string;
  /** Whether to validate constraints during construction */
  validateConstraints?: boolean;
  /** Maximum depth for hierarchical structures */
  maxDepth?: number;
}

/**
 * Node query options for filtering and searching
 */
export interface RPGNodeQuery {
  /** Filter by node level */
  level?: RPGNodeLevel | RPGNodeLevel[];
  /** Filter by node type */
  type?: RPGNodeType | RPGNodeType[];
  /** Filter by status */
  status?: RPGNodeStatus | RPGNodeStatus[];
  /** Filter by parent ID */
  parentId?: string;
  /** Filter by file path pattern */
  filePathPattern?: string;
  /** Text search in name or description */
  searchText?: string;
}

/**
 * Edge query options for filtering and searching
 */
export interface RPGEdgeQuery {
  /** Filter by edge type */
  type?: RPGEdgeType | RPGEdgeType[];
  /** Filter by source node ID */
  fromId?: string;
  /** Filter by target node ID */
  toId?: string;
  /** Filter by node IDs (either source or target) */
  nodeId?: string;
  /** Filter by weight range */
  weightRange?: {
    min?: number;
    max?: number;
  };
}

/**
 * Graph validation result
 */
export interface RPGValidationResult {
  /** Whether the graph is valid */
  isValid: boolean;
  /** Validation errors */
  errors: Array<{
    type: 'cycle' | 'orphan' | 'invalid_reference' | 'constraint_violation';
    message: string;
    nodeIds?: string[];
    edgeIds?: string[];
  }>;
  /** Validation warnings */
  warnings: Array<{
    type: 'missing_implementation' | 'incomplete_hierarchy' | 'performance';
    message: string;
    nodeIds?: string[];
    edgeIds?: string[];
  }>;
}

/**
 * Serialization format for RPG persistence
 */
export interface RPGSerializationFormat {
  /** Format metadata */
  format: {
    /** Format version */
    version: string;
    /** Serialization timestamp */
    timestamp: Date;
    /** Compression used if any */
    compression?: string;
  };
  /** Serialized graph data */
  graph: {
    /** Graph metadata */
    metadata: RPGGraph['metadata'];
    /** Serialized nodes */
    nodes: Array<RPGNode>;
    /** Serialized edges */
    edges: Array<RPGEdge>;
    /** Root node IDs */
    rootNodeIds: string[];
  };
}