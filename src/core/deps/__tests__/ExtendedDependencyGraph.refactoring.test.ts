/**
 * Extended Dependency Graph - Advanced Refactoring Proposals Tests
 * Tests for DIP, ISP, and SRP violation detection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ExtendedDependencyGraph } from '../ExtendedDependencyGraph';
import { RPGNodeType, RPGNodeLevel, RPGEdgeType } from '../../rpg/types';

describe('ExtendedDependencyGraph - Advanced Refactoring Proposals', () => {
  let graph: ExtendedDependencyGraph;

  beforeEach(() => {
    graph = new ExtendedDependencyGraph();
  });

  describe('DIP (Dependency Inversion Principle) Violation Detection', () => {
    it('should detect high-level module depending on concrete low-level module', () => {
      // High-level module
      graph.addNode('HighLevelModule', {
        type: RPGNodeType.MODULE,
        level: RPGNodeLevel.MODULE
      });

      // Low-level concrete module
      graph.addNode('LowLevelModule', {
        type: RPGNodeType.CLASS,
        level: RPGNodeLevel.IMPLEMENTATION
      });

      // High-level depends on concrete low-level (DIP violation)
      graph.addEdge('LowLevelModule', 'HighLevelModule', {
        type: RPGEdgeType.IMPLEMENTATION
      });

      const proposals = graph.generateRefactoringProposals();

      const dipViolations = proposals.filter(
        p => p.metadata?.principle === 'DIP'
      );

      expect(dipViolations.length).toBeGreaterThan(0);

      const violation = dipViolations[0];
      expect(violation.type).toBe('extract_interface');
      expect(violation.description).toContain('DIP');
      expect(violation.affectedNodes).toContain('HighLevelModule');
      expect(violation.affectedNodes).toContain('LowLevelModule');
    });

    it('should not flag abstraction dependencies as DIP violations', () => {
      // High-level module
      graph.addNode('HighLevelModule', {
        type: RPGNodeType.MODULE,
        level: RPGNodeLevel.MODULE
      });

      // Interface (abstraction)
      graph.addNode('ILowLevelInterface', {
        type: RPGNodeType.INTERFACE,
        level: RPGNodeLevel.IMPLEMENTATION
      });

      // High-level depends on interface (correct)
      graph.addEdge('ILowLevelInterface', 'HighLevelModule', {
        type: RPGEdgeType.IMPLEMENTATION
      });

      const proposals = graph.generateRefactoringProposals();

      const dipViolations = proposals.filter(
        p => p.metadata?.principle === 'DIP' &&
             p.affectedNodes.includes('HighLevelModule')
      );

      expect(dipViolations).toHaveLength(0);
    });

    it('should suggest interface extraction for DIP violations', () => {
      graph.addNode('HighLevelModule', {
        type: RPGNodeType.FEATURE,
        level: RPGNodeLevel.MODULE
      });

      graph.addNode('ConcreteImpl1', {
        type: RPGNodeType.CLASS,
        level: RPGNodeLevel.IMPLEMENTATION
      });

      graph.addNode('ConcreteImpl2', {
        type: RPGNodeType.CLASS,
        level: RPGNodeLevel.IMPLEMENTATION
      });

      graph.addEdge('ConcreteImpl1', 'HighLevelModule');
      graph.addEdge('ConcreteImpl2', 'HighLevelModule');

      const proposals = graph.generateRefactoringProposals();
      const dipProposal = proposals.find(p => p.metadata?.principle === 'DIP');

      expect(dipProposal).toBeDefined();
      expect(dipProposal?.changes.some(c => c.action === 'add_node' && c.target.includes('Interface'))).toBe(true);
      expect(dipProposal?.impact.benefits).toContain('Follows Dependency Inversion Principle');
    });
  });

  describe('ISP (Interface Segregation Principle) Violation Detection', () => {
    it('should detect fat interface with many members', () => {
      // Create a fat interface
      graph.addNode('FatInterface', {
        type: RPGNodeType.INTERFACE,
        level: RPGNodeLevel.IMPLEMENTATION
      });

      // Add many children (methods)
      for (let i = 0; i < 6; i++) {
        const methodId = `method${i}`;
        graph.addNode(methodId, {
          type: RPGNodeType.FUNCTION,
          level: RPGNodeLevel.IMPLEMENTATION,
          parentId: 'FatInterface'
        });
      }

      // Add multiple dependents
      for (let i = 0; i < 4; i++) {
        const clientId = `client${i}`;
        graph.addNode(clientId, {
          type: RPGNodeType.CLASS,
          level: RPGNodeLevel.IMPLEMENTATION
        });
        graph.addEdge('FatInterface', clientId);
      }

      const proposals = graph.generateRefactoringProposals();

      const ispViolations = proposals.filter(
        p => p.metadata?.principle === 'ISP'
      );

      expect(ispViolations.length).toBeGreaterThan(0);

      const violation = ispViolations[0];
      expect(violation.type).toBe('split_node');
      expect(violation.description).toContain('ISP');
      expect(violation.affectedNodes).toContain('FatInterface');
    });

    it('should not flag small interfaces as ISP violations', () => {
      // Create a small interface
      graph.addNode('SmallInterface', {
        type: RPGNodeType.INTERFACE,
        level: RPGNodeLevel.IMPLEMENTATION
      });

      // Add only 2 methods
      graph.addNode('method1', {
        type: RPGNodeType.FUNCTION,
        parentId: 'SmallInterface'
      });
      graph.addNode('method2', {
        type: RPGNodeType.FUNCTION,
        parentId: 'SmallInterface'
      });

      // Add a client
      graph.addNode('client', {
        type: RPGNodeType.CLASS
      });
      graph.addEdge('SmallInterface', 'client');

      const proposals = graph.generateRefactoringProposals();

      const ispViolations = proposals.filter(
        p => p.metadata?.principle === 'ISP' &&
             p.affectedNodes.includes('SmallInterface')
      );

      expect(ispViolations).toHaveLength(0);
    });

    it('should suggest splitting fat interface into focused interfaces', () => {
      // Create fat interface with different method categories
      graph.addNode('FatInterface', {
        type: RPGNodeType.INTERFACE,
        level: RPGNodeLevel.IMPLEMENTATION
      });

      // Add read methods
      ['readData', 'getData', 'fetchData'].forEach(name => {
        graph.addNode(name, {
          type: RPGNodeType.FUNCTION,
          parentId: 'FatInterface'
        });
      });

      // Add write methods
      ['writeData', 'setData', 'updateData'].forEach(name => {
        graph.addNode(name, {
          type: RPGNodeType.FUNCTION,
          parentId: 'FatInterface'
        });
      });

      // Add clients
      ['client1', 'client2', 'client3'].forEach(name => {
        graph.addNode(name, { type: RPGNodeType.CLASS });
        graph.addEdge('FatInterface', name);
      });

      const proposals = graph.generateRefactoringProposals();
      const ispProposal = proposals.find(p => p.metadata?.principle === 'ISP');

      expect(ispProposal).toBeDefined();
      expect(ispProposal?.metadata?.splitCount).toBeGreaterThan(1);
      expect(ispProposal?.impact.benefits).toContain('Follows Interface Segregation Principle');
    });
  });

  describe('SRP (Single Responsibility Principle) Violation Detection', () => {
    it('should detect class with multiple responsibilities', () => {
      // Create a class with many children and dependencies
      graph.addNode('GodClass', {
        type: RPGNodeType.CLASS,
        level: RPGNodeLevel.IMPLEMENTATION
      });

      // Add many children (8+)
      for (let i = 0; i < 10; i++) {
        graph.addNode(`method${i}`, {
          type: RPGNodeType.FUNCTION,
          parentId: 'GodClass'
        });
      }

      // Add many dependencies (6+)
      for (let i = 0; i < 7; i++) {
        graph.addNode(`dep${i}`, {
          type: RPGNodeType.CLASS
        });
        graph.addEdge(`dep${i}`, 'GodClass');
      }

      const proposals = graph.generateRefactoringProposals();

      const srpViolations = proposals.filter(
        p => p.metadata?.principle === 'SRP'
      );

      expect(srpViolations.length).toBeGreaterThan(0);

      const violation = srpViolations[0];
      expect(violation.type).toBe('split_node');
      expect(violation.description).toContain('responsibilities');
      expect(violation.affectedNodes).toContain('GodClass');
    });

    it('should not flag focused classes as SRP violations', () => {
      // Create a focused class
      graph.addNode('FocusedClass', {
        type: RPGNodeType.CLASS,
        level: RPGNodeLevel.IMPLEMENTATION
      });

      // Add few methods
      for (let i = 0; i < 3; i++) {
        graph.addNode(`method${i}`, {
          type: RPGNodeType.FUNCTION,
          parentId: 'FocusedClass'
        });
      }

      // Add few dependencies
      for (let i = 0; i < 2; i++) {
        graph.addNode(`dep${i}`, {
          type: RPGNodeType.CLASS
        });
        graph.addEdge(`dep${i}`, 'FocusedClass');
      }

      const proposals = graph.generateRefactoringProposals();

      const srpViolations = proposals.filter(
        p => p.metadata?.principle === 'SRP' &&
             p.affectedNodes.includes('FocusedClass')
      );

      expect(srpViolations).toHaveLength(0);
    });

    it('should suggest splitting by responsibilities', () => {
      // Create god class
      graph.addNode('GodClass', {
        type: RPGNodeType.CLASS,
        level: RPGNodeLevel.IMPLEMENTATION
      });

      // Add children and dependencies
      for (let i = 0; i < 10; i++) {
        graph.addNode(`method${i}`, {
          type: RPGNodeType.FUNCTION,
          parentId: 'GodClass'
        });
      }

      for (let i = 0; i < 7; i++) {
        graph.addNode(`dep${i}`, {
          type: RPGNodeType.MODULE
        });
        graph.addEdge(`dep${i}`, 'GodClass');
      }

      const proposals = graph.generateRefactoringProposals();
      const srpProposal = proposals.find(p => p.metadata?.principle === 'SRP');

      expect(srpProposal).toBeDefined();
      expect(srpProposal?.metadata?.responsibilities).toBeDefined();
      expect(Array.isArray(srpProposal?.metadata?.responsibilities)).toBe(true);
      expect(srpProposal?.impact.benefits).toContain('Follows Single Responsibility Principle');
    });
  });

  describe('Combined Refactoring Scenarios', () => {
    it('should generate multiple types of proposals for complex graph', () => {
      // Setup complex graph with various violations

      // DIP violation: High-level depends on concrete
      graph.addNode('HighLevel', {
        type: RPGNodeType.MODULE,
        level: RPGNodeLevel.MODULE
      });
      graph.addNode('Concrete', {
        type: RPGNodeType.CLASS,
        level: RPGNodeLevel.IMPLEMENTATION
      });
      graph.addEdge('Concrete', 'HighLevel');

      // ISP violation: Fat interface
      graph.addNode('FatInterface', {
        type: RPGNodeType.INTERFACE
      });
      for (let i = 0; i < 6; i++) {
        graph.addNode(`ifaceMethod${i}`, {
          type: RPGNodeType.FUNCTION,
          parentId: 'FatInterface'
        });
      }
      for (let i = 0; i < 4; i++) {
        graph.addNode(`ifaceClient${i}`, {
          type: RPGNodeType.CLASS
        });
        graph.addEdge('FatInterface', `ifaceClient${i}`);
      }

      // SRP violation: God class
      graph.addNode('GodClass', {
        type: RPGNodeType.CLASS
      });
      for (let i = 0; i < 10; i++) {
        graph.addNode(`godMethod${i}`, {
          type: RPGNodeType.FUNCTION,
          parentId: 'GodClass'
        });
      }
      for (let i = 0; i < 7; i++) {
        graph.addNode(`godDep${i}`, {
          type: RPGNodeType.CLASS
        });
        graph.addEdge(`godDep${i}`, 'GodClass');
      }

      const proposals = graph.generateRefactoringProposals();

      const dipProposals = proposals.filter(p => p.metadata?.principle === 'DIP');
      const ispProposals = proposals.filter(p => p.metadata?.principle === 'ISP');
      const srpProposals = proposals.filter(p => p.metadata?.principle === 'SRP');

      expect(dipProposals.length).toBeGreaterThan(0);
      expect(ispProposals.length).toBeGreaterThan(0);
      expect(srpProposals.length).toBeGreaterThan(0);

      expect(proposals.length).toBeGreaterThanOrEqual(3);
    });

    it('should provide comprehensive impact analysis for each proposal', () => {
      graph.addNode('HighLevel', {
        type: RPGNodeType.MODULE,
        level: RPGNodeLevel.MODULE
      });
      graph.addNode('Concrete', {
        type: RPGNodeType.CLASS,
        level: RPGNodeLevel.IMPLEMENTATION
      });
      graph.addEdge('Concrete', 'HighLevel');

      const proposals = graph.generateRefactoringProposals();

      proposals.forEach(proposal => {
        expect(proposal.impact).toBeDefined();
        expect(proposal.impact.complexity).toMatch(/^(low|medium|high)$/);
        expect(proposal.impact.riskLevel).toMatch(/^(low|medium|high)$/);
        expect(Array.isArray(proposal.impact.benefits)).toBe(true);
        expect(Array.isArray(proposal.impact.drawbacks)).toBe(true);
        expect(proposal.impact.benefits.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Proposal Preview', () => {
    it('should preview proposal changes before application', () => {
      graph.addNode('HighLevel', {
        type: RPGNodeType.MODULE,
        level: RPGNodeLevel.MODULE
      });
      graph.addNode('Concrete', {
        type: RPGNodeType.CLASS,
        level: RPGNodeLevel.IMPLEMENTATION
      });
      graph.addEdge('Concrete', 'HighLevel');

      const proposals = graph.generateRefactoringProposals();
      const dipProposal = proposals.find(p => p.metadata?.principle === 'DIP');

      expect(dipProposal).toBeDefined();

      const preview = graph.previewRefactoringProposal(dipProposal!);

      expect(preview.addedNodes.length).toBeGreaterThan(0);
      expect(preview.addedNodes[0].attributes.type).toBe(RPGNodeType.INTERFACE);
      expect(preview.removedEdges.length).toBeGreaterThan(0);
      expect(preview.addedEdges.length).toBeGreaterThan(0);
    });
  });
});