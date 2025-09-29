/**
 * Extended Dependency Graph Implementation for RPG Algorithm Integration
 * Extends the basic DependencyGraph with RPG-specific functionality
 */

import { DependencyGraph } from './DependencyGraph';
import {
  IExtendedDependencyGraph,
  ExtendedNodeAttributes,
  ExtendedEdgeAttributes,
  BuildOrderOptions,
  BuildGroup,
  CycleDetectionResult,
  RefactoringProposal,
  DependencyValidationResult,
  QueryOptions
} from './ExtendedDependencyGraph.interface';
import {
  RPGNode,
  RPGEdge,
  RPGNodeLevel,
  RPGNodeType,
  RPGEdgeType,
  RPGNodeStatus
} from '../rpg/types';

export class ExtendedDependencyGraph extends DependencyGraph implements IExtendedDependencyGraph {
  private nodeAttributes: Map<string, ExtendedNodeAttributes> = new Map();
  private edgeAttributes: Map<string, ExtendedEdgeAttributes> = new Map();

  // === Basic operations (maintaining compatibility) ===

  addNode(id: string, attributes?: ExtendedNodeAttributes): void {
    super.addNode(id);
    if (attributes) {
      this.nodeAttributes.set(id, { ...attributes });
    }
  }

  removeNode(id: string): void {
    super.removeNode(id);
    this.nodeAttributes.delete(id);
    // Remove edge attributes for edges connected to this node
    const edgeKeysToRemove: string[] = [];
    for (const [key] of this.edgeAttributes) {
      const [from, to] = key.split('->');
      if (from === id || to === id) {
        edgeKeysToRemove.push(key);
      }
    }
    edgeKeysToRemove.forEach(key => this.edgeAttributes.delete(key));
  }

  addEdge(from: string, to: string, attributes?: ExtendedEdgeAttributes): void {
    super.addEdge(from, to);
    if (attributes) {
      const key = `${from}->${to}`;
      this.edgeAttributes.set(key, { ...attributes });
    }
  }

  removeEdge(from: string, to: string): void {
    super.removeEdge(from, to);
    const key = `${from}->${to}`;
    this.edgeAttributes.delete(key);
  }

  clear(): void {
    super.clear();
    this.nodeAttributes.clear();
    this.edgeAttributes.clear();
  }

  // === Extended attribute management ===

  getNodeAttributes(id: string): ExtendedNodeAttributes | undefined {
    return this.nodeAttributes.get(id);
  }

  updateNodeAttributes(id: string, attributes: Partial<ExtendedNodeAttributes>): void {
    if (!this.hasNode(id)) {
      throw new Error(`Node ${id} does not exist`);
    }
    const current = this.nodeAttributes.get(id) || {};
    this.nodeAttributes.set(id, { ...current, ...attributes });
  }

  getEdgeAttributes(from: string, to: string): ExtendedEdgeAttributes | undefined {
    const key = `${from}->${to}`;
    return this.edgeAttributes.get(key);
  }

  updateEdgeAttributes(from: string, to: string, attributes: Partial<ExtendedEdgeAttributes>): void {
    if (!this.hasEdge(from, to)) {
      throw new Error(`Edge ${from}->${to} does not exist`);
    }
    const key = `${from}->${to}`;
    const current = this.edgeAttributes.get(key) || {};
    this.edgeAttributes.set(key, { ...current, ...attributes });
  }

  // === Advanced query operations ===

  queryNodes(options: QueryOptions): string[] {
    const allNodes = [...this.adj.keys()];
    return allNodes.filter(nodeId => {
      const attrs = this.nodeAttributes.get(nodeId);

      if (options.level && attrs?.level !== options.level) return false;
      if (options.nodeType && attrs?.type !== options.nodeType) return false;
      if (options.status && attrs?.status !== options.status) return false;
      if (options.language && attrs?.language !== options.language) return false;
      if (options.filePathPattern && attrs?.filePath &&
          !attrs.filePath.match(new RegExp(options.filePathPattern))) return false;

      return true;
    });
  }

  queryEdges(options: QueryOptions): Array<{ from: string; to: string; attributes: ExtendedEdgeAttributes }> {
    const results: Array<{ from: string; to: string; attributes: ExtendedEdgeAttributes }> = [];

    for (const [key, attributes] of this.edgeAttributes) {
      const [from, to] = key.split('->');

      if (options.edgeType && attributes.type !== options.edgeType) continue;

      results.push({ from, to, attributes });
    }

    return results;
  }

  getNodesByLevel(level: RPGNodeLevel): string[] {
    return this.queryNodes({ level });
  }

  getNodesByType(type: RPGNodeType): string[] {
    return this.queryNodes({ nodeType: type });
  }

  getNodesByStatus(status: RPGNodeStatus): string[] {
    return this.queryNodes({ status });
  }

  getChildNodes(parentId: string): string[] {
    const children: string[] = [];
    for (const [nodeId, attrs] of this.nodeAttributes) {
      if (attrs.parentId === parentId) {
        children.push(nodeId);
      }
    }
    return children.sort();
  }

  getParentNode(childId: string): string | undefined {
    const attrs = this.nodeAttributes.get(childId);
    return attrs?.parentId;
  }

  getAncestors(nodeId: string): string[] {
    const ancestors: string[] = [];
    let currentId: string | undefined = nodeId;

    while (currentId) {
      const parentId = this.getParentNode(currentId);
      if (parentId && !ancestors.includes(parentId)) {
        ancestors.push(parentId);
        currentId = parentId;
      } else {
        break;
      }
    }

    return ancestors;
  }

