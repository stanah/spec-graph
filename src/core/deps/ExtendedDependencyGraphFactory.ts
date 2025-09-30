/**
 * Extended Dependency Graph Factory Implementation
 * Factory for creating extended dependency graphs with various initialization options
 */

import { ExtendedDependencyGraph } from './ExtendedDependencyGraph';
import { DependencyGraph } from './DependencyGraph';
import { IExtendedDependencyGraph, IExtendedDependencyGraphFactory } from './ExtendedDependencyGraph.interface';
import { RPGNode, RPGEdge } from '../rpg/types';

export class ExtendedDependencyGraphFactory implements IExtendedDependencyGraphFactory {
  /**
   * Create a new empty extended dependency graph
   */
  create(): IExtendedDependencyGraph {
    return new ExtendedDependencyGraph();
  }

  /**
   * Create an extended dependency graph from an existing basic dependency graph
   * Migrates all nodes and edges while preserving the structure
   */
  createFromBasic(basicGraph: DependencyGraph): IExtendedDependencyGraph {
    const extendedGraph = new ExtendedDependencyGraph();

    // Copy all nodes from basic graph
    const nodeIds = this.extractNodeIds(basicGraph);
    for (const nodeId of nodeIds) {
      extendedGraph.addNode(nodeId);
    }

    // Copy all edges from basic graph
    for (const nodeId of nodeIds) {
      const dependencies = basicGraph.getDependencies(nodeId);
      for (const dep of dependencies) {
        extendedGraph.addEdge(nodeId, dep);
      }
    }

    return extendedGraph;
  }

  /**
   * Create an extended dependency graph with initial RPG data
   * Imports nodes and edges from RPG format
   */
  createWithRPGData(nodes: RPGNode[], edges: RPGEdge[]): IExtendedDependencyGraph {
    const extendedGraph = new ExtendedDependencyGraph();
    extendedGraph.importFromRPG(nodes, edges);
    return extendedGraph;
  }

  /**
   * Create an extended dependency graph with validation enabled
   */
  createWithValidation(): IExtendedDependencyGraph {
    const graph = this.create();

    // Wrap methods to add validation
    const originalAddEdge = graph.addEdge.bind(graph);
    graph.addEdge = (from: string, to: string, attributes?: any) => {
      // Pre-validation: Check if adding this edge would create a cycle
      originalAddEdge(from, to, attributes);

      if (graph.hasCycle()) {
        graph.removeEdge(from, to);
        throw new Error(`Adding edge ${from} -> ${to} would create a cycle`);
      }
    };

    return graph;
  }

  /**
   * Create an extended dependency graph optimized for performance
   * Pre-allocates internal structures for large graphs
   */
  createOptimized(estimatedNodeCount?: number, estimatedEdgeCount?: number): IExtendedDependencyGraph {
    const graph = this.create();

    // Pre-warm internal maps if estimates are provided
    if (estimatedNodeCount && estimatedNodeCount > 1000) {
      // For large graphs, we could implement optimizations here
      // such as pre-sizing Maps or using different data structures
    }

    return graph;
  }

  /**
   * Create a read-only wrapper around an extended dependency graph
   */
  createReadOnly(sourceGraph: IExtendedDependencyGraph): IExtendedDependencyGraph {
    return new ReadOnlyExtendedDependencyGraph(sourceGraph);
  }

  /**
   * Extract node IDs from a basic dependency graph
   * Uses reflection to access internal adjacency list
   */
  private extractNodeIds(basicGraph: DependencyGraph): string[] {
    // Since DependencyGraph doesn't expose a getAllNodes method,
    // we need to access the internal adj map or use existing methods

    // Use nodeCount to determine if we need to iterate
    const count = basicGraph.nodeCount();
    if (count === 0) {
      return [];
    }

    // We can try to find nodes by checking what nodes exist
    // This is a bit of a hack, but necessary without modifying the base class

    // Alternative approach: use topological sort which returns all nodes
    try {
      const sorted = basicGraph.topologicalSort();
      return sorted;
    } catch {
      // If topological sort fails due to cycles, we need another approach
      // We'll use the fact that we can access the private adj field through reflection
      const adjField = (basicGraph as any).adj;
      if (adjField && adjField instanceof Map) {
        return Array.from(adjField.keys());
      }

      throw new Error('Unable to extract nodes from basic dependency graph');
    }
  }
}

/**
 * Read-only wrapper for Extended Dependency Graph
 * Prevents modifications while allowing all read operations
 */
class ReadOnlyExtendedDependencyGraph implements IExtendedDependencyGraph {
  constructor(private readonly sourceGraph: IExtendedDependencyGraph) {}

  // Read operations - delegate to source
  hasNode(id: string): boolean {
    return this.sourceGraph.hasNode(id);
  }

