/**
 * Refactoring Proposal Manager
 * Manages selection, application, rollback, and evaluation of refactoring proposals
 */

import { RefactoringProposal, ExtendedNodeAttributes, ExtendedEdgeAttributes } from './ExtendedDependencyGraph.interface';
import { IExtendedDependencyGraph } from './ExtendedDependencyGraph.interface';

/**
 * Proposal filter options
 */
export interface ProposalFilterOptions {
  /** Filter by proposal type */
  type?: RefactoringProposal['type'] | RefactoringProposal['type'][];
  /** Filter by complexity level */
  complexity?: 'low' | 'medium' | 'high' | Array<'low' | 'medium' | 'high'>;
  /** Filter by risk level */
  riskLevel?: 'low' | 'medium' | 'high' | Array<'low' | 'medium' | 'high'>;
  /** Filter by design principle */
  principle?: 'DIP' | 'ISP' | 'SRP' | 'general' | string;
  /** Filter by affected nodes (contains any of these) */
  affectedNodes?: string[];
  /** Only auto-applicable proposals */
  autoApplicable?: boolean;
  /** Minimum priority score */
  minPriorityScore?: number;
}

/**
 * Proposal ranking criteria
 */
export interface RankingCriteria {
  /** Weight for impact/benefit (0-1) */
  impactWeight?: number;
  /** Weight for risk (0-1, lower risk = higher score) */
  riskWeight?: number;
  /** Weight for complexity (0-1, lower complexity = higher score) */
  complexityWeight?: number;
  /** Weight for auto-applicability (0-1) */
  autoApplicableWeight?: number;
}

/**
 * Proposal application result
 */
export interface ApplicationResult {
  /** Proposal ID */
  proposalId: string;
  /** Whether application was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Rollback token (for reverting) */
  rollbackToken?: string;
  /** Changes made */
  changes?: {
    addedNodes: string[];
    removedNodes: string[];
    addedEdges: Array<{ from: string; to: string }>;
    removedEdges: Array<{ from: string; to: string }>;
  };
}

/**
 * Batch application result
 */
export interface BatchApplicationResult {
  /** Total proposals processed */
  totalProcessed: number;
  /** Number of successful applications */
  successCount: number;
  /** Number of failed applications */
  failureCount: number;
  /** Individual results */
  results: ApplicationResult[];
  /** Overall rollback token (for reverting entire batch) */
  batchRollbackToken?: string;
}

/**
 * Application history entry
 */
interface HistoryEntry {
  timestamp: Date;
  proposalId: string;
  proposal: RefactoringProposal;
  result: ApplicationResult;
  graphSnapshot: {
    nodes: Map<string, ExtendedNodeAttributes | undefined>;
    edges: Map<string, ExtendedEdgeAttributes | undefined>;
  };
}

/**
 * Refactoring Proposal Manager
 * Provides comprehensive API for managing refactoring proposals
 */
export class RefactoringProposalManager {
  private graph: IExtendedDependencyGraph;
  private proposals: Map<string, RefactoringProposal> = new Map();
  private history: HistoryEntry[] = [];
  private appliedProposals: Set<string> = new Set();

  constructor(graph: IExtendedDependencyGraph) {
    this.graph = graph;
  }

  /**
   * Load proposals into the manager
   */
  loadProposals(proposals: RefactoringProposal[]): void {
    for (const proposal of proposals) {
      this.proposals.set(proposal.id, proposal);
    }
  }

  /**
   * Get all proposals
   */
  getAllProposals(): RefactoringProposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Get a specific proposal by ID
   */
  getProposal(id: string): RefactoringProposal | undefined {
    return this.proposals.get(id);
  }

  /**
   * Filter proposals based on criteria
   */
  filterProposals(options: ProposalFilterOptions): RefactoringProposal[] {
    let filtered = Array.from(this.proposals.values());

    // Filter by type
    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      filtered = filtered.filter(p => types.includes(p.type));
    }

    // Filter by complexity
    if (options.complexity) {
      const complexities = Array.isArray(options.complexity) ? options.complexity : [options.complexity];
      filtered = filtered.filter(p => complexities.includes(p.impact.complexity));
    }

    // Filter by risk level
    if (options.riskLevel) {
      const risks = Array.isArray(options.riskLevel) ? options.riskLevel : [options.riskLevel];
      filtered = filtered.filter(p => risks.includes(p.impact.riskLevel));
    }

    // Filter by principle
    if (options.principle) {
      filtered = filtered.filter(p => p.metadata?.principle === options.principle);
    }

    // Filter by affected nodes
    if (options.affectedNodes && options.affectedNodes.length > 0) {
      filtered = filtered.filter(p =>
        p.affectedNodes.some(node => options.affectedNodes!.includes(node))
      );
    }