  getDescendants(nodeId: string, maxDepth?: number): string[] {
    const descendants: string[] = [];
    const visited = new Set<string>();

    const traverse = (currentId: string, depth: number) => {
      if (maxDepth !== undefined && depth >= maxDepth) return;
      if (visited.has(currentId)) return;

      visited.add(currentId);
      const children = this.getChildNodes(currentId);

      for (const child of children) {
        if (!descendants.includes(child)) {
          descendants.push(child);
        }
        traverse(child, depth + 1);
      }
    };

    traverse(nodeId, 0);
    return descendants;
  }

  // === Advanced cycle detection and resolution ===

  findCyclesDetailed(): CycleDetectionResult {
    const cycles = this.findCycles();
    const hasCycles = cycles.length > 0;

    const analysis = cycles.map(cycle => {
      const edgeTypes = this.getEdgeTypesInCycle(cycle);
      const resolutionSuggestions = this.generateCycleResolutionProposalsForCycle(cycle);

      return {
        cycle,
        edgeTypes,
        canBeResolved: resolutionSuggestions.length > 0,
        resolutionSuggestions
      };
    });

    return {
      hasCycles,
      cycles,
      analysis
    };
  }

  private getEdgeTypesInCycle(cycle: string[]): RPGEdgeType[] {
    const edgeTypes: RPGEdgeType[] = [];

    for (let i = 0; i < cycle.length; i++) {
      const from = cycle[i];
      const to = cycle[(i + 1) % cycle.length];
      const attrs = this.getEdgeAttributes(from, to);
      if (attrs?.type) {
        edgeTypes.push(attrs.type);
      }
    }

    return edgeTypes;
  }

  generateCycleResolutionProposals(cycles?: string[][]): RefactoringProposal[] {
    const targetCycles = cycles || this.findCycles();
    const proposals: RefactoringProposal[] = [];

    for (const cycle of targetCycles) {
      proposals.push(...this.generateCycleResolutionProposalsForCycle(cycle));
    }

    return proposals;
  }

  private generateCycleResolutionProposalsForCycle(cycle: string[]): RefactoringProposal[] {
    const proposals: RefactoringProposal[] = [];

    // Strategy 1: Extract interface for the most connected node
    const mostConnectedNode = this.findMostConnectedNodeInCycle(cycle);
    if (mostConnectedNode) {
      proposals.push({
        id: `extract_interface_${mostConnectedNode}_${Date.now()}`,
        type: 'extract_interface',
        description: `Extract interface from ${mostConnectedNode} to break cycle`,
        explanation: `Create an interface that ${mostConnectedNode} implements, allowing other nodes to depend on the interface instead of the concrete implementation.`,
        affectedNodes: cycle,
        changes: [
          {
            action: 'add_node',
            target: `${mostConnectedNode}_Interface`,
            details: {
              type: RPGNodeType.INTERFACE,
              level: RPGNodeLevel.IMPLEMENTATION,
              description: `Interface extracted from ${mostConnectedNode}`
            }
          }
        ],
        impact: {
          complexity: 'medium',
          riskLevel: 'low',
          benefits: ['Breaks dependency cycle', 'Improves testability', 'Follows dependency inversion principle'],
          drawbacks: ['Adds abstraction layer', 'May require implementation changes']
        },
        autoApplicable: false
      });
    }

    // Strategy 2: Reverse dependency direction
    if (cycle.length === 2) {
      const [nodeA, nodeB] = cycle;
      proposals.push({
        id: `reverse_dependency_${nodeA}_${nodeB}_${Date.now()}`,
        type: 'reverse_dependency',
        description: `Reverse dependency direction between ${nodeA} and ${nodeB}`,
        explanation: `Change the dependency direction to break the circular dependency.`,
        affectedNodes: [nodeA, nodeB],
        changes: [
          {
            action: 'remove_edge',
            target: `${nodeA}->${nodeB}`,
            details: {}
          },
          {
            action: 'add_edge',
            target: `${nodeB}->${nodeA}`,
            details: {}
          }
        ],
        impact: {
          complexity: 'medium',
          riskLevel: 'medium',
          benefits: ['Simple solution', 'Breaks cycle immediately'],
          drawbacks: ['May violate design principles', 'Could create logical inconsistencies']
        },
        autoApplicable: false
      });
    }

    return proposals;
  }

  private findMostConnectedNodeInCycle(cycle: string[]): string | undefined {
    let maxConnections = 0;
    let mostConnected: string | undefined;

    for (const node of cycle) {
      const connections = this.getDependencies(node).length + this.getDependents(node).length;
      if (connections > maxConnections) {
        maxConnections = connections;
        mostConnected = node;
      }
    }

    return mostConnected;
  }

  // === Advanced topological sorting and build ordering ===

  topologicalSortAdvanced(options?: BuildOrderOptions): string[] {
    if (!options) {
      return this.topologicalSort();
    }

    // Filter edges by type if specified
    let filteredAdj = this.adj;
    if (options.edgeTypes && options.edgeTypes.length > 0) {
      filteredAdj = new Map();
      for (const [from, tos] of this.adj) {
        const filteredTos = new Set<string>();
        for (const to of tos) {
          const attrs = this.getEdgeAttributes(from, to);
          if (!attrs?.type || options.edgeTypes.includes(attrs.type)) {
            filteredTos.add(to);
          }
        }
        filteredAdj.set(from, filteredTos);
      }
    }

    return this.prioritizedTopologicalSort(filteredAdj, options);
  }