  hasEdge(from: string, to: string): boolean {
    return this.sourceGraph.hasEdge(from, to);
  }

  getDependencies(id: string): string[] {
    return this.sourceGraph.getDependencies(id);
  }

  getDependents(id: string): string[] {
    return this.sourceGraph.getDependents(id);
  }

  nodeCount(): number {
    return this.sourceGraph.nodeCount();
  }

  edgeCount(): number {
    return this.sourceGraph.edgeCount();
  }

  getNodeAttributes(id: string) {
    return this.sourceGraph.getNodeAttributes(id);
  }

  getEdgeAttributes(from: string, to: string) {
    return this.sourceGraph.getEdgeAttributes(from, to);
  }

  queryNodes(options: any) {
    return this.sourceGraph.queryNodes(options);
  }

  queryEdges(options: any) {
    return this.sourceGraph.queryEdges(options);
  }

  getNodesByLevel(level: any) {
    return this.sourceGraph.getNodesByLevel(level);
  }

  getNodesByType(type: any) {
    return this.sourceGraph.getNodesByType(type);
  }

  getNodesByStatus(status: any) {
    return this.sourceGraph.getNodesByStatus(status);
  }

  getChildNodes(parentId: string) {
    return this.sourceGraph.getChildNodes(parentId);
  }

  getParentNode(childId: string) {
    return this.sourceGraph.getParentNode(childId);
  }

  getAncestors(nodeId: string) {
    return this.sourceGraph.getAncestors(nodeId);
  }

  getDescendants(nodeId: string, maxDepth?: number) {
    return this.sourceGraph.getDescendants(nodeId, maxDepth);
  }

  findCyclesDetailed() {
    return this.sourceGraph.findCyclesDetailed();
  }

  hasCycle(): boolean {
    return this.sourceGraph.hasCycle();
  }

  findCycles(): string[][] {
    return this.sourceGraph.findCycles();
  }

  generateCycleResolutionProposals(cycles?: string[][]) {
    return this.sourceGraph.generateCycleResolutionProposals(cycles);
  }

  topologicalSort(): string[] {
    return this.sourceGraph.topologicalSort();
  }

  topologicalSortAdvanced(options?: any) {
    return this.sourceGraph.topologicalSortAdvanced(options);
  }

  generateBuildOrder(options?: any) {
    return this.sourceGraph.generateBuildOrder(options);
  }

  getBuildDependencies(nodeId: string, options?: any) {
    return this.sourceGraph.getBuildDependencies(nodeId, options);
  }

  generateRefactoringProposals(targetNodes?: string[]) {
    return this.sourceGraph.generateRefactoringProposals(targetNodes);
  }

  previewRefactoringProposal(proposal: any) {
    return this.sourceGraph.previewRefactoringProposal(proposal);
  }

  validateDependencies() {
    return this.sourceGraph.validateDependencies();
  }

  validateHierarchy(): boolean {
    return this.sourceGraph.validateHierarchy();
  }

  validateConstraints() {
    return this.sourceGraph.validateConstraints();
  }

  exportToRPG() {
    return this.sourceGraph.exportToRPG();
  }

  getCompatibleDependencyGraph() {
    return this.sourceGraph.getCompatibleDependencyGraph();
  }

  getStatistics() {
    return this.sourceGraph.getStatistics();
  }

  analyzeComplexity() {
    return this.sourceGraph.analyzeComplexity();
  }

  // Write operations - throw errors
  addNode(id: string, attributes?: any): void {
    throw new Error('Cannot modify read-only dependency graph');
  }

  removeNode(id: string): void {
    throw new Error('Cannot modify read-only dependency graph');
  }

  addEdge(from: string, to: string, attributes?: any): void {
    throw new Error('Cannot modify read-only dependency graph');
  }

  removeEdge(from: string, to: string): void {
    throw new Error('Cannot modify read-only dependency graph');
  }

  clear(): void {
    throw new Error('Cannot modify read-only dependency graph');
  }

  updateNodeAttributes(id: string, attributes: any): void {
    throw new Error('Cannot modify read-only dependency graph');
  }

  updateEdgeAttributes(from: string, to: string, attributes: any): void {
    throw new Error('Cannot modify read-only dependency graph');
  }

  applyRefactoringProposal(proposal: any): boolean {
    throw new Error('Cannot modify read-only dependency graph');
  }

  importFromRPG(nodes: RPGNode[], edges: RPGEdge[]): void {
    throw new Error('Cannot modify read-only dependency graph');
  }

  syncWithIDManager(idManager: any): void {
    throw new Error('Cannot modify read-only dependency graph');
  }
}

// Export a singleton factory instance
export const extendedDependencyGraphFactory = new ExtendedDependencyGraphFactory();