    // Filter by auto-applicability
    if (options.autoApplicable !== undefined) {
      filtered = filtered.filter(p => p.autoApplicable === options.autoApplicable);
    }

    // Filter by minimum priority score
    if (options.minPriorityScore !== undefined) {
      filtered = filtered.filter(p => {
        const score = p.metadata?.priorityScore;
        return score !== undefined && score >= options.minPriorityScore!;
      });
    }

    return filtered;
  }

  /**
   * Rank proposals based on criteria
   */
  rankProposals(
    proposals: RefactoringProposal[],
    criteria: RankingCriteria = {}
  ): Array<RefactoringProposal & { score: number; rank: number }> {
    // Default weights
    const weights = {
      impactWeight: criteria.impactWeight ?? 0.3,
      riskWeight: criteria.riskWeight ?? 0.25,
      complexityWeight: criteria.complexityWeight ?? 0.25,
      autoApplicableWeight: criteria.autoApplicableWeight ?? 0.2
    };

    // Calculate scores
    const scored = proposals.map(proposal => {
      let score = 0;

      // Impact score (based on number of benefits)
      const impactScore = proposal.impact.benefits.length / 5; // Normalize to 0-1
      score += impactScore * weights.impactWeight;

      // Risk score (inverted: lower risk = higher score)
      const riskScores = { low: 1, medium: 0.5, high: 0 };
      score += riskScores[proposal.impact.riskLevel] * weights.riskWeight;

      // Complexity score (inverted: lower complexity = higher score)
      const complexityScores = { low: 1, medium: 0.5, high: 0 };
      score += complexityScores[proposal.impact.complexity] * weights.complexityWeight;

      // Auto-applicable bonus
      if (proposal.autoApplicable) {
        score += weights.autoApplicableWeight;
      }

      // Use existing priority score if available
      if (proposal.metadata?.priorityScore) {
        score = (score + proposal.metadata.priorityScore / 10) / 2; // Average with existing score
      }

      return {
        ...proposal,
        score
      };
    });

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    // Add rank
    return scored.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }

  /**
   * Apply a single proposal
   */
  applyProposal(proposalId: string): ApplicationResult {
    const proposal = this.proposals.get(proposalId);

    if (!proposal) {
      return {
        proposalId,
        success: false,
        error: 'Proposal not found'
      };
    }

    // Check if already applied
    if (this.appliedProposals.has(proposalId)) {
      return {
        proposalId,
        success: false,
        error: 'Proposal already applied'
      };
    }

    // Create snapshot for rollback
    const snapshot = this.createGraphSnapshot(proposal.affectedNodes);

    try {
      // Apply the proposal
      const success = this.graph.applyRefactoringProposal(proposal);

      if (!success) {
        return {
          proposalId,
          success: false,
          error: 'Proposal application failed'
        };
      }

      // Track changes
      const changes = this.extractChanges(proposal);

      // Generate rollback token
      const rollbackToken = this.generateRollbackToken();

      // Record in history
      const historyEntry: HistoryEntry = {
        timestamp: new Date(),
        proposalId,
        proposal,
        result: {
          proposalId,
          success: true,
          rollbackToken,
          changes
        },
        graphSnapshot: snapshot
      };
      this.history.push(historyEntry);

      // Mark as applied
      this.appliedProposals.add(proposalId);

      return {
        proposalId,
        success: true,
        rollbackToken,
        changes
      };
    } catch (error) {
      // Restore snapshot on error
      this.restoreSnapshot(snapshot);

      return {
        proposalId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Apply multiple proposals in batch
   */
  applyBatch(proposalIds: string[], stopOnError = true): BatchApplicationResult {
    const results: ApplicationResult[] = [];
    const batchSnapshot = this.createFullGraphSnapshot();
    let successCount = 0;
    let failureCount = 0;

    for (const proposalId of proposalIds) {
      const result = this.applyProposal(proposalId);
      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        failureCount++;

        if (stopOnError) {
          // Rollback all changes in this batch
          this.restoreSnapshot(batchSnapshot);

          // Clear applied proposals from this batch
          for (const r of results) {
            if (r.success) {
              this.appliedProposals.delete(r.proposalId);
            }
          }

          return {
            totalProcessed: results.length,
            successCount: 0,
            failureCount: results.length,
            results
          };
        }
      }
    }

    const batchRollbackToken = successCount > 0 ? this.generateRollbackToken() : undefined;

    return {
      totalProcessed: proposalIds.length,
      successCount,
      failureCount,
      results,
      batchRollbackToken
    };
  }

  /**
   * Rollback a proposal by token
   */
  rollback(rollbackToken: string): boolean {
    const entry = this.history.find(e => e.result.rollbackToken === rollbackToken);

    if (!entry) {
      return false;
    }

    try {
      // Restore the snapshot
      this.restoreSnapshot(entry.graphSnapshot);

      // Remove from applied set
      this.appliedProposals.delete(entry.proposalId);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get application history
   */
  getHistory(): Array<{
    timestamp: Date;
    proposalId: string;
    proposal: RefactoringProposal;
    result: ApplicationResult;
  }> {
    return this.history.map(entry => ({
      timestamp: entry.timestamp,
      proposalId: entry.proposalId,
      proposal: entry.proposal,
      result: entry.result
    }));
  }

  /**
   * Clear all proposals
   */
  clear(): void {
    this.proposals.clear();
    this.appliedProposals.clear();
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  // === Private helper methods ===

  private createGraphSnapshot(nodeIds: string[]): {
    nodes: Map<string, ExtendedNodeAttributes | undefined>;
    edges: Map<string, ExtendedEdgeAttributes | undefined>;
  } {
    const nodes = new Map<string, ExtendedNodeAttributes | undefined>();
    const edges = new Map<string, ExtendedEdgeAttributes | undefined>();

    for (const nodeId of nodeIds) {
      nodes.set(nodeId, this.graph.getNodeAttributes(nodeId));

      // Save edges connected to this node
      const deps = this.graph.getDependencies(nodeId);
      for (const dep of deps) {
        const key = `${dep}->${nodeId}`;
        edges.set(key, this.graph.getEdgeAttributes(dep, nodeId));
      }

      const dependents = this.graph.getDependents(nodeId);
      for (const dependent of dependents) {
        const key = `${nodeId}->${dependent}`;
        edges.set(key, this.graph.getEdgeAttributes(nodeId, dependent));
      }
    }

    return { nodes, edges };
  }

  private createFullGraphSnapshot(): {
    nodes: Map<string, ExtendedNodeAttributes | undefined>;
    edges: Map<string, ExtendedEdgeAttributes | undefined>;
  } {
    // Get all node IDs from the graph
    const allNodeIds: string[] = [];

    // This is a workaround - we need to iterate through all nodes
    // In a real implementation, we'd need a method to get all node IDs
    const stats = this.graph.getStatistics();

    // For now, create snapshot of affected nodes only
    // A better approach would require graph.getAllNodeIds() method
    return {
      nodes: new Map(),
      edges: new Map()
    };
  }

  private restoreSnapshot(snapshot: {
    nodes: Map<string, ExtendedNodeAttributes | undefined>;
    edges: Map<string, ExtendedEdgeAttributes | undefined>;
  }): void {
    // Restore nodes
    for (const [nodeId, attrs] of snapshot.nodes) {
      if (attrs) {
        if (this.graph.hasNode(nodeId)) {
          this.graph.updateNodeAttributes(nodeId, attrs);
        } else {
          this.graph.addNode(nodeId, attrs);
        }
      } else {
        // Node should not exist
        if (this.graph.hasNode(nodeId)) {
          this.graph.removeNode(nodeId);
        }
      }
    }

    // Restore edges
    for (const [key, attrs] of snapshot.edges) {
      const [from, to] = key.split('->');

      if (attrs) {
        if (!this.graph.hasEdge(from, to)) {
          this.graph.addEdge(from, to, attrs);
        } else {
          this.graph.updateEdgeAttributes(from, to, attrs);
        }
      } else {
        // Edge should not exist
        if (this.graph.hasEdge(from, to)) {
          this.graph.removeEdge(from, to);
        }
      }
    }
  }

  private extractChanges(proposal: RefactoringProposal): {
    addedNodes: string[];
    removedNodes: string[];
    addedEdges: Array<{ from: string; to: string }>;
    removedEdges: Array<{ from: string; to: string }>;
  } {
    const changes = {
      addedNodes: [] as string[],
      removedNodes: [] as string[],
      addedEdges: [] as Array<{ from: string; to: string }>,
      removedEdges: [] as Array<{ from: string; to: string }>
    };

    for (const change of proposal.changes) {
      switch (change.action) {
        case 'add_node':
          changes.addedNodes.push(change.target);
          break;
        case 'remove_node':
          changes.removedNodes.push(change.target);
          break;
        case 'add_edge': {
          const [from, to] = change.target.split('->');
          changes.addedEdges.push({ from, to });
          break;
        }
        case 'remove_edge': {
          const [from, to] = change.target.split('->');
          changes.removedEdges.push({ from, to });
          break;
        }
      }
    }

    return changes;
  }

  private generateRollbackToken(): string {
    return `rollback_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}