  /**
   * Priority-aware topological sort with support for edge weights and node priorities
   */
  private prioritizedTopologicalSort(adjMap: Map<string, Set<string>>, options?: BuildOrderOptions): string[] {
    // Build set of all nodes present in the graph
    const nodes = new Set<string>();
    for (const k of adjMap.keys()) nodes.add(k);
    for (const [, tos] of adjMap.entries()) {
      for (const to of tos) nodes.add(to);
    }

    // Build reversed adjacency with weights: dependency -> [dependents with weights]
    const out: Map<string, Map<string, number>> = new Map();
    for (const n of nodes) out.set(n, new Map());

    for (const [from, tos] of adjMap.entries()) {
      for (const to of tos) {
        if (!out.has(to)) out.set(to, new Map());

        // Get edge weight if considering weights
        let weight = 1;
        if (options?.considerWeights) {
          const attrs = this.getEdgeAttributes(from, to);
          weight = attrs?.weight || 1;
        }

        out.get(to)!.set(from, weight);
      }
    }

    // Compute weighted indegree in reversed graph
    const indeg: Map<string, number> = new Map();
    for (const n of nodes) indeg.set(n, 0);
    for (const [, neighMap] of out.entries()) {
      for (const [v, weight] of neighMap) {
        indeg.set(v, (indeg.get(v) || 0) + weight);
      }
    }

    // Priority queue implementation using array with custom sort
    const self = this;
    class PriorityQueue {
      private items: string[] = [];

      enqueue(item: string): void {
        this.items.push(item);
        this.sort();
      }

      dequeue(): string | undefined {
        return this.items.shift();
      }

      get length(): number {
        return this.items.length;
      }

      private sort(): void {
        this.items.sort((a, b) => {
          // Primary sort: higher priority first (if considering priorities)
          if (options?.considerPriorities) {
            const priorityA = this.getNodePriority(a);
            const priorityB = this.getNodePriority(b);
            if (priorityA !== priorityB) {
              return priorityB - priorityA; // Higher priority first
            }
          }

          // Secondary sort: lexicographic for deterministic results
          return a.localeCompare(b);
        });
      }

      private getNodePriority(nodeId: string): number {
        const attrs = self.getNodeAttributes(nodeId);
        return attrs?.priority || 0;
      }
    }

    // Initialize queue with nodes of indegree 0
    const queue = new PriorityQueue();
    for (const n of nodes) {
      if ((indeg.get(n) || 0) === 0) {
        queue.enqueue(n);
      }
    }

    const result: string[] = [];

    while (queue.length > 0) {
      const n = queue.dequeue()!;
      result.push(n);

      for (const [v, weight] of out.get(n) ?? new Map()) {
        indeg.set(v, indeg.get(v)! - weight);
        if (indeg.get(v) === 0) {
          queue.enqueue(v);
        }
      }
    }

    if (result.length !== nodes.size) {
      throw new Error('ExtendedDependencyGraph: cycle detected during prioritizedTopologicalSort');
    }

    return result;
  }

  generateBuildOrder(options?: BuildOrderOptions): BuildGroup[] {
    const groups: BuildGroup[] = [];
    const processed = new Set<string>();
    const allNodes = [...this.adj.keys()];
    let groupIndex = 0;

    while (processed.size < allNodes.length) {
      const currentGroup: string[] = [];

      // Sort candidates by priority and build readiness
      const candidates = allNodes
        .filter(node => !processed.has(node))
        .filter(node => {
          const deps = this.getBuildDependencies(node, options);
          return deps.every(dep => processed.has(dep));
        })
        .sort((a, b) => {
          // Sort by priority if considering priorities
          if (options?.considerPriorities) {
            const priorityA = this.getNodeAttributes(a)?.priority || 0;
            const priorityB = this.getNodeAttributes(b)?.priority || 0;
            if (priorityA !== priorityB) {
              return priorityB - priorityA; // Higher priority first
            }
          }

          // Sort by estimated build time (if available)
          const timeA = this.estimateBuildTime(a);
          const timeB = this.estimateBuildTime(b);
          if (timeA !== timeB) {
            return timeB - timeA; // Longer builds first for better parallelization
          }

          return a.localeCompare(b);
        });

      // Add candidates to current group respecting parallelism limits
      for (const candidate of candidates) {
        if (options?.maxParallelism && currentGroup.length >= options.maxParallelism) {
          break;
        }
        currentGroup.push(candidate);
      }

      if (currentGroup.length === 0) {
        // Circular dependency or other issue - add remaining nodes
        const remaining = allNodes.filter(n => !processed.has(n));
        if (remaining.length > 0) {
          currentGroup.push(...remaining);
        }
        break;
      }

      // Mark nodes as processed
      currentGroup.forEach(node => processed.add(node));

      // Calculate which previous groups this group depends on
      const dependsOnGroups: number[] = [];
      for (let i = 0; i < groupIndex; i++) {
        const hasDirectDependency = currentGroup.some(node => {
          const deps = this.getBuildDependencies(node, options);
          return deps.some(dep => groups[i].nodes.includes(dep));
        });
        if (hasDirectDependency) {
          dependsOnGroups.push(i);
        }
      }

      groups.push({
        order: groupIndex,
        nodes: currentGroup.sort(),
        estimatedTime: this.estimateGroupBuildTime(currentGroup),
        dependsOnGroups
      });

      groupIndex++;
    }

    return groups;
  }

