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

  /**
   * Find all cycles with detailed analysis and resolution proposals
   * Provides comprehensive information about each cycle including:
   * - Cycle structure and size
   * - Edge types and weights
   * - Complexity score
   * - Impact assessment
   * - Prioritized resolution strategies
   */
  findCyclesDetailed(): CycleDetectionResult {
    const cycles = this.findCycles();
    const hasCycles = cycles.length > 0;

    const analysis = cycles.map(cycle => {
      // Collect edge information
      const edgeTypes = this.getEdgeTypesInCycle(cycle);
      const edgeDetails = this.getEdgeDetailsInCycle(cycle);

      // Calculate cycle metrics
      const complexity = this.calculateCycleComplexity(cycle, edgeDetails);
      const impact = this.assessCycleImpact(cycle);

      // Generate resolution proposals with priority scoring
      const resolutionSuggestions = this.generateCycleResolutionProposalsForCycle(cycle);
      const prioritizedSuggestions = this.prioritizeResolutionProposals(resolutionSuggestions, complexity, impact);

      return {
        cycle,
        size: cycle.length,
        edgeTypes,
        edgeDetails,
        complexity,
        impact,
        canBeResolved: resolutionSuggestions.length > 0,
        resolutionSuggestions: prioritizedSuggestions,
        metadata: {
          isSelfLoop: cycle.length === 1 && this.hasEdge(cycle[0], cycle[0]),
          isSimpleCycle: cycle.length === 2,
          hasWeakEdges: edgeDetails.some(e => (e.weight || 1) < 1),
          hasStrongEdges: edgeDetails.some(e => (e.weight || 1) > 2),
          affectedDescendants: this.countAffectedDescendants(cycle)
        }
      };
    });

    // Calculate overall impact
    const overallComplexity = this.calculateOverallCycleComplexity(analysis);
    const recommendations = this.generateOverallRecommendations(analysis);

    return {
      hasCycles,
      cycles,
      analysis,
      summary: {
        totalCycles: cycles.length,
        simpleCycles: analysis.filter(a => a.size === 2).length,
        complexCycles: analysis.filter(a => a.size > 2).length,
        selfLoops: analysis.filter(a => a.metadata.isSelfLoop).length,
        highImpactCycles: analysis.filter(a => a.impact.level === 'high').length,
        overallComplexity,
        recommendations
      }
    };
  }

  /**
   * Get detailed edge information for all edges in a cycle
   */
  private getEdgeDetailsInCycle(cycle: string[]): Array<{
    from: string;
    to: string;
    type?: RPGEdgeType;
    weight?: number;
    strength: number;
    bidirectional?: boolean;
  }> {
    const edgeDetails: Array<{
      from: string;
      to: string;
      type?: RPGEdgeType;
      weight?: number;
      strength: number;
      bidirectional?: boolean;
    }> = [];

    for (let i = 0; i < cycle.length; i++) {
      const from = cycle[i];
      const to = cycle[(i + 1) % cycle.length];
      const attrs = this.getEdgeAttributes(from, to);

      edgeDetails.push({
        from,
        to,
        type: attrs?.type,
        weight: attrs?.weight,
        strength: this.calculateEdgeStrength(from, to),
        bidirectional: attrs?.bidirectional
      });
    }

    return edgeDetails;
  }

  /**
   * Calculate complexity score for a cycle
   * Higher score means more complex and harder to resolve
   */
  private calculateCycleComplexity(
    cycle: string[],
    edgeDetails: Array<{ from: string; to: string; strength: number }>
  ): { score: number; level: 'low' | 'medium' | 'high'; factors: string[] } {
    const factors: string[] = [];
    let score = 0;

    // Factor 1: Cycle size
    const sizeScore = Math.min(cycle.length / 2, 5);
    score += sizeScore;
    if (cycle.length > 4) {
      factors.push(`Large cycle with ${cycle.length} nodes`);
    }

    // Factor 2: Edge strength
    const avgStrength = edgeDetails.reduce((sum, e) => sum + e.strength, 0) / edgeDetails.length;
    const strengthScore = avgStrength / 2;
    score += strengthScore;
    if (avgStrength > 2) {
      factors.push('Contains strong/critical edges');
    }

    // Factor 3: Node connectivity
    let totalConnections = 0;
    for (const node of cycle) {
      totalConnections += this.getDependencies(node).length + this.getDependents(node).length;
    }
    const avgConnections = totalConnections / cycle.length;
    const connectivityScore = Math.min(avgConnections / 3, 5);
    score += connectivityScore;
    if (avgConnections > 6) {
      factors.push('Highly connected nodes');
    }

    // Factor 4: Hierarchical depth
    const maxDepth = Math.max(...cycle.map(node => this.calculateNodeDepth(node)));
    if (maxDepth > 3) {
      score += 2;
      factors.push('Deep hierarchical structure');
    }

    // Determine level
    const level = score < 5 ? 'low' : score < 10 ? 'medium' : 'high';

    return { score, level, factors };
  }

  /**
   * Assess the impact of a cycle on the overall system
   */
  private assessCycleImpact(cycle: string[]): {
    level: 'low' | 'medium' | 'high';
    affectedNodes: string[];
    affectedNodesCount: number;
    blocksTopologicalSort: boolean;
    description: string;
  } {
    // Find all nodes that depend on any node in the cycle
    const affectedNodes = new Set<string>();
    for (const node of cycle) {
      const dependents = this.getDependents(node);
      dependents.forEach(dep => affectedNodes.add(dep));
    }

    // Remove cycle nodes from affected set
    cycle.forEach(node => affectedNodes.delete(node));

    const affectedNodesCount = affectedNodes.size;
    let level: 'low' | 'medium' | 'high' = 'low';
    let description = '';

    if (affectedNodesCount === 0) {
      level = 'low';
      description = 'Isolated cycle with no downstream dependencies';
    } else if (affectedNodesCount < 5) {
      level = 'medium';
      description = `Affects ${affectedNodesCount} downstream node${affectedNodesCount > 1 ? 's' : ''}`;
    } else {
      level = 'high';
      description = `Affects ${affectedNodesCount} downstream nodes - significant impact`;
    }

    return {
      level,
      affectedNodes: Array.from(affectedNodes),
      affectedNodesCount,
      blocksTopologicalSort: true,
      description
    };
  }

  /**
   * Prioritize resolution proposals based on complexity and impact
   */
  private prioritizeResolutionProposals(
    proposals: RefactoringProposal[],
    complexity: { score: number; level: string },
    impact: { level: string; affectedNodesCount: number }
  ): RefactoringProposal[] {
    // Calculate priority score for each proposal
    const scoredProposals = proposals.map(proposal => {
      let priorityScore = 0;

      // Prefer lower complexity solutions
      if (proposal.impact.complexity === 'low') priorityScore += 3;
      else if (proposal.impact.complexity === 'medium') priorityScore += 2;
      else priorityScore += 1;

      // Prefer lower risk solutions
      if (proposal.impact.riskLevel === 'low') priorityScore += 3;
      else if (proposal.impact.riskLevel === 'medium') priorityScore += 2;
      else priorityScore += 1;

      // Adjust based on proposal type
      if (proposal.type === 'extract_interface') priorityScore += 2; // Generally safe
      if (proposal.type === 'remove_edge' && complexity.level === 'low') priorityScore += 2; // Good for simple cycles
      if (proposal.type === 'split_node' && complexity.level === 'high') priorityScore += 1; // Good for complex cycles

      // Auto-applicable proposals get bonus
      if (proposal.autoApplicable) priorityScore += 1;

      return { proposal, priorityScore };
    });

    // Sort by priority score (highest first)
    scoredProposals.sort((a, b) => b.priorityScore - a.priorityScore);

    // Add priority rank to proposals
    return scoredProposals.map((sp, index) => ({
      ...sp.proposal,
      metadata: {
        ...sp.proposal.metadata,
        priorityRank: index + 1,
        priorityScore: sp.priorityScore
      }
    }));
  }

  /**
   * Count how many descendant nodes are affected by a cycle
   */
  private countAffectedDescendants(cycle: string[]): number {
    const affected = new Set<string>();
    for (const node of cycle) {
      const descendants = this.getDescendants(node);
      descendants.forEach(d => affected.add(d));
    }
    // Remove cycle nodes from count
    cycle.forEach(node => affected.delete(node));
    return affected.size;
  }

  /**
   * Calculate overall cycle complexity for multiple cycles
   */
  private calculateOverallCycleComplexity(
    analysis: Array<{ complexity: { score: number } }>
  ): { score: number; level: 'low' | 'medium' | 'high' } {
    if (analysis.length === 0) {
      return { score: 0, level: 'low' };
    }

    const totalScore = analysis.reduce((sum, a) => sum + a.complexity.score, 0);
    const avgScore = totalScore / analysis.length;
    const level = avgScore < 5 ? 'low' : avgScore < 10 ? 'medium' : 'high';

    return { score: avgScore, level };
  }

  /**
   * Generate overall recommendations for resolving all cycles
   */
  private generateOverallRecommendations(
    analysis: Array<{
      size: number;
      complexity: { level: string };
      impact: { level: string };
      resolutionSuggestions: RefactoringProposal[];
    }>
  ): string[] {
    const recommendations: string[] = [];

    // Recommend starting with simple cycles
    const simpleCycles = analysis.filter(a => a.size === 2);
    if (simpleCycles.length > 0) {
      recommendations.push(`Start by resolving ${simpleCycles.length} simple 2-node cycle${simpleCycles.length > 1 ? 's' : ''}`);
    }

    // Recommend addressing high-impact cycles first
    const highImpactCycles = analysis.filter(a => a.impact.level === 'high');
    if (highImpactCycles.length > 0) {
      recommendations.push(`Prioritize ${highImpactCycles.length} high-impact cycle${highImpactCycles.length > 1 ? 's' : ''} with many dependents`);
    }

    // Suggest batch resolution for similar cycles
    if (analysis.length > 3) {
      recommendations.push('Consider batch-resolving similar cycles using consistent strategies');
    }

    // Suggest architectural review for many complex cycles
    const complexCycles = analysis.filter(a => a.complexity.level === 'high');
    if (complexCycles.length > 2) {
      recommendations.push('Multiple complex cycles detected - consider broader architectural refactoring');
    }

    // Default recommendation
    if (recommendations.length === 0 && analysis.length > 0) {
      recommendations.push('Review and apply the prioritized resolution suggestions for each cycle');
    }

    return recommendations;
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

    // Strategy 3: Node split for large nodes with multiple responsibilities
    const largeNodes = this.findLargeNodesInCycle(cycle);
    for (const largeNode of largeNodes) {
      const splitProposal = this.generateNodeSplitProposal(largeNode, cycle);
      if (splitProposal) {
        proposals.push(splitProposal);
      }
    }

    // Strategy 4: Dependency edge restructuring
    if (cycle.length > 2) {
      const restructureProposal = this.generateDependencyRestructuringProposal(cycle);
      if (restructureProposal) {
        proposals.push(restructureProposal);
      }
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

  /**
   * Find large nodes in a cycle that could benefit from splitting
   * A node is considered large if it has many connections or multiple responsibilities
   */
  private findLargeNodesInCycle(cycle: string[]): string[] {
    const largeNodes: string[] = [];
    const LARGE_NODE_THRESHOLD = 5; // Number of connections to be considered large

    for (const node of cycle) {
      const totalConnections = this.getDependencies(node).length + this.getDependents(node).length;
      const attrs = this.getNodeAttributes(node);

      // Check if node is large based on:
      // 1. Number of connections
      // 2. Node type (MODULE or FEATURE are typically larger)
      // 3. Multiple children (indicating multiple responsibilities)
      const hasManyConnections = totalConnections >= LARGE_NODE_THRESHOLD;
      const isLargeType = attrs?.type === RPGNodeType.MODULE || attrs?.type === RPGNodeType.FEATURE;
      const hasMultipleChildren = this.getChildNodes(node).length > 3;

      if (hasManyConnections || (isLargeType && hasMultipleChildren)) {
        largeNodes.push(node);
      }
    }

    return largeNodes;
  }

  /**
   * Generate a proposal to split a large node into smaller, more focused nodes
   */
  private generateNodeSplitProposal(nodeId: string, cycle: string[]): RefactoringProposal | null {
    const attrs = this.getNodeAttributes(nodeId);
    const dependencies = this.getDependencies(nodeId);
    const dependents = this.getDependents(nodeId);

    // Analyze the node's responsibilities based on its dependencies and dependents
    const responsibilities = this.analyzeNodeResponsibilities(nodeId, dependencies, dependents);

    if (responsibilities.length < 2) {
      return null; // Not enough distinct responsibilities to split
    }

    // Generate split proposals
    const splitNodes = responsibilities.map((resp, index) => ({
      id: `${nodeId}_${resp.category}_${index}`,
      category: resp.category,
      relatedNodes: resp.relatedNodes
    }));

    const changes = splitNodes.map(splitNode => ({
      action: 'add_node' as const,
      target: splitNode.id,
      details: {
        type: attrs?.type || RPGNodeType.MODULE,
        level: attrs?.level || RPGNodeLevel.IMPLEMENTATION,
        description: `Split from ${nodeId} - handles ${splitNode.category}`,
        parentId: attrs?.parentId
      }
    }));

    // Add changes to remove original node and reconnect edges
    changes.push({
      action: 'remove_node' as const,
      target: nodeId,
      details: {}
    });

    return {
      id: `split_node_${nodeId}_${Date.now()}`,
      type: 'split_node',
      description: `Split ${nodeId} into ${splitNodes.length} focused nodes`,
      explanation: `The node ${nodeId} has multiple responsibilities: ${responsibilities.map(r => r.category).join(', ')}. Splitting it will improve maintainability and may help break the dependency cycle.`,
      affectedNodes: [nodeId, ...cycle.filter(n => n !== nodeId)],
      changes,
      impact: {
        complexity: 'high',
        riskLevel: 'medium',
        benefits: [
          'Separates concerns',
          'Reduces coupling',
          'May break dependency cycle',
          'Improves testability'
        ],
        drawbacks: [
          'Requires significant refactoring',
          'May increase total number of nodes',
          'Needs careful dependency rewiring'
        ]
      },
      autoApplicable: false,
      metadata: {
        splitNodes: splitNodes.map(n => n.id),
        originalNode: nodeId,
        responsibilities
      }
    };
  }

  /**
   * Analyze a node's responsibilities based on its connections
   */
  private analyzeNodeResponsibilities(
    nodeId: string,
    dependencies: string[],
    dependents: string[]
  ): Array<{ category: string; relatedNodes: string[] }> {
    const responsibilities: Array<{ category: string; relatedNodes: string[] }> = [];
    const categorizedNodes = new Map<string, string[]>();

    // Categorize dependencies by their type/domain
    for (const dep of dependencies) {
      const depAttrs = this.getNodeAttributes(dep);
      const category = this.inferNodeCategory(dep, depAttrs);

      if (!categorizedNodes.has(category)) {
        categorizedNodes.set(category, []);
      }
      categorizedNodes.get(category)!.push(dep);
    }

    // Categorize dependents
    for (const dependent of dependents) {
      const depAttrs = this.getNodeAttributes(dependent);
      const category = this.inferNodeCategory(dependent, depAttrs);

      if (!categorizedNodes.has(category)) {
        categorizedNodes.set(category, []);
      }
      categorizedNodes.get(category)!.push(dependent);
    }

    // Convert to responsibilities array
    for (const [category, nodes] of categorizedNodes) {
      if (nodes.length > 0) {
        responsibilities.push({ category, relatedNodes: nodes });
      }
    }

    return responsibilities;
  }

  /**
   * Infer the category/domain of a node based on its attributes
   */
  private inferNodeCategory(nodeId: string, attrs: ExtendedNodeAttributes | undefined): string {
    // Use type as primary category
    if (attrs?.type) {
      return attrs.type;
    }

    // Use file path to infer category
    if (attrs?.filePath) {
      const pathParts = attrs.filePath.split('/');
      if (pathParts.length > 1) {
        return pathParts[pathParts.length - 2]; // Use parent directory
      }
    }

    // Use language as fallback
    if (attrs?.language) {
      return attrs.language;
    }

    return 'general';
  }

  /**
   * Generate a proposal to restructure dependencies in a cycle
   * This involves reordering or redirecting edges to break the cycle
   */
  private generateDependencyRestructuringProposal(cycle: string[]): RefactoringProposal | null {
    if (cycle.length < 3) {
      return null; // Too simple for restructuring
    }

    // Find the weakest edge in the cycle (edge with lowest weight or least critical)
    const weakestEdge = this.findWeakestEdgeInCycle(cycle);
    if (!weakestEdge) {
      return null;
    }

    const { from, to } = weakestEdge;
    const edgeAttrs = this.getEdgeAttributes(from, to);

    return {
      id: `restructure_cycle_${cycle.join('_')}_${Date.now()}`,
      type: 'remove_edge',
      description: `Remove weakest edge ${from} -> ${to} to break cycle`,
      explanation: `The edge from ${from} to ${to} is the weakest in the cycle${edgeAttrs?.type ? ` (type: ${edgeAttrs.type})` : ''}. Removing it will break the circular dependency with minimal impact.`,
      affectedNodes: cycle,
      changes: [
        {
          action: 'remove_edge',
          target: `${from}->${to}`,
          details: {
            reason: 'Breaking cycle by removing weakest edge',
            originalType: edgeAttrs?.type,
            originalWeight: edgeAttrs?.weight
          }
        }
      ],
      impact: {
        complexity: 'low',
        riskLevel: 'low',
        benefits: [
          'Breaks dependency cycle',
          'Minimal impact on architecture',
          'Easy to revert if needed'
        ],
        drawbacks: [
          'May require alternative dependency mechanism',
          'Could affect functionality if edge is actually needed'
        ]
      },
      autoApplicable: false,
      metadata: {
        cycle,
        removedEdge: { from, to },
        edgeStrength: this.calculateEdgeStrength(from, to)
      }
    };
  }

  /**
   * Find the weakest edge in a cycle
   * Weakness is determined by edge weight, type, and criticality
   */
  private findWeakestEdgeInCycle(cycle: string[]): { from: string; to: string } | null {
    let weakestEdge: { from: string; to: string; strength: number } | null = null;

    for (let i = 0; i < cycle.length; i++) {
      const from = cycle[i];
      const to = cycle[(i + 1) % cycle.length];

      const strength = this.calculateEdgeStrength(from, to);

      if (!weakestEdge || strength < weakestEdge.strength) {
        weakestEdge = { from, to, strength };
      }
    }

    return weakestEdge ? { from: weakestEdge.from, to: weakestEdge.to } : null;
  }

  /**
   * Calculate the strength/importance of an edge
   * Higher value means stronger/more critical edge
   */
  private calculateEdgeStrength(from: string, to: string): number {
    const attrs = this.getEdgeAttributes(from, to);
    let strength = attrs?.weight || 1;

    // Adjust strength based on edge type
    if (attrs?.type) {
      switch (attrs.type) {
        case RPGEdgeType.IMPLEMENTATION:
          strength *= 2; // Implementation edges are critical
          break;
        case RPGEdgeType.DATA_FLOW:
          strength *= 1.5; // Data flow is important
          break;
        case RPGEdgeType.HIERARCHY:
          strength *= 3; // Hierarchy edges are very critical
          break;
        case RPGEdgeType.CONFIG:
          strength *= 0.5; // Config edges are less critical
          break;
      }
    }

    // Consider bidirectional edges as stronger
    if (attrs?.bidirectional) {
      strength *= 1.5;
    }

    // Consider constraint requirements
    if (attrs?.constraint?.required) {
      strength *= 2;
    }

    return strength;
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

    // Helper function to get node priority
    const getNodePriority = (nodeId: string): number => {
      const attrs = this.getNodeAttributes(nodeId);
      return attrs?.priority || 0;
    };

    // Priority queue implementation using array with custom sort
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
            const priorityA = getNodePriority(a);
            const priorityB = getNodePriority(b);
            if (priorityA !== priorityB) {
              return priorityB - priorityA; // Higher priority first
            }
          }

          // Secondary sort: lexicographic for deterministic results
          return a.localeCompare(b);
        });
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
   * Handles cycles by detecting them and skipping affected paths
   */
  private findCriticalPath(): { path: string[]; time: number } {
    // Check for cycles first
    if (this.hasCycle()) {
      // For graphs with cycles, we can't compute a true critical path
      // Return empty result or handle specially
      return { path: [], time: 0 };
    }

    const allNodes = [...this.adj.keys()];
    const memo = new Map<string, { path: string[]; time: number }>();
    const visiting = new Set<string>();

    const findLongestPath = (nodeId: string): { path: string[]; time: number } => {
      if (memo.has(nodeId)) {
        return memo.get(nodeId)!;
      }

      // Detect cycles during traversal
      if (visiting.has(nodeId)) {
        // Cycle detected, return empty path
        return { path: [], time: 0 };
      }

      visiting.add(nodeId);

      const dependencies = this.getDependencies(nodeId);
      const nodeTime = this.estimateBuildTime(nodeId);

      if (dependencies.length === 0) {
        const result = { path: [nodeId], time: nodeTime };
        memo.set(nodeId, result);
        visiting.delete(nodeId);
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
      visiting.delete(nodeId);
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

    // Detect DIP (Dependency Inversion Principle) violations
    const dipViolations = this.detectDIPViolations(nodes);
    proposals.push(...dipViolations);

    // Detect ISP (Interface Segregation Principle) violations
    const ispViolations = this.detectISPViolations(nodes);
    proposals.push(...ispViolations);

    // Detect responsibility separation opportunities
    const responsibilitySeparation = this.detectResponsibilitySeparationOpportunities(nodes);
    proposals.push(...responsibilitySeparation);

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
          case 'add_edge': {
            const [from, to] = change.target.split('->');
            this.addEdge(from, to, change.details);
            break;
          }
          case 'remove_edge': {
            const [removeFrom, removeTo] = change.target.split('->');
            this.removeEdge(removeFrom, removeTo);
            break;
          }
          // Add more cases as needed
        }
      }
      return true;
    } catch {
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
        case 'add_edge': {
          const [from, to] = change.target.split('->');
          addedEdges.push({ from, to, attributes: change.details });
          break;
        }
        case 'remove_edge': {
          const [removeFrom, removeTo] = change.target.split('->');
          removedEdges.push({ from: removeFrom, to: removeTo });
          break;
        }
        case 'modify_node': {
          const oldAttrs = this.getNodeAttributes(change.target) || {};
          modifiedNodes.push({
            id: change.target,
            oldAttributes: oldAttrs,
            newAttributes: { ...oldAttrs, ...change.details }
          });
          break;
        }
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

  // === Advanced Refactoring Proposals (DIP, ISP, etc.) ===

  /**
   * Detect Dependency Inversion Principle (DIP) violations
   * DIP states: High-level modules should not depend on low-level modules.
   * Both should depend on abstractions.
   */
  private detectDIPViolations(nodes: string[]): RefactoringProposal[] {
    const proposals: RefactoringProposal[] = [];

    for (const nodeId of nodes) {
      const attrs = this.getNodeAttributes(nodeId);

      // Skip if already an interface or abstraction
      if (attrs?.type === RPGNodeType.INTERFACE) {
        continue;
      }

      // Check if this is a high-level module (MODULE or FEATURE)
      const isHighLevel = attrs?.type === RPGNodeType.MODULE || attrs?.type === RPGNodeType.FEATURE;

      if (isHighLevel) {
        const dependencies = this.getDependencies(nodeId);
        const concreteDependencies: string[] = [];

        // Find concrete (non-abstraction) dependencies
        for (const dep of dependencies) {
          const depAttrs = this.getNodeAttributes(dep);

          // Check if dependency is concrete (not an interface/abstraction)
          const isConcrete = depAttrs?.type !== RPGNodeType.INTERFACE &&
                           depAttrs?.type !== RPGNodeType.CONFIG;

          // Check if it's a lower-level module
          const isLowerLevel = this.isLowerLevel(attrs.level, depAttrs?.level);

          if (isConcrete && isLowerLevel) {
            concreteDependencies.push(dep);
          }
        }

        // If high-level module depends on concrete low-level modules, suggest abstraction
        if (concreteDependencies.length > 0) {
          const proposal = this.createDIPViolationProposal(nodeId, concreteDependencies);
          if (proposal) {
            proposals.push(proposal);
          }
        }
      }
    }

    return proposals;
  }

  /**
   * Check if level1 is higher than level2
   */
  private isLowerLevel(level1?: RPGNodeLevel, level2?: RPGNodeLevel): boolean {
    if (!level1 || !level2) return false;

    const levelOrder = {
      [RPGNodeLevel.PROPOSAL]: 4,
      [RPGNodeLevel.MODULE]: 3,
      [RPGNodeLevel.IMPLEMENTATION]: 2,
      [RPGNodeLevel.FILE_SYSTEM]: 1
    };

    return levelOrder[level1] > levelOrder[level2];
  }

  /**
   * Create a DIP violation proposal
   */
  private createDIPViolationProposal(nodeId: string, concreteDeps: string[]): RefactoringProposal | null {
    if (concreteDeps.length === 0) return null;

    const attrs = this.getNodeAttributes(nodeId);
    const changes = concreteDeps.map(dep => {
      const interfaceId = `${dep}_Interface`;

      return {
        action: 'add_node' as const,
        target: interfaceId,
        details: {
          type: RPGNodeType.INTERFACE,
          level: attrs?.level || RPGNodeLevel.IMPLEMENTATION,
          description: `Interface extracted from ${dep} to follow DIP`,
          parentId: this.getNodeAttributes(dep)?.parentId
        }
      };
    });

    // Add edge redirection changes
    for (const dep of concreteDeps) {
      const interfaceId = `${dep}_Interface`;
      changes.push(
        {
          action: 'remove_edge' as const,
          target: `${dep}->${nodeId}`,
          details: { reason: 'Replace with abstraction dependency' }
        },
        {
          action: 'add_edge' as const,
          target: `${interfaceId}->${nodeId}`,
          details: { type: RPGEdgeType.IMPLEMENTATION }
        },
        {
          action: 'add_edge' as const,
          target: `${dep}->${interfaceId}`,
          details: { type: RPGEdgeType.IMPLEMENTATION }
        }
      );
    }

    return {
      id: `dip_violation_${nodeId}_${Date.now()}`,
      type: 'extract_interface',
      description: `Apply DIP: Extract interfaces for dependencies of ${nodeId}`,
      explanation: `High-level module ${nodeId} depends on concrete low-level modules: ${concreteDeps.join(', ')}. According to the Dependency Inversion Principle, both should depend on abstractions. Extracting interfaces will invert the dependency direction and improve flexibility.`,
      affectedNodes: [nodeId, ...concreteDeps],
      changes,
      impact: {
        complexity: 'medium',
        riskLevel: 'low',
        benefits: [
          'Follows Dependency Inversion Principle',
          'Improves testability through dependency injection',
          'Reduces coupling between layers',
          'Enables easier module replacement'
        ],
        drawbacks: [
          'Adds abstraction layer',
          'May require dependency injection setup',
          'Increases number of files'
        ]
      },
      autoApplicable: false,
      metadata: {
        principle: 'DIP',
        violationType: 'concrete_dependency',
        affectedDependencies: concreteDeps
      }
    };
  }

  /**
   * Detect Interface Segregation Principle (ISP) violations
   * ISP states: Clients should not be forced to depend on interfaces they don't use.
   */
  private detectISPViolations(nodes: string[]): RefactoringProposal[] {
    const proposals: RefactoringProposal[] = [];

    for (const nodeId of nodes) {
      const attrs = this.getNodeAttributes(nodeId);

      // Focus on interfaces and large classes/modules
      const isInterface = attrs?.type === RPGNodeType.INTERFACE;
      const isLargeClass = attrs?.type === RPGNodeType.CLASS;
      const isModule = attrs?.type === RPGNodeType.MODULE;

      if (!isInterface && !isLargeClass && !isModule) {
        continue;
      }

      // Check if node has many dependents (fat interface indicator)
      const dependents = this.getDependents(nodeId);
      const children = this.getChildNodes(nodeId);

      // Fat interface: many dependents and many children (methods/properties)
      const isFatInterface = dependents.length >= 3 && children.length >= 5;

      if (isFatInterface) {
        // Analyze which dependents use which children
        const usagePattern = this.analyzeInterfaceUsage(nodeId, dependents, children);

        if (usagePattern.canBeSplit) {
          const proposal = this.createISPViolationProposal(nodeId, usagePattern);
          if (proposal) {
            proposals.push(proposal);
          }
        }
      }
    }

    return proposals;
  }

  /**
   * Analyze how dependents use an interface's members
   */
  private analyzeInterfaceUsage(
    interfaceId: string,
    dependents: string[],
    children: string[]
  ): {
    canBeSplit: boolean;
    groups: Array<{ name: string; members: string[]; users: string[] }>;
  } {
    // Simplified analysis: group by usage patterns
    // In a real implementation, this would analyze actual usage via static analysis

    const groups: Array<{ name: string; members: string[]; users: string[] }> = [];

    // Split children into groups based on naming patterns or metadata
    const groupedMembers = new Map<string, string[]>();

    for (const child of children) {
      const childAttrs = this.getNodeAttributes(child);
      const category = this.inferMemberCategory(child, childAttrs);

      if (!groupedMembers.has(category)) {
        groupedMembers.set(category, []);
      }
      groupedMembers.get(category)!.push(child);
    }

    // Only split if we have meaningful groups
    const canBeSplit = groupedMembers.size >= 2 &&
                      Array.from(groupedMembers.values()).every(g => g.length >= 2);

    if (canBeSplit) {
      for (const [category, members] of groupedMembers) {
        groups.push({
          name: category,
          members,
          users: dependents // In real implementation, filter by actual usage
        });
      }
    }

    return { canBeSplit, groups };
  }

  /**
   * Infer the category of an interface member
   */
  private inferMemberCategory(memberId: string, attrs: ExtendedNodeAttributes | undefined): string {
    // Use type as primary categorization
    if (attrs?.type === RPGNodeType.FUNCTION) {
      // Analyze function name for patterns
      if (memberId.toLowerCase().includes('read') || memberId.toLowerCase().includes('get') || memberId.toLowerCase().includes('fetch')) {
        return 'reader';
      }
      if (memberId.toLowerCase().includes('write') || memberId.toLowerCase().includes('set') || memberId.toLowerCase().includes('update')) {
        return 'writer';
      }
      if (memberId.toLowerCase().includes('delete') || memberId.toLowerCase().includes('remove')) {
        return 'remover';
      }
      if (memberId.toLowerCase().includes('validate') || memberId.toLowerCase().includes('check')) {
        return 'validator';
      }
    }

    // Default category
    return 'general';
  }

  /**
   * Create an ISP violation proposal
   */
  private createISPViolationProposal(
    nodeId: string,
    usagePattern: { groups: Array<{ name: string; members: string[]; users: string[] }> }
  ): RefactoringProposal | null {
    const attrs = this.getNodeAttributes(nodeId);
    const changes: Array<{
      action: 'add_node' | 'remove_node' | 'modify_node' | 'add_edge' | 'remove_edge' | 'modify_edge';
      target: string;
      details: any;
    }> = [];

    // Create new focused interfaces
    const newInterfaces = usagePattern.groups.map((group, index) => {
      const newInterfaceId = `${nodeId}_${group.name}_${index}`;

      changes.push({
        action: 'add_node',
        target: newInterfaceId,
        details: {
          type: RPGNodeType.INTERFACE,
          level: attrs?.level || RPGNodeLevel.IMPLEMENTATION,
          description: `Focused interface for ${group.name} operations (split from ${nodeId})`,
          parentId: attrs?.parentId
        }
      });

      return { id: newInterfaceId, group };
    });

    return {
      id: `isp_violation_${nodeId}_${Date.now()}`,
      type: 'split_node',
      description: `Apply ISP: Split ${nodeId} into ${newInterfaces.length} focused interfaces`,
      explanation: `Interface ${nodeId} is too large and forces clients to depend on methods they don't use. According to the Interface Segregation Principle, we should split it into smaller, focused interfaces: ${newInterfaces.map(i => i.id).join(', ')}. This allows clients to depend only on what they need.`,
      affectedNodes: [nodeId],
      changes,
      impact: {
        complexity: 'high',
        riskLevel: 'medium',
        benefits: [
          'Follows Interface Segregation Principle',
          'Reduces unnecessary dependencies',
          'Improves code clarity and maintainability',
          'Enables more flexible composition'
        ],
        drawbacks: [
          'Increases number of interfaces',
          'May require updating client code',
          'More complex interface hierarchy'
        ]
      },
      autoApplicable: false,
      metadata: {
        principle: 'ISP',
        violationType: 'fat_interface',
        splitCount: newInterfaces.length,
        originalInterface: nodeId
      }
    };
  }

  /**
   * Detect opportunities for responsibility separation
   * Based on Single Responsibility Principle
   */
  private detectResponsibilitySeparationOpportunities(nodes: string[]): RefactoringProposal[] {
    const proposals: RefactoringProposal[] = [];

    for (const nodeId of nodes) {
      const attrs = this.getNodeAttributes(nodeId);

      // Focus on classes and modules
      if (attrs?.type !== RPGNodeType.CLASS && attrs?.type !== RPGNodeType.MODULE) {
        continue;
      }

      const children = this.getChildNodes(nodeId);
      const dependencies = this.getDependencies(nodeId);

      // Indicators of multiple responsibilities:
      // 1. Many children (methods/properties)
      // 2. Diverse dependency types
      // 3. High coupling

      const hasManyChildren = children.length >= 8;
      const hasManyDependencies = dependencies.length >= 6;
      const totalConnections = dependencies.length + this.getDependents(nodeId).length;
      const hasHighCoupling = totalConnections >= 10;

      if ((hasManyChildren && hasManyDependencies) || hasHighCoupling) {
        // Analyze responsibilities
        const responsibilities = this.analyzeNodeResponsibilities(nodeId, dependencies, this.getDependents(nodeId));

        if (responsibilities.length >= 2) {
          const proposal: RefactoringProposal = {
            id: `srp_violation_${nodeId}_${Date.now()}`,
            type: 'split_node',
            description: `Separate responsibilities of ${nodeId}`,
            explanation: `Node ${nodeId} appears to have multiple responsibilities: ${responsibilities.map(r => r.category).join(', ')}. Consider splitting it into focused components, each with a single, well-defined responsibility.`,
            affectedNodes: [nodeId],
            changes: responsibilities.map((resp, index) => ({
              action: 'add_node' as const,
              target: `${nodeId}_${resp.category}_${index}`,
              details: {
                type: attrs.type,
                level: attrs.level,
                description: `Handles ${resp.category} responsibilities (split from ${nodeId})`,
                parentId: attrs.parentId
              }
            })),
            impact: {
              complexity: 'high',
              riskLevel: 'medium',
              benefits: [
                'Follows Single Responsibility Principle',
                'Improves maintainability',
                'Reduces complexity per component',
                'Easier to test and modify'
              ],
              drawbacks: [
                'Requires significant refactoring',
                'May need coordination between new components',
                'More files to manage'
              ]
            },
            autoApplicable: false,
            metadata: {
              principle: 'SRP',
              violationType: 'multiple_responsibilities',
              responsibilities: responsibilities.map(r => r.category),
              originalNode: nodeId
            }
          };

          proposals.push(proposal);
        }
      }
    }

    return proposals;
  }
}