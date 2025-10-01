/**
 * Refactoring Proposal Manager Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtendedDependencyGraph } from '../ExtendedDependencyGraph';
import {
  RefactoringProposalManager,
  ProposalFilterOptions,
  RankingCriteria
} from '../RefactoringProposalManager';
import { RefactoringProposal } from '../ExtendedDependencyGraph.interface';
import { RPGNodeType, RPGNodeLevel, RPGEdgeType } from '../../rpg/types';

describe('RefactoringProposalManager', () => {
  let graph: ExtendedDependencyGraph;
  let manager: RefactoringProposalManager;

  beforeEach(() => {
    graph = new ExtendedDependencyGraph();
    manager = new RefactoringProposalManager(graph);
  });

  describe('Proposal Management', () => {
    it('should load and retrieve proposals', () => {
      const proposals: RefactoringProposal[] = [
        {
          id: 'proposal1',
          type: 'extract_interface',
          description: 'Test proposal 1',
          explanation: 'Explanation 1',
          affectedNodes: ['node1'],
          changes: [],
          impact: {
            complexity: 'low',
            riskLevel: 'low',
            benefits: ['benefit1'],
            drawbacks: ['drawback1']
          },
          autoApplicable: false
        },
        {
          id: 'proposal2',
          type: 'split_node',
          description: 'Test proposal 2',
          explanation: 'Explanation 2',
          affectedNodes: ['node2'],
          changes: [],
          impact: {
            complexity: 'high',
            riskLevel: 'medium',
            benefits: ['benefit1', 'benefit2'],
            drawbacks: ['drawback1']
          },
          autoApplicable: true
        }
      ];

      manager.loadProposals(proposals);

      expect(manager.getAllProposals()).toHaveLength(2);
      expect(manager.getProposal('proposal1')).toEqual(proposals[0]);
      expect(manager.getProposal('proposal2')).toEqual(proposals[1]);
    });

    it('should clear all proposals', () => {
      const proposals: RefactoringProposal[] = [
        {
          id: 'proposal1',
          type: 'extract_interface',
          description: 'Test',
          explanation: 'Test',
          affectedNodes: [],
          changes: [],
          impact: {
            complexity: 'low',
            riskLevel: 'low',
            benefits: [],
            drawbacks: []
          },
          autoApplicable: false
        }
      ];

      manager.loadProposals(proposals);
      expect(manager.getAllProposals()).toHaveLength(1);

      manager.clear();
      expect(manager.getAllProposals()).toHaveLength(0);
    });
  });

  describe('Proposal Filtering', () => {
    beforeEach(() => {
      const proposals: RefactoringProposal[] = [
        {
          id: 'dip1',
          type: 'extract_interface',
          description: 'DIP proposal',
          explanation: 'DIP',
          affectedNodes: ['node1'],
          changes: [],
          impact: {
            complexity: 'low',
            riskLevel: 'low',
            benefits: ['b1'],
            drawbacks: ['d1']
          },
          autoApplicable: false,
          metadata: { principle: 'DIP' }
        },
        {
          id: 'isp1',
          type: 'split_node',
          description: 'ISP proposal',
          explanation: 'ISP',
          affectedNodes: ['node2'],
          changes: [],
          impact: {
            complexity: 'high',
            riskLevel: 'medium',
            benefits: ['b1', 'b2'],
            drawbacks: ['d1']
          },
          autoApplicable: true,
          metadata: { principle: 'ISP' }
        },
        {
          id: 'srp1',
          type: 'split_node',
          description: 'SRP proposal',
          explanation: 'SRP',
          affectedNodes: ['node3'],
          changes: [],
          impact: {
            complexity: 'medium',
            riskLevel: 'high',
            benefits: ['b1'],
            drawbacks: ['d1', 'd2']
          },
          autoApplicable: false,
          metadata: { principle: 'SRP' }
        }
      ];

      manager.loadProposals(proposals);
    });

    it('should filter by type', () => {
      const filtered = manager.filterProposals({ type: 'extract_interface' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('dip1');
    });

    it('should filter by complexity', () => {
      const filtered = manager.filterProposals({ complexity: 'low' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('dip1');
    });

    it('should filter by risk level', () => {
      const filtered = manager.filterProposals({ riskLevel: ['low', 'medium'] });
      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id).sort()).toEqual(['dip1', 'isp1']);
    });

    it('should filter by principle', () => {
      const filtered = manager.filterProposals({ principle: 'DIP' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('dip1');
    });

    it('should filter by auto-applicability', () => {
      const filtered = manager.filterProposals({ autoApplicable: true });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('isp1');
    });

    it('should filter by affected nodes', () => {
      const filtered = manager.filterProposals({ affectedNodes: ['node1', 'node2'] });
      expect(filtered).toHaveLength(2);
      expect(filtered.map(p => p.id).sort()).toEqual(['dip1', 'isp1']);
    });

    it('should apply multiple filters', () => {
      const filtered = manager.filterProposals({
        type: 'split_node',
        complexity: ['medium', 'high'],
        autoApplicable: false
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('srp1');
    });
  });

  describe('Proposal Ranking', () => {
    beforeEach(() => {
      const proposals: RefactoringProposal[] = [
        {
          id: 'low_risk_low_complexity',
          type: 'extract_interface',
          description: 'Low risk, low complexity',
          explanation: 'Test',
          affectedNodes: [],
          changes: [],
          impact: {
            complexity: 'low',
            riskLevel: 'low',
            benefits: ['b1', 'b2', 'b3', 'b4'],
            drawbacks: ['d1']
          },
          autoApplicable: true
        },
        {
          id: 'high_risk_high_complexity',
          type: 'split_node',
          description: 'High risk, high complexity',
          explanation: 'Test',
          affectedNodes: [],
          changes: [],
          impact: {
            complexity: 'high',
            riskLevel: 'high',
            benefits: ['b1'],
            drawbacks: ['d1', 'd2', 'd3']
          },
          autoApplicable: false
        },
        {
          id: 'medium_risk_medium_complexity',
          type: 'reverse_dependency',
          description: 'Medium risk, medium complexity',
          explanation: 'Test',
          affectedNodes: [],
          changes: [],
          impact: {
            complexity: 'medium',
            riskLevel: 'medium',
            benefits: ['b1', 'b2'],
            drawbacks: ['d1']
          },
          autoApplicable: false
        }
      ];

      manager.loadProposals(proposals);
    });

    it('should rank proposals by default criteria', () => {
      const all = manager.getAllProposals();
      const ranked = manager.rankProposals(all);

      expect(ranked).toHaveLength(3);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].rank).toBe(3);

      // Low risk + low complexity + auto-applicable should rank highest
      expect(ranked[0].id).toBe('low_risk_low_complexity');
      expect(ranked[2].id).toBe('high_risk_high_complexity');
    });

    it('should rank with custom criteria', () => {
      const all = manager.getAllProposals();
      const ranked = manager.rankProposals(all, {
        impactWeight: 0.5,
        riskWeight: 0.5,
        complexityWeight: 0,
        autoApplicableWeight: 0
      });

      expect(ranked).toHaveLength(3);
      // With these weights, the proposal with most benefits and low risk should win
      expect(ranked[0].id).toBe('low_risk_low_complexity');
    });

    it('should assign scores to all proposals', () => {
      const all = manager.getAllProposals();
      const ranked = manager.rankProposals(all);

      ranked.forEach(proposal => {
        expect(proposal.score).toBeGreaterThanOrEqual(0);
        expect(proposal.score).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Proposal Application', () => {
    it('should apply a simple proposal', () => {
      // Setup graph
      graph.addNode('node1', { type: RPGNodeType.MODULE, level: RPGNodeLevel.MODULE });

      const proposal: RefactoringProposal = {
        id: 'test_proposal',
        type: 'extract_interface',
        description: 'Extract interface',
        explanation: 'Test',
        affectedNodes: ['node1'],
        changes: [
          {
            action: 'add_node',
            target: 'node1_Interface',
            details: {
              type: RPGNodeType.INTERFACE,
              level: RPGNodeLevel.IMPLEMENTATION
            }
          }
        ],
        impact: {
          complexity: 'low',
          riskLevel: 'low',
          benefits: [],
          drawbacks: []
        },
        autoApplicable: true
      };

      manager.loadProposals([proposal]);
      const result = manager.applyProposal('test_proposal');

      expect(result.success).toBe(true);
      expect(result.rollbackToken).toBeDefined();
      expect(graph.hasNode('node1_Interface')).toBe(true);
    });

    it('should fail to apply non-existent proposal', () => {
      const result = manager.applyProposal('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Proposal not found');
    });

    it('should not apply the same proposal twice', () => {
      graph.addNode('node1', { type: RPGNodeType.MODULE });

      const proposal: RefactoringProposal = {
        id: 'test_proposal',
        type: 'extract_interface',
        description: 'Test',
        explanation: 'Test',
        affectedNodes: ['node1'],
        changes: [
          {
            action: 'add_node',
            target: 'node1_Interface',
            details: { type: RPGNodeType.INTERFACE }
          }
        ],
        impact: {
          complexity: 'low',
          riskLevel: 'low',
          benefits: [],
          drawbacks: []
        },
        autoApplicable: true
      };

      manager.loadProposals([proposal]);

      const result1 = manager.applyProposal('test_proposal');
      expect(result1.success).toBe(true);

      const result2 = manager.applyProposal('test_proposal');
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Proposal already applied');
    });
  });

  describe('Batch Application', () => {
    beforeEach(() => {
      graph.addNode('node1', { type: RPGNodeType.MODULE });
      graph.addNode('node2', { type: RPGNodeType.MODULE });
      graph.addNode('node3', { type: RPGNodeType.MODULE });
    });

    it('should apply multiple proposals in batch', () => {
      const proposals: RefactoringProposal[] = [
        {
          id: 'p1',
          type: 'extract_interface',
          description: 'Test 1',
          explanation: 'Test',
          affectedNodes: ['node1'],
          changes: [
            {
              action: 'add_node',
              target: 'node1_Interface',
              details: { type: RPGNodeType.INTERFACE }
            }
          ],
          impact: { complexity: 'low', riskLevel: 'low', benefits: [], drawbacks: [] },
          autoApplicable: true
        },
        {
          id: 'p2',
          type: 'extract_interface',
          description: 'Test 2',
          explanation: 'Test',
          affectedNodes: ['node2'],
          changes: [
            {
              action: 'add_node',
              target: 'node2_Interface',
              details: { type: RPGNodeType.INTERFACE }
            }
          ],
          impact: { complexity: 'low', riskLevel: 'low', benefits: [], drawbacks: [] },
          autoApplicable: true
        }
      ];

      manager.loadProposals(proposals);
      const result = manager.applyBatch(['p1', 'p2']);

      expect(result.totalProcessed).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(graph.hasNode('node1_Interface')).toBe(true);
      expect(graph.hasNode('node2_Interface')).toBe(true);
    });

    it('should handle partial failures with stopOnError=false', () => {
      const proposals: RefactoringProposal[] = [
        {
          id: 'p1',
          type: 'extract_interface',
          description: 'Valid',
          explanation: 'Test',
          affectedNodes: ['node1'],
          changes: [
            {
              action: 'add_node',
              target: 'node1_Interface',
              details: { type: RPGNodeType.INTERFACE }
            }
          ],
          impact: { complexity: 'low', riskLevel: 'low', benefits: [], drawbacks: [] },
          autoApplicable: true
        },
        {
          id: 'p2',
          type: 'extract_interface',
          description: 'Invalid',
          explanation: 'Test',
          affectedNodes: ['nonexistent'],
          changes: [],
          impact: { complexity: 'low', riskLevel: 'low', benefits: [], drawbacks: [] },
          autoApplicable: false
        },
        {
          id: 'p3',
          type: 'extract_interface',
          description: 'Valid',
          explanation: 'Test',
          affectedNodes: ['node3'],
          changes: [
            {
              action: 'add_node',
              target: 'node3_Interface',
              details: { type: RPGNodeType.INTERFACE }
            }
          ],
          impact: { complexity: 'low', riskLevel: 'low', benefits: [], drawbacks: [] },
          autoApplicable: true
        }
      ];

      manager.loadProposals(proposals);
      const result = manager.applyBatch(['p1', 'p2', 'p3'], false);

      expect(result.totalProcessed).toBe(3);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
    });
  });

  describe('History Management', () => {
    it('should track application history', () => {
      graph.addNode('node1', { type: RPGNodeType.MODULE });

      const proposal: RefactoringProposal = {
        id: 'test_proposal',
        type: 'extract_interface',
        description: 'Test',
        explanation: 'Test',
        affectedNodes: ['node1'],
        changes: [
          {
            action: 'add_node',
            target: 'node1_Interface',
            details: { type: RPGNodeType.INTERFACE }
          }
        ],
        impact: { complexity: 'low', riskLevel: 'low', benefits: [], drawbacks: [] },
        autoApplicable: true
      };

      manager.loadProposals([proposal]);
      manager.applyProposal('test_proposal');

      const history = manager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].proposalId).toBe('test_proposal');
      expect(history[0].result.success).toBe(true);
      expect(history[0].timestamp).toBeInstanceOf(Date);
    });

    it('should clear history', () => {
      graph.addNode('node1', { type: RPGNodeType.MODULE });

      const proposal: RefactoringProposal = {
        id: 'test_proposal',
        type: 'extract_interface',
        description: 'Test',
        explanation: 'Test',
        affectedNodes: ['node1'],
        changes: [
          {
            action: 'add_node',
            target: 'node1_Interface',
            details: { type: RPGNodeType.INTERFACE }
          }
        ],
        impact: { complexity: 'low', riskLevel: 'low', benefits: [], drawbacks: [] },
        autoApplicable: true
      };

      manager.loadProposals([proposal]);
      manager.applyProposal('test_proposal');

      expect(manager.getHistory()).toHaveLength(1);

      manager.clearHistory();
      expect(manager.getHistory()).toHaveLength(0);
    });
  });
});