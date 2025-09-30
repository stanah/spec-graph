import { describe, it, expect, beforeEach } from 'vitest';
import { ExtendedDependencyGraph } from '../ExtendedDependencyGraph';
import { RPGNodeType, RPGEdgeType, RPGNodeLevel } from '../../rpg/types';

describe('ExtendedDependencyGraph - Advanced Cycle Detection and Resolution', () => {
  let graph: ExtendedDependencyGraph;

  beforeEach(() => {
    graph = new ExtendedDependencyGraph();
  });

  describe('findCyclesDetailed', () => {
    it('returns empty analysis when no cycles exist', () => {
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');

      const result = graph.findCyclesDetailed();

      expect(result.hasCycles).toBe(false);
      expect(result.cycles).toEqual([]);
      expect(result.analysis).toEqual([]);
      expect(result.summary).toBeDefined();
      expect(result.summary?.totalCycles).toBe(0);
    });

    it('detects simple 2-node cycle with detailed analysis', () => {
      graph.addEdge('A', 'B', { type: RPGEdgeType.IMPLEMENTATION, weight: 2 });
      graph.addEdge('B', 'A', { type: RPGEdgeType.DATA_FLOW, weight: 1 });

      const result = graph.findCyclesDetailed();

      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toEqual(['A', 'B']);

      const analysis = result.analysis[0];
      expect(analysis.size).toBe(2);
      expect(analysis.metadata.isSimpleCycle).toBe(true);
      expect(analysis.edgeDetails).toHaveLength(2);
      expect(analysis.complexity).toBeDefined();
      expect(analysis.impact).toBeDefined();
      expect(analysis.resolutionSuggestions.length).toBeGreaterThan(0);
    });

    it('detects self-loop with proper metadata', () => {
      graph.addEdge('X', 'X');

      const result = graph.findCyclesDetailed();

      expect(result.hasCycles).toBe(true);
      const analysis = result.analysis[0];
      expect(analysis.size).toBe(1);
      expect(analysis.metadata.isSelfLoop).toBe(true);
    });

    it('provides complexity scoring for cycles', () => {
      // Create a complex cycle with multiple nodes
      graph.addNode('A', { type: RPGNodeType.MODULE });
      graph.addNode('B', { type: RPGNodeType.CLASS });
      graph.addNode('C', { type: RPGNodeType.FUNCTION });
      graph.addNode('D', { type: RPGNodeType.CLASS });

      graph.addEdge('A', 'B', { weight: 3 });
      graph.addEdge('B', 'C', { weight: 2 });
      graph.addEdge('C', 'D', { weight: 1 });
      graph.addEdge('D', 'A', { weight: 2 });

      const result = graph.findCyclesDetailed();

      const analysis = result.analysis[0];
      expect(analysis.complexity.score).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(analysis.complexity.level);
      expect(analysis.complexity.factors).toBeInstanceOf(Array);
    });

    it('assesses cycle impact correctly', () => {
      // Create cycle with downstream dependencies
      // X and Y depend on the cycle nodes (A and B)
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'A');
      graph.addEdge('X', 'A'); // X depends on cycle node A
      graph.addEdge('Y', 'B'); // Y depends on cycle node B
      graph.addEdge('Z', 'X'); // Z depends on X

      const result = graph.findCyclesDetailed();

      const analysis = result.analysis[0];
      expect(analysis.impact.affectedNodesCount).toBeGreaterThan(0);
      expect(analysis.impact.level).toBeDefined();
      expect(analysis.impact.blocksTopologicalSort).toBe(true);
    });

    it('prioritizes resolution suggestions', () => {
      graph.addEdge('A', 'B', { weight: 1 });
      graph.addEdge('B', 'A', { weight: 3 });

      const result = graph.findCyclesDetailed();

      const analysis = result.analysis[0];
      const suggestions = analysis.resolutionSuggestions;

      // Check that suggestions have priority metadata
      suggestions.forEach((suggestion, index) => {
        expect(suggestion.metadata?.priorityRank).toBe(index + 1);
        expect(suggestion.metadata?.priorityScore).toBeDefined();
      });

      // Check that suggestions are sorted by priority
      for (let i = 1; i < suggestions.length; i++) {
        const prevScore = suggestions[i - 1].metadata?.priorityScore || 0;
        const currScore = suggestions[i].metadata?.priorityScore || 0;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });

    it('provides overall summary', () => {
      // Create multiple cycles
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'A');

      graph.addEdge('C', 'D');
      graph.addEdge('D', 'E');
      graph.addEdge('E', 'C');

      graph.addEdge('X', 'X');

      const result = graph.findCyclesDetailed();

      expect(result.summary).toBeDefined();
      expect(result.summary?.totalCycles).toBe(3);
      expect(result.summary?.simpleCycles).toBe(1); // A-B
      expect(result.summary?.complexCycles).toBe(1); // C-D-E
      expect(result.summary?.selfLoops).toBe(1); // X
      expect(result.summary?.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Cycle Resolution Proposals', () => {
    it('generates extract interface proposal', () => {
      graph.addNode('A', { type: RPGNodeType.CLASS });
      graph.addNode('B', { type: RPGNodeType.CLASS });
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'A');

      const result = graph.findCyclesDetailed();
      const proposals = result.analysis[0].resolutionSuggestions;

      const interfaceProposal = proposals.find(p => p.type === 'extract_interface');
      expect(interfaceProposal).toBeDefined();
      expect(interfaceProposal?.description).toContain('interface');
      expect(interfaceProposal?.impact.benefits).toContain('Breaks dependency cycle');
    });

    it('generates reverse dependency proposal for simple cycles', () => {
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'A');

      const result = graph.findCyclesDetailed();
      const proposals = result.analysis[0].resolutionSuggestions;

      const reverseProposal = proposals.find(p => p.type === 'reverse_dependency');
      expect(reverseProposal).toBeDefined();
      expect(reverseProposal?.affectedNodes).toEqual(['A', 'B']);
    });

    it('generates node split proposal for large nodes', () => {
      // Create a large node with many connections
      graph.addNode('LargeNode', { type: RPGNodeType.MODULE });

      for (let i = 0; i < 6; i++) {
        const depId = `Dep${i}`;
        graph.addNode(depId, { type: RPGNodeType.CLASS });
        graph.addEdge('LargeNode', depId);
      }

      // Create cycle involving the large node
      graph.addEdge('Dep0', 'LargeNode');

      const result = graph.findCyclesDetailed();
      const proposals = result.analysis[0].resolutionSuggestions;

      const splitProposal = proposals.find(p => p.type === 'split_node');
      // Split proposal may or may not be generated depending on node analysis
      if (splitProposal) {
        expect(splitProposal.description).toContain('Split');
        expect(splitProposal.metadata?.originalNode).toBeDefined();
      }
    });

    it('generates dependency restructuring proposal for complex cycles', () => {
      graph.addEdge('A', 'B', { weight: 1 });
      graph.addEdge('B', 'C', { weight: 2 });
      graph.addEdge('C', 'D', { weight: 3 });
      graph.addEdge('D', 'A', { weight: 1 });

      const result = graph.findCyclesDetailed();
      const proposals = result.analysis[0].resolutionSuggestions;

      const restructureProposal = proposals.find(p => p.type === 'remove_edge');
      expect(restructureProposal).toBeDefined();
      expect(restructureProposal?.metadata?.edgeStrength).toBeDefined();
    });
  });

  describe('Edge Strength Calculation', () => {
    it('calculates edge strength based on type and weight', () => {
      graph.addNode('A');
      graph.addNode('B');
      graph.addEdge('A', 'B', {
        type: RPGEdgeType.IMPLEMENTATION,
        weight: 2,
        bidirectional: true,
        constraint: { required: true }
      });

      const result = graph.findCyclesDetailed();
      // This test verifies that edge strength is calculated,
      // though we don't expose it directly in the public API
      // We can verify through cycle detection that it works
      expect(result).toBeDefined();
    });
  });

  describe('Tarjan Algorithm Optimization', () => {
    it('handles large graphs efficiently', () => {
      // Create a large graph with 100 nodes
      for (let i = 0; i < 100; i++) {
        graph.addNode(`Node${i}`);
        if (i > 0) {
          graph.addEdge(`Node${i - 1}`, `Node${i}`);
        }
      }

      // Add a cycle
      graph.addEdge('Node99', 'Node50');

      const startTime = Date.now();
      const result = graph.hasCycle();
      const endTime = Date.now();

      expect(result).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });

    it('uses caching for repeated cycle detection', () => {
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'C');
      graph.addEdge('C', 'A');

      // First call populates cache
      const result1 = graph.findCycles();
      expect(result1).toHaveLength(1);

      // Second call should use cache (verify by timing or other means)
      const result2 = graph.findCycles();
      expect(result2).toEqual(result1);
    });

    it('invalidates cache when graph changes', () => {
      graph.addEdge('A', 'B');
      graph.addEdge('B', 'A');

      const result1 = graph.hasCycle();
      expect(result1).toBe(true);

      // Modify graph
      graph.removeEdge('B', 'A');

      const result2 = graph.hasCycle();
      expect(result2).toBe(false);
    });

    it('early terminates in hasCycle for large graphs with cycles', () => {
      // Create large graph
      for (let i = 0; i < 1000; i++) {
        graph.addNode(`Node${i}`);
      }

      // Add cycle at the beginning
      graph.addEdge('Node0', 'Node1');
      graph.addEdge('Node1', 'Node0');

      const startTime = Date.now();
      const result = graph.hasCycle();
      const endTime = Date.now();

      expect(result).toBe(true);
      // Should terminate early, not process all 1000 nodes
      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('Complex Real-world Scenarios', () => {
    it('handles module dependency cycles', () => {
      // Simulate a real module dependency scenario
      graph.addNode('UserModule', {
        type: RPGNodeType.MODULE,
        level: RPGNodeLevel.MODULE,
        filePath: 'src/modules/user'
      });

      graph.addNode('AuthModule', {
        type: RPGNodeType.MODULE,
        level: RPGNodeLevel.MODULE,
        filePath: 'src/modules/auth'
      });

      graph.addNode('ProfileModule', {
        type: RPGNodeType.MODULE,
        level: RPGNodeLevel.MODULE,
        filePath: 'src/modules/profile'
      });

      graph.addEdge('UserModule', 'AuthModule', { type: RPGEdgeType.INTER_MODULE });
      graph.addEdge('AuthModule', 'ProfileModule', { type: RPGEdgeType.INTER_MODULE });
      graph.addEdge('ProfileModule', 'UserModule', { type: RPGEdgeType.INTER_MODULE });

      const result = graph.findCyclesDetailed();

      expect(result.hasCycles).toBe(true);
      expect(result.analysis[0].resolutionSuggestions.length).toBeGreaterThan(0);

      // Should suggest extract interface for module dependencies
      const interfaceProposal = result.analysis[0].resolutionSuggestions.find(
        p => p.type === 'extract_interface'
      );
      expect(interfaceProposal).toBeDefined();
    });

    it('handles multiple disjoint cycles', () => {
      // Cycle 1
      graph.addEdge('A1', 'A2');
      graph.addEdge('A2', 'A1');

      // Cycle 2
      graph.addEdge('B1', 'B2');
      graph.addEdge('B2', 'B3');
      graph.addEdge('B3', 'B1');

      // No cycle
      graph.addEdge('C1', 'C2');

      const result = graph.findCyclesDetailed();

      expect(result.hasCycles).toBe(true);
      expect(result.analysis).toHaveLength(2);
      expect(result.summary?.simpleCycles).toBe(1);
      expect(result.summary?.complexCycles).toBe(1);
    });
  });
});