  /**
   * Generate optimal build order for partial graph (MVS-inspired approach)
   * Supports building only a subset of nodes while respecting dependencies
   */
  generatePartialBuildOrder(targetNodes: string[], options?: BuildOrderOptions): BuildGroup[] {
    // Find all dependencies required for target nodes (transitive closure)
    const requiredNodes = new Set<string>();
    const visited = new Set<string>();

    const collectDependencies = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      if (!this.hasNode(nodeId)) return;

      requiredNodes.add(nodeId);
      const deps = this.getBuildDependencies(nodeId, options);
      deps.forEach(dep => collectDependencies(dep));
    };

    targetNodes.forEach(node => collectDependencies(node));

    // Create subgraph with only required nodes
    const subgraph = new ExtendedDependencyGraph();

    // Add nodes with their attributes
    for (const nodeId of requiredNodes) {
      const attrs = this.getNodeAttributes(nodeId);
      subgraph.addNode(nodeId, attrs);
    }

    // Add edges between required nodes
    for (const nodeId of requiredNodes) {
      const deps = this.getDependencies(nodeId);
      for (const dep of deps) {
        if (requiredNodes.has(dep)) {
          const edgeAttrs = this.getEdgeAttributes(dep, nodeId);
          subgraph.addEdge(dep, nodeId, edgeAttrs);
        }
      }
    }

    // Generate build order for subgraph
    return subgraph.generateBuildOrder(options);
  }

  /**
   * Estimate build time for a node based on its attributes
   */
  private estimateBuildTime(nodeId: string): number {
    const attrs = this.getNodeAttributes(nodeId);

    // Use metadata if available
    if (attrs?.metadata?.estimatedBuildTime) {
      return attrs.metadata.estimatedBuildTime;
    }

    // Estimate based on node type and dependencies
    let baseTime = 1;

    switch (attrs?.type) {
      case RPGNodeType.FILE:
        baseTime = 0.5;
        break;
      case RPGNodeType.CLASS:
      case RPGNodeType.FUNCTION:
        baseTime = 1;
        break;
      case RPGNodeType.MODULE:
        baseTime = 2;
        break;
      case RPGNodeType.FEATURE:
        baseTime = 5;
        break;
      default:
        baseTime = 1;
    }

    // Scale by number of dependencies
    const depCount = this.getDependencies(nodeId).length;
    return baseTime * (1 + depCount * 0.1);
  }

  /**
   * Estimate total build time for a group of nodes
   */
  private estimateGroupBuildTime(nodes: string[]): number {
    // For parallel execution, use the maximum time (critical path)
    return Math.max(...nodes.map(node => this.estimateBuildTime(node)));
  }

  /**
   * Analyze parallelization potential for the entire graph
   */
  analyzeParallelizationPotential(options?: BuildOrderOptions): {
    maxParallelism: number;
    criticalPath: string[];
    criticalPathTime: number;
    totalSequentialTime: number;
    parallelizationRatio: number;
    bottlenecks: Array<{ nodeId: string; reason: string; impact: number }>;
    recommendations: string[];
  } {
    const buildGroups = this.generateBuildOrder(options);
    const allNodes = [...this.adj.keys()];

    // Calculate critical path (longest path through the graph)
    const { path: criticalPath, time: criticalPathTime } = this.findCriticalPath();

    // Calculate total sequential time
    const totalSequentialTime = allNodes.reduce((sum, node) => sum + this.estimateBuildTime(node), 0);

    // Find maximum parallelism (largest group size)
    const maxParallelism = Math.max(...buildGroups.map(group => group.nodes.length));

    // Calculate parallelization ratio
    const parallelizationRatio = criticalPathTime > 0 ? 1 - (criticalPathTime / totalSequentialTime) : 0;

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(buildGroups);

    // Generate recommendations
    const recommendations = this.generateParallelizationRecommendations(
      buildGroups,
      criticalPath,
      bottlenecks,
      parallelizationRatio
    );

    return {
      maxParallelism,
      criticalPath,
      criticalPathTime,
      totalSequentialTime,
      parallelizationRatio,
      bottlenecks,
      recommendations
    };
  }

  /**
   * Find the critical path (longest path) through the dependency graph
   */
  private findCriticalPath(): { path: string[]; time: number } {
    const allNodes = [...this.adj.keys()];
    const memo = new Map<string, { path: string[]; time: number }>();

    const findLongestPath = (nodeId: string): { path: string[]; time: number } => {
      if (memo.has(nodeId)) {
        return memo.get(nodeId)!;
      }

      const dependencies = this.getDependencies(nodeId);
      const nodeTime = this.estimateBuildTime(nodeId);

      if (dependencies.length === 0) {
        const result = { path: [nodeId], time: nodeTime };
        memo.set(nodeId, result);
        return result;
      }

      let longestDependencyPath = { path: [] as string[], time: 0 };

      for (const dep of dependencies) {
        const depPath = findLongestPath(dep);
        if (depPath.time > longestDependencyPath.time) {
          longestDependencyPath = depPath;
        }
      }

      const result = {
        path: [...longestDependencyPath.path, nodeId],
        time: longestDependencyPath.time + nodeTime
      };

      memo.set(nodeId, result);
      return result;
    };

    // Find the overall critical path
    let globalCriticalPath = { path: [] as string[], time: 0 };

    for (const node of allNodes) {
      const nodePath = findLongestPath(node);
      if (nodePath.time > globalCriticalPath.time) {
        globalCriticalPath = nodePath;
      }
    }

    return globalCriticalPath;
  }

  /**
   * Identify bottlenecks in the build process
   */
  private identifyBottlenecks(buildGroups: BuildGroup[]): Array<{ nodeId: string; reason: string; impact: number }> {
    const bottlenecks: Array<{ nodeId: string; reason: string; impact: number }> = [];

    // Find single-node groups (serialization points)
    buildGroups.forEach((group, index) => {
      if (group.nodes.length === 1) {
        const nodeId = group.nodes[0];
        const dependents = this.getDependents(nodeId);
        const impact = dependents.length * this.estimateBuildTime(nodeId);

        bottlenecks.push({
          nodeId,
          reason: `Serialization point - single node in group ${index}`,
          impact
        });
      }
    });

    // Find nodes with many dependencies (fan-in)
    const allNodes = [...this.adj.keys()];
    allNodes.forEach(nodeId => {
      const dependencies = this.getDependencies(nodeId);
      if (dependencies.length > 5) {
        bottlenecks.push({
          nodeId,
          reason: `High fan-in - ${dependencies.length} dependencies`,
          impact: dependencies.length
        });
      }
    });

    // Find nodes with many dependents (fan-out)
    allNodes.forEach(nodeId => {
      const dependents = this.getDependents(nodeId);
      if (dependents.length > 5) {
        bottlenecks.push({
          nodeId,
          reason: `High fan-out - ${dependents.length} dependents`,
          impact: dependents.length
        });
      }
    });

    // Sort by impact (highest first)
    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  /**
   * Generate recommendations for improving parallelization
   */
  private generateParallelizationRecommendations(
    buildGroups: BuildGroup[],
    criticalPath: string[],
    bottlenecks: Array<{ nodeId: string; reason: string; impact: number }>,
    parallelizationRatio: number
  ): string[] {
    const recommendations: string[] = [];

    // Check parallelization ratio
    if (parallelizationRatio < 0.3) {
      recommendations.push('Low parallelization potential detected. Consider breaking down large modules.');
    }

    // Check for long critical path
    if (criticalPath.length > 10) {
      recommendations.push(`Critical path is long (${criticalPath.length} nodes). Consider optimizing: ${criticalPath.slice(0, 3).join(', ')}...`);
    }

    // Address top bottlenecks
    const topBottlenecks = bottlenecks.slice(0, 3);
    topBottlenecks.forEach(bottleneck => {
      if (bottleneck.reason.includes('Serialization point')) {
        recommendations.push(`Address serialization bottleneck at ${bottleneck.nodeId}`);
      } else if (bottleneck.reason.includes('High fan-in')) {
        recommendations.push(`Consider splitting ${bottleneck.nodeId} to reduce fan-in`);
      } else if (bottleneck.reason.includes('High fan-out')) {
        recommendations.push(`Consider extracting interfaces from ${bottleneck.nodeId} to reduce fan-out`);
      }
    });

    // Check for imbalanced groups
    const avgGroupSize = buildGroups.reduce((sum, g) => sum + g.nodes.length, 0) / buildGroups.length;
    const imbalancedGroups = buildGroups.filter(g => g.nodes.length < avgGroupSize * 0.5);
    if (imbalancedGroups.length > buildGroups.length * 0.3) {
      recommendations.push('Many small build groups detected. Consider merging compatible groups.');
    }

    return recommendations;
  }

  /**
   * Check if two nodes can be built in parallel
   */
  canBuildInParallel(nodeA: string, nodeB: string, options?: BuildOrderOptions): boolean {
    // Basic dependency check
    const depsA = this.getBuildDependencies(nodeA, options);
    const depsB = this.getBuildDependencies(nodeB, options);

    // They can't be parallel if one depends on the other
    if (depsA.includes(nodeB) || depsB.includes(nodeA)) {
      return false;
    }

    // Check for shared critical dependencies
    const sharedDeps = depsA.filter(dep => depsB.includes(dep));
    if (sharedDeps.length > 0) {
      // They might still be parallel if shared dependencies don't create conflicts
      // For simplicity, we'll allow it unless there are resource constraints
      const resourceConflicts = this.checkResourceConflicts(nodeA, nodeB, sharedDeps);
      return !resourceConflicts;
    }

    return true;
  }

  /**
   * Check for resource conflicts between nodes
   */
  private checkResourceConflicts(nodeA: string, nodeB: string, sharedDeps: string[]): boolean {
    // Check if nodes use conflicting resources
    const attrsA = this.getNodeAttributes(nodeA);
    const attrsB = this.getNodeAttributes(nodeB);

    // File system conflicts
    if (attrsA?.filePath && attrsB?.filePath) {
      // Check if they're in the same directory and might conflict
      const dirA = attrsA.filePath.substring(0, attrsA.filePath.lastIndexOf('/'));
      const dirB = attrsB.filePath.substring(0, attrsB.filePath.lastIndexOf('/'));

      if (dirA === dirB && attrsA.language === attrsB.language) {
        // Same directory and language might indicate resource conflicts
        return true;
      }
    }

    // Memory/CPU intensive operations
    const isIntensiveA = this.isResourceIntensive(nodeA);
    const isIntensiveB = this.isResourceIntensive(nodeB);

    if (isIntensiveA && isIntensiveB) {
      return true; // Both are intensive, might conflict
    }

    return false;
  }

  /**
   * Check if a node represents a resource-intensive operation
   */
  private isResourceIntensive(nodeId: string): boolean {
    const attrs = this.getNodeAttributes(nodeId);

    // Large modules or features are typically more intensive
    if (attrs?.type === RPGNodeType.FEATURE || attrs?.type === RPGNodeType.MODULE) {
      return true;
    }

    // Many dependencies indicate complexity
    const depCount = this.getDependencies(nodeId).length;
    if (depCount > 10) {
      return true;
    }

    // Check metadata for intensity hints
    if (attrs?.metadata?.isResourceIntensive) {
      return true;
    }

    return false;
  }

  getBuildDependencies(nodeId: string, options?: BuildOrderOptions): string[] {
    const visited = new Set<string>();
    const dependencies: string[] = [];

    const traverse = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const deps = this.getDependencies(currentId);
      for (const dep of deps) {
        // Apply edge type filtering if specified
        if (options?.edgeTypes) {
          const attrs = this.getEdgeAttributes(dep, currentId);
          if (attrs?.type && !options.edgeTypes.includes(attrs.type)) {
            continue;
          }
        }

        if (!dependencies.includes(dep)) {
          dependencies.push(dep);
        }
        traverse(dep);
      }
    };

    // Don't include the node itself in its dependencies
    const directDeps = this.getDependencies(nodeId);
    for (const dep of directDeps) {
      // Apply edge type filtering if specified
      if (options?.edgeTypes) {
        const attrs = this.getEdgeAttributes(dep, nodeId);
        if (attrs?.type && !options.edgeTypes.includes(attrs.type)) {
          continue;
        }
      }

      if (!dependencies.includes(dep)) {
        dependencies.push(dep);
      }
      traverse(dep);
    }

    return dependencies.sort();
  }

  // === Refactoring and optimization ===

  generateRefactoringProposals(targetNodes?: string[]): RefactoringProposal[] {
    const proposals: RefactoringProposal[] = [];
    const nodes = targetNodes || [...this.adj.keys()];

    // Add cycle resolution proposals
    const cycles = this.findCycles();
    if (cycles.length > 0) {
      proposals.push(...this.generateCycleResolutionProposals(cycles));
    }

    // Find nodes with high coupling
    const highCouplingNodes = this.findHighCouplingNodes(nodes);
    for (const node of highCouplingNodes) {
      proposals.push(this.createDecouplingProposal(node));
    }

    return proposals;
  }

  private findHighCouplingNodes(nodes: string[]): string[] {
    const threshold = 5; // Threshold for high coupling
    return nodes.filter(node => {
      const totalConnections = this.getDependencies(node).length + this.getDependents(node).length;
      return totalConnections >= threshold;
    });
  }

  private createDecouplingProposal(nodeId: string): RefactoringProposal {
    return {
      id: `decouple_${nodeId}_${Date.now()}`,
      type: 'extract_interface',
      description: `Reduce coupling for high-connectivity node ${nodeId}`,
      explanation: `Node ${nodeId} has high coupling. Consider extracting interfaces or splitting responsibilities.`,
      affectedNodes: [nodeId, ...this.getDependencies(nodeId), ...this.getDependents(nodeId)],
      changes: [
        {
          action: 'add_node',
          target: `${nodeId}_Interface`,
          details: {
            type: RPGNodeType.INTERFACE,
            description: `Interface for ${nodeId}`
          }
        }
      ],
      impact: {
        complexity: 'high',
        riskLevel: 'medium',
        benefits: ['Reduced coupling', 'Better maintainability', 'Improved testability'],
        drawbacks: ['Increased complexity', 'More files to maintain']
      },
      autoApplicable: false
    };
  }

  applyRefactoringProposal(proposal: RefactoringProposal): boolean {
    if (!proposal.autoApplicable) {
      return false;
    }

    try {
      for (const change of proposal.changes) {
        switch (change.action) {
          case 'add_node':
            this.addNode(change.target, change.details);
            break;
          case 'remove_node':
            this.removeNode(change.target);
            break;
          case 'add_edge':
            const [from, to] = change.target.split('->');
            this.addEdge(from, to, change.details);
            break;
          case 'remove_edge':
            const [removeFrom, removeTo] = change.target.split('->');
            this.removeEdge(removeFrom, removeTo);
            break;
          // Add more cases as needed
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  previewRefactoringProposal(proposal: RefactoringProposal) {
    const addedNodes: Array<{ id: string; attributes: ExtendedNodeAttributes }> = [];
    const removedNodes: string[] = [];
    const addedEdges: Array<{ from: string; to: string; attributes: ExtendedEdgeAttributes }> = [];
    const removedEdges: Array<{ from: string; to: string }> = [];
    const modifiedNodes: Array<{ id: string; oldAttributes: ExtendedNodeAttributes; newAttributes: ExtendedNodeAttributes }> = [];

    for (const change of proposal.changes) {
      switch (change.action) {
        case 'add_node':
          addedNodes.push({ id: change.target, attributes: change.details });
          break;
        case 'remove_node':
          removedNodes.push(change.target);
          break;
        case 'add_edge':
          const [from, to] = change.target.split('->');
          addedEdges.push({ from, to, attributes: change.details });
          break;
        case 'remove_edge':
          const [removeFrom, removeTo] = change.target.split('->');
          removedEdges.push({ from: removeFrom, to: removeTo });
          break;
        case 'modify_node':
          const oldAttrs = this.getNodeAttributes(change.target) || {};
          modifiedNodes.push({
            id: change.target,
            oldAttributes: oldAttrs,
            newAttributes: { ...oldAttrs, ...change.details }
          });
          break;
      }
    }

    return {
      addedNodes,
      removedNodes,
      addedEdges,
      removedEdges,
      modifiedNodes
    };
  }

  // === Validation and integrity ===

  validateDependencies(): DependencyValidationResult {
    const issues: DependencyValidationResult['issues'] = [];
    const cycles = this.findCycles();

    // Check for cycles
    cycles.forEach(cycle => {
      issues.push({
        type: 'cycle',
        severity: 'error',
        description: `Circular dependency detected: ${cycle.join(' -> ')}`,
        affectedNodes: cycle
      });
    });

    // Check for orphaned nodes
    const orphans = this.findOrphanedNodes();
    orphans.forEach(orphan => {
      issues.push({
        type: 'orphan',
        severity: 'warning',
        description: `Orphaned node: ${orphan}`,
        affectedNodes: [orphan]
      });
    });

    // Check for invalid references
    const invalidRefs = this.findInvalidReferences();
    invalidRefs.forEach(ref => {
      issues.push({
        type: 'invalid_reference',
        severity: 'error',
        description: `Invalid reference: ${ref}`,
        affectedNodes: [ref]
      });
    });

    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      statistics: {
        totalNodes: this.nodeCount(),
        totalEdges: this.edgeCount(),
        orphanNodes: orphans.length,
        invalidReferences: invalidRefs.length,
        constraintViolations: 0 // TODO: Implement constraint validation
      }
    };
  }

  private findOrphanedNodes(): string[] {
    const orphans: string[] = [];
    for (const [nodeId] of this.adj) {
      const deps = this.getDependencies(nodeId);
      const dependents = this.getDependents(nodeId);
      if (deps.length === 0 && dependents.length === 0) {
        orphans.push(nodeId);
      }
    }
    return orphans;
  }

  private findInvalidReferences(): string[] {
    const invalid: string[] = [];
    // This would check for references to non-existent nodes
    // Implementation depends on the specific requirements
    return invalid;
  }

  validateHierarchy(): boolean {
    // Check for hierarchy cycles
    for (const [nodeId] of this.nodeAttributes) {
      const ancestors = this.getAncestors(nodeId);
      if (ancestors.includes(nodeId)) {
        return false; // Hierarchy cycle detected
      }
    }
    return true;
  }

  validateConstraints(): Array<{ nodeId: string; issue: string; severity: 'error' | 'warning' }> {
    const issues: Array<{ nodeId: string; issue: string; severity: 'error' | 'warning' }> = [];

    // Validate edge constraints
    for (const [key, attrs] of this.edgeAttributes) {
      if (attrs.constraint?.required) {
        const [from, to] = key.split('->');
        if (!this.hasEdge(from, to)) {
          issues.push({
            nodeId: from,
            issue: `Required edge to ${to} is missing`,
            severity: 'error'
          });
        }
      }
    }

    return issues;
  }

  // === Integration with RPG and ID Manager ===

  importFromRPG(nodes: RPGNode[], edges: RPGEdge[]): void {
    // Clear existing data
    this.clear();

    // Import nodes
    for (const node of nodes) {
      this.addNode(node.id, {
        level: node.level,
        type: node.type,
        status: node.status,
        filePath: node.filePath,
        language: node.language,
        typeSignature: node.typeSignature,
        parentId: node.parentId,
        metadata: node.metadata,
        implementation: node.implementation
      });
    }

    // Import edges
    for (const edge of edges) {
      this.addEdge(edge.fromId, edge.toId, {
        type: edge.type,
        weight: edge.weight,
        bidirectional: edge.bidirectional,
        constraint: edge.constraint,
        dataFlow: edge.dataFlow,
        metadata: edge.metadata
      });
    }
  }

  exportToRPG(): { nodes: RPGNode[]; edges: RPGEdge[] } {
    const nodes: RPGNode[] = [];
    const edges: RPGEdge[] = [];

    // Export nodes
    for (const [nodeId, attrs] of this.nodeAttributes) {
      nodes.push({
        id: nodeId,
        name: nodeId, // Use ID as name by default
        description: attrs.metadata?.description,
        createdAt: new Date(),
        updatedAt: new Date(),
        level: attrs.level || RPGNodeLevel.IMPLEMENTATION,
        type: attrs.type || RPGNodeType.MODULE,
        status: attrs.status || RPGNodeStatus.PENDING,
        filePath: attrs.filePath,
        language: attrs.language,
        typeSignature: attrs.typeSignature,
        parentId: attrs.parentId,
        metadata: attrs.metadata,
        implementation: attrs.implementation
      });
    }

    // Export edges
    for (const [key, attrs] of this.edgeAttributes) {
      const [fromId, toId] = key.split('->');
      edges.push({
        id: `${fromId}_${toId}`,
        name: `${fromId} -> ${toId}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        fromId,
        toId,
        type: attrs.type || RPGEdgeType.IMPLEMENTATION,
        weight: attrs.weight,
        bidirectional: attrs.bidirectional,
        constraint: attrs.constraint,
        dataFlow: attrs.dataFlow,
        metadata: attrs.metadata
      });
    }

    return { nodes, edges };
  }

  syncWithIDManager(idManager: any): void {
    // Implementation depends on IDManager interface
    // This would sync node IDs with the external ID manager
  }

  getCompatibleDependencyGraph(): DependencyGraph {
    // Return a basic DependencyGraph with the same structure
    const basicGraph = new DependencyGraph();

    for (const [nodeId] of this.adj) {
      basicGraph.addNode(nodeId);
    }

    for (const [from, tos] of this.adj) {
      for (const to of tos) {
        basicGraph.addEdge(from, to);
      }
    }

    return basicGraph;
  }

  // === Statistics and analysis ===

  getStatistics() {
    const levelDistribution: Record<RPGNodeLevel, number> = {
      [RPGNodeLevel.PROPOSAL]: 0,
      [RPGNodeLevel.MODULE]: 0,
      [RPGNodeLevel.IMPLEMENTATION]: 0,
      [RPGNodeLevel.FILE_SYSTEM]: 0
    };

    const typeDistribution: Record<RPGNodeType, number> = {
      [RPGNodeType.FEATURE]: 0,
      [RPGNodeType.MODULE]: 0,
      [RPGNodeType.FUNCTION]: 0,
      [RPGNodeType.CLASS]: 0,
      [RPGNodeType.INTERFACE]: 0,
      [RPGNodeType.FILE]: 0,
      [RPGNodeType.DIRECTORY]: 0,
      [RPGNodeType.CONFIG]: 0
    };

    const edgeTypeDistribution: Record<RPGEdgeType, number> = {
      [RPGEdgeType.DATA_FLOW]: 0,
      [RPGEdgeType.INTRA_MODULE]: 0,
      [RPGEdgeType.INTER_MODULE]: 0,
      [RPGEdgeType.HIERARCHY]: 0,
      [RPGEdgeType.IMPLEMENTATION]: 0,
      [RPGEdgeType.CONFIG]: 0
    };

    const statusDistribution: Record<RPGNodeStatus, number> = {
      [RPGNodeStatus.PENDING]: 0,
      [RPGNodeStatus.IN_PROGRESS]: 0,
      [RPGNodeStatus.COMPLETED]: 0,
      [RPGNodeStatus.VERIFIED]: 0,
      [RPGNodeStatus.FAILED]: 0
    };

    // Calculate distributions
    for (const [, attrs] of this.nodeAttributes) {
      if (attrs.level) levelDistribution[attrs.level]++;
      if (attrs.type) typeDistribution[attrs.type]++;
      if (attrs.status) statusDistribution[attrs.status]++;
    }

    for (const [, attrs] of this.edgeAttributes) {
      if (attrs.type) edgeTypeDistribution[attrs.type]++;
    }

    // Calculate depth statistics
    const depths = [...this.nodeAttributes.keys()].map(nodeId => this.calculateNodeDepth(nodeId));
    const averageDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;
    const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;

    return {
      nodeCount: this.nodeCount(),
      edgeCount: this.edgeCount(),
      levelDistribution,
      typeDistribution,
      edgeTypeDistribution,
      statusDistribution,
      averageDepth,
      maxDepth,
      cyclomaticComplexity: this.calculateCyclomaticComplexity()
    };
  }

  private calculateNodeDepth(nodeId: string): number {
    const ancestors = this.getAncestors(nodeId);
    return ancestors.length;
  }

  private calculateCyclomaticComplexity(): number {
    // Simplified cyclomatic complexity: E - N + 2P
    // where E = edges, N = nodes, P = connected components
    const E = this.edgeCount();
    const N = this.nodeCount();
    const P = 1; // Assuming single connected component for simplicity

    return Math.max(1, E - N + 2 * P);
  }

  analyzeComplexity() {
    const stats = this.getStatistics();
    const factors: Array<{ factor: string; score: number; description: string }> = [];

    // Node count factor
    const nodeScore = Math.min(10, stats.nodeCount / 10);
    factors.push({
      factor: 'Node Count',
      score: nodeScore,
      description: `${stats.nodeCount} nodes in the graph`
    });

    // Edge density factor
    const maxEdges = stats.nodeCount * (stats.nodeCount - 1);
    const edgeDensity = maxEdges > 0 ? stats.edgeCount / maxEdges : 0;
    const densityScore = edgeDensity * 10;
    factors.push({
      factor: 'Edge Density',
      score: densityScore,
      description: `${(edgeDensity * 100).toFixed(1)}% edge density`
    });

    // Cycle factor
    const cycleCount = this.findCycles().length;
    const cycleScore = Math.min(10, cycleCount * 2);
    factors.push({
      factor: 'Cycles',
      score: cycleScore,
      description: `${cycleCount} cycles detected`
    });

    // Overall complexity
    const overallScore = factors.reduce((sum, f) => sum + f.score, 0) / factors.length;
    const overall = overallScore < 3 ? 'low' : overallScore < 7 ? 'medium' : 'high';

    const recommendations: string[] = [];
    if (cycleCount > 0) {
      recommendations.push('Consider resolving circular dependencies');
    }
    if (edgeDensity > 0.3) {
      recommendations.push('High edge density detected - consider modularization');
    }
    if (stats.nodeCount > 100) {
      recommendations.push('Large graph - consider hierarchical organization');
    }

    return {
      overall: overall as 'low' | 'medium' | 'high',
      factors,
      recommendations
    };
  }
}