/**
 * Extended Dependency Graph Tests
 * Testing RPG algorithm integration and advanced dependency management
 */

import { ExtendedDependencyGraph } from '../ExtendedDependencyGraph';
import { RPGNodeLevel, RPGNodeType, RPGEdgeType, RPGNodeStatus } from '../../rpg/types';

describe('ExtendedDependencyGraph', () => {
  let graph: ExtendedDependencyGraph;

  beforeEach(() => {
    graph = new ExtendedDependencyGraph();
  });

  describe('Basic Operations with Attributes', () => {
    test('should add node with attributes', () => {
      const attributes = {
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        filePath: 'src/test.ts',
        language: 'typescript'
      };

      graph.addNode('test-node', attributes);

      expect(graph.hasNode('test-node')).toBe(true);
      expect(graph.getNodeAttributes('test-node')).toEqual(attributes);
    });

    test('should add edge with attributes', () => {
      const edgeAttrs = {
        type: RPGEdgeType.DATA_FLOW,
        weight: 5,
        constraint: {
          required: true,
          reason: 'Critical dependency'
        }
      };

      graph.addNode('from');
      graph.addNode('to');
      graph.addEdge('from', 'to', edgeAttrs);

      expect(graph.hasEdge('from', 'to')).toBe(true);
      expect(graph.getEdgeAttributes('from', 'to')).toEqual(edgeAttrs);
    });

    test('should update node attributes', () => {
      graph.addNode('test', { level: RPGNodeLevel.PROPOSAL });

      graph.updateNodeAttributes('test', {
        status: RPGNodeStatus.IN_PROGRESS,
        priority: 10
      });

      const attrs = graph.getNodeAttributes('test');
      expect(attrs?.level).toBe(RPGNodeLevel.PROPOSAL);
      expect(attrs?.status).toBe(RPGNodeStatus.IN_PROGRESS);
      expect(attrs?.priority).toBe(10);
    });

    test('should update edge attributes', () => {
      graph.addNode('a');
      graph.addNode('b');
      graph.addEdge('a', 'b', { type: RPGEdgeType.IMPLEMENTATION });

      graph.updateEdgeAttributes('a', 'b', {
        weight: 8,
        bidirectional: true
      });

      const attrs = graph.getEdgeAttributes('a', 'b');
      expect(attrs?.type).toBe(RPGEdgeType.IMPLEMENTATION);
      expect(attrs?.weight).toBe(8);
      expect(attrs?.bidirectional).toBe(true);
    });

    test('should remove node and associated attributes', () => {
      graph.addNode('test', { level: RPGNodeLevel.MODULE });
      graph.addNode('other');
      graph.addEdge('test', 'other', { type: RPGEdgeType.DATA_FLOW });

      graph.removeNode('test');

      expect(graph.hasNode('test')).toBe(false);
      expect(graph.getNodeAttributes('test')).toBeUndefined();
      expect(graph.getEdgeAttributes('test', 'other')).toBeUndefined();
    });
  });

  describe('Advanced Query Operations', () => {
    beforeEach(() => {
      graph.addNode('module1', {
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.COMPLETED,
        language: 'typescript'
      });
      graph.addNode('class1', {
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        language: 'typescript',
        parentId: 'module1'
      });
      graph.addNode('function1', {
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.FUNCTION,
        status: RPGNodeStatus.IN_PROGRESS,
        language: 'javascript'
      });
    });

    test('should query nodes by level', () => {
      const moduleNodes = graph.getNodesByLevel(RPGNodeLevel.MODULE);
      const implNodes = graph.getNodesByLevel(RPGNodeLevel.IMPLEMENTATION);

      expect(moduleNodes).toEqual(['module1']);
      expect(implNodes).toContain('class1');
      expect(implNodes).toContain('function1');
    });

    test('should query nodes by type', () => {
      const modules = graph.getNodesByType(RPGNodeType.MODULE);
      const classes = graph.getNodesByType(RPGNodeType.CLASS);
      const functions = graph.getNodesByType(RPGNodeType.FUNCTION);

      expect(modules).toEqual(['module1']);
      expect(classes).toEqual(['class1']);
      expect(functions).toEqual(['function1']);
    });

    test('should query nodes by status', () => {
      const completed = graph.getNodesByStatus(RPGNodeStatus.COMPLETED);
      const pending = graph.getNodesByStatus(RPGNodeStatus.PENDING);
      const inProgress = graph.getNodesByStatus(RPGNodeStatus.IN_PROGRESS);

      expect(completed).toEqual(['module1']);
      expect(pending).toEqual(['class1']);
      expect(inProgress).toEqual(['function1']);
    });

    test('should query nodes with complex filters', () => {
      const tsNodes = graph.queryNodes({ language: 'typescript' });
      const implTsNodes = graph.queryNodes({
        level: RPGNodeLevel.IMPLEMENTATION,
        language: 'typescript'
      });

      expect(tsNodes).toContain('module1');
      expect(tsNodes).toContain('class1');
      expect(tsNodes).not.toContain('function1');

      expect(implTsNodes).toEqual(['class1']);
    });

    test('should query edges by type', () => {
      graph.addEdge('module1', 'class1', { type: RPGEdgeType.HIERARCHY });
      graph.addEdge('class1', 'function1', { type: RPGEdgeType.DATA_FLOW });

      const hierarchyEdges = graph.queryEdges({ edgeType: RPGEdgeType.HIERARCHY });
      const dataFlowEdges = graph.queryEdges({ edgeType: RPGEdgeType.DATA_FLOW });

      expect(hierarchyEdges).toHaveLength(1);
      expect(hierarchyEdges[0].from).toBe('module1');
      expect(hierarchyEdges[0].to).toBe('class1');

      expect(dataFlowEdges).toHaveLength(1);
      expect(dataFlowEdges[0].from).toBe('class1');
      expect(dataFlowEdges[0].to).toBe('function1');
    });
  });

  describe('Hierarchy Management', () => {
    test('should manage parent-child relationships', () => {
      graph.addNode('parent');
      graph.addNode('child1', { parentId: 'parent' });
      graph.addNode('child2', { parentId: 'parent' });
      graph.addNode('grandchild', { parentId: 'child1' });

      const children = graph.getChildNodes('parent');
      const parent = graph.getParentNode('child1');
      const ancestors = graph.getAncestors('grandchild');
      const descendants = graph.getDescendants('parent');

      expect(children).toContain('child1');
      expect(children).toContain('child2');
      expect(parent).toBe('parent');
      expect(ancestors).toContain('child1');
      expect(ancestors).toContain('parent');
      expect(descendants).toContain('child1');
      expect(descendants).toContain('child2');
      expect(descendants).toContain('grandchild');
    });

    test('should limit descendant depth', () => {
      graph.addNode('root');
      graph.addNode('level1', { parentId: 'root' });
      graph.addNode('level2', { parentId: 'level1' });
      graph.addNode('level3', { parentId: 'level2' });

      const descendants1 = graph.getDescendants('root', 1);
      const descendants2 = graph.getDescendants('root', 2);

      expect(descendants1).toEqual(['level1']);
      expect(descendants2).toContain('level1');
      expect(descendants2).toContain('level2');
      expect(descendants2).not.toContain('level3');
    });
  });

  describe('Advanced Cycle Detection', () => {
    test('should detect cycles with detailed analysis', () => {
      graph.addNode('a');
      graph.addNode('b');
      graph.addNode('c');
      graph.addEdge('a', 'b', { type: RPGEdgeType.DATA_FLOW });
      graph.addEdge('b', 'c', { type: RPGEdgeType.IMPLEMENTATION });
      graph.addEdge('c', 'a', { type: RPGEdgeType.DATA_FLOW });

      const result = graph.findCyclesDetailed();

      expect(result.hasCycles).toBe(true);
      expect(result.cycles).toHaveLength(1);
      expect(result.cycles[0]).toContain('a');
      expect(result.cycles[0]).toContain('b');
      expect(result.cycles[0]).toContain('c');

      expect(result.analysis).toHaveLength(1);
      expect(result.analysis[0].edgeTypes).toContain(RPGEdgeType.DATA_FLOW);
      expect(result.analysis[0].edgeTypes).toContain(RPGEdgeType.IMPLEMENTATION);
    });

    test('should generate cycle resolution proposals', () => {
      graph.addNode('a');
      graph.addNode('b');
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'a');

      const proposals = graph.generateCycleResolutionProposals([['a', 'b']]);

      expect(proposals.length).toBeGreaterThan(0);

      const extractInterfaceProposal = proposals.find(p => p.type === 'extract_interface');
      const reverseDependencyProposal = proposals.find(p => p.type === 'reverse_dependency');

      expect(extractInterfaceProposal).toBeDefined();
      expect(reverseDependencyProposal).toBeDefined();
    });
  });

  describe('Advanced Topological Sorting and Build Ordering', () => {
    beforeEach(() => {
      // Create a complex dependency graph
      graph.addNode('a', { priority: 10 });
      graph.addNode('b', { priority: 5 });
      graph.addNode('c', { priority: 8 });
      graph.addNode('d', { priority: 3 });

      graph.addEdge('a', 'b', { type: RPGEdgeType.DATA_FLOW, weight: 10 });
      graph.addEdge('a', 'c', { type: RPGEdgeType.IMPLEMENTATION, weight: 5 });
      graph.addEdge('b', 'd', { type: RPGEdgeType.DATA_FLOW, weight: 8 });
      graph.addEdge('c', 'd', { type: RPGEdgeType.IMPLEMENTATION, weight: 3 });
    });

    test('should perform advanced topological sort with filters', () => {
      const allSort = graph.topologicalSortAdvanced();
      const dataFlowSort = graph.topologicalSortAdvanced({
        edgeTypes: [RPGEdgeType.DATA_FLOW]
      });

      expect(allSort).toContain('a');
      expect(allSort).toContain('b');
      expect(allSort).toContain('c');
      expect(allSort).toContain('d');

      expect(dataFlowSort).toContain('a');
      expect(dataFlowSort).toContain('b');
      expect(dataFlowSort).toContain('d');
    });

    test('should generate build order with parallelization', () => {
      const buildOrder = graph.generateBuildOrder({ maxParallelism: 2 });

      expect(buildOrder.length).toBeGreaterThan(0);

      // Based on actual dependencies: a->b,c and b,c->d
      // Build order should be: d first (no deps), then b,c, then a last
      const firstGroup = buildOrder[0];
      expect(firstGroup.nodes).toContain('d'); // d has no dependencies

      const lastGroup = buildOrder[buildOrder.length - 1];
      expect(lastGroup.nodes).toContain('a'); // a depends on b,c so comes last
    });

    test('should get build dependencies', () => {
      // Based on debug output:
      // a - direct deps: ['b', 'c'] build deps: ['b', 'c', 'd']
      // b - direct deps: ['d'] build deps: ['d']
      // c - direct deps: ['d'] build deps: ['d']
      // d - direct deps: [] build deps: []

      const dDeps = graph.getBuildDependencies('d');
      const bDeps = graph.getBuildDependencies('b');
      const cDeps = graph.getBuildDependencies('c');
      const aDeps = graph.getBuildDependencies('a');

      // 'd' has no dependencies
      expect(dDeps).toEqual([]);

      // 'b' depends on 'd'
      expect(bDeps).toEqual(['d']);

      // 'c' depends on 'd'
      expect(cDeps).toEqual(['d']);

      // 'a' depends on 'b', 'c', and transitively 'd'
      expect(aDeps).toEqual(expect.arrayContaining(['b', 'c', 'd']));
      expect(aDeps).toHaveLength(3);
    });
  });

  describe('Refactoring and Optimization', () => {
    test('should generate refactoring proposals for high coupling', () => {
      // Create a node with many connections
      graph.addNode('central');
      for (let i = 1; i <= 6; i++) {
        graph.addNode(`node${i}`);
        graph.addEdge('central', `node${i}`);
      }

      const proposals = graph.generateRefactoringProposals(['central']);

      const decouplingProposals = proposals.filter(p =>
        p.type === 'extract_interface' && p.description.includes('central')
      );

      expect(decouplingProposals.length).toBeGreaterThan(0);
    });

    test('should preview refactoring proposal effects', () => {
      graph.addNode('test');

      const proposal = {
        id: 'test-proposal',
        type: 'extract_interface' as const,
        description: 'Test proposal',
        explanation: 'Test explanation',
        affectedNodes: ['test'],
        changes: [
          {
            action: 'add_node' as const,
            target: 'test-interface',
            details: { type: RPGNodeType.INTERFACE }
          },
          {
            action: 'modify_node' as const,
            target: 'test',
            details: { status: RPGNodeStatus.COMPLETED }
          }
        ],
        impact: {
          complexity: 'low' as const,
          riskLevel: 'low' as const,
          benefits: [],
          drawbacks: []
        },
        autoApplicable: false
      };

      const preview = graph.previewRefactoringProposal(proposal);

      expect(preview.addedNodes).toHaveLength(1);
      expect(preview.addedNodes[0].id).toBe('test-interface');
      expect(preview.modifiedNodes).toHaveLength(1);
      expect(preview.modifiedNodes[0].id).toBe('test');
    });
  });

  describe('Validation and Integrity', () => {
    test('should validate dependencies comprehensively', () => {
      graph.addNode('a');
      graph.addNode('b');
      graph.addNode('orphan');
      graph.addEdge('a', 'b');
      graph.addEdge('b', 'a'); // Cycle

      const validation = graph.validateDependencies();

      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(i => i.type === 'cycle')).toBe(true);
      expect(validation.issues.some(i => i.type === 'orphan')).toBe(true);
      expect(validation.statistics.orphanNodes).toBe(1);
    });

    test('should validate hierarchy integrity', () => {
      graph.addNode('a', { parentId: 'b' });
      graph.addNode('b', { parentId: 'c' });
      graph.addNode('c', { parentId: 'a' }); // Hierarchy cycle

      const isValid = graph.validateHierarchy();

      expect(isValid).toBe(false);
    });

    test('should validate constraints', () => {
      graph.addNode('a');
      graph.addNode('b');
      graph.addEdge('a', 'b', {
        constraint: {
          required: true,
          reason: 'Critical dependency'
        }
      });

      const issues = graph.validateConstraints();

      expect(issues).toHaveLength(0); // No issues since edge exists
    });
  });

  describe('RPG Integration', () => {
    test('should import from RPG format', () => {
      const rpgNodes = [
        {
          id: 'node1',
          name: 'Node 1',
          description: 'Test node',
          createdAt: new Date(),
          updatedAt: new Date(),
          level: RPGNodeLevel.MODULE,
          type: RPGNodeType.CLASS,
          status: RPGNodeStatus.PENDING,
          language: 'typescript'
        }
      ];

      const rpgEdges = [
        {
          id: 'edge1',
          name: 'Edge 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          fromId: 'node1',
          toId: 'node1',
          type: RPGEdgeType.DATA_FLOW,
          weight: 5
        }
      ];

      graph.importFromRPG(rpgNodes, rpgEdges);

      expect(graph.hasNode('node1')).toBe(true);
      const attrs = graph.getNodeAttributes('node1');
      expect(attrs?.level).toBe(RPGNodeLevel.MODULE);
      expect(attrs?.type).toBe(RPGNodeType.CLASS);
      expect(attrs?.language).toBe('typescript');
    });

    test('should export to RPG format', () => {
      graph.addNode('test', {
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.FUNCTION,
        status: RPGNodeStatus.COMPLETED
      });

      const { nodes, edges } = graph.exportToRPG();

      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('test');
      expect(nodes[0].level).toBe(RPGNodeLevel.IMPLEMENTATION);
      expect(nodes[0].type).toBe(RPGNodeType.FUNCTION);
      expect(nodes[0].status).toBe(RPGNodeStatus.COMPLETED);
    });

    test('should get compatible dependency graph', () => {
      graph.addNode('a');
      graph.addNode('b');
      graph.addEdge('a', 'b');

      const basicGraph = graph.getCompatibleDependencyGraph();

      expect(basicGraph.hasNode('a')).toBe(true);
      expect(basicGraph.hasNode('b')).toBe(true);
      expect(basicGraph.hasEdge('a', 'b')).toBe(true);
    });
  });

  describe('Statistics and Analysis', () => {
    beforeEach(() => {
      graph.addNode('module', {
        level: RPGNodeLevel.MODULE,
        type: RPGNodeType.MODULE,
        status: RPGNodeStatus.COMPLETED
      });
      graph.addNode('class', {
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        parentId: 'module'
      });
      graph.addNode('function', {
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.FUNCTION,
        status: RPGNodeStatus.IN_PROGRESS,
        parentId: 'class'
      });

      graph.addEdge('module', 'class', { type: RPGEdgeType.HIERARCHY });
      graph.addEdge('class', 'function', { type: RPGEdgeType.DATA_FLOW });
    });

    test('should provide detailed statistics', () => {
      const stats = graph.getStatistics();

      expect(stats.nodeCount).toBe(3);
      expect(stats.edgeCount).toBe(2);
      expect(stats.levelDistribution[RPGNodeLevel.MODULE]).toBe(1);
      expect(stats.levelDistribution[RPGNodeLevel.IMPLEMENTATION]).toBe(2);
      expect(stats.typeDistribution[RPGNodeType.MODULE]).toBe(1);
      expect(stats.typeDistribution[RPGNodeType.CLASS]).toBe(1);
      expect(stats.typeDistribution[RPGNodeType.FUNCTION]).toBe(1);
      expect(stats.statusDistribution[RPGNodeStatus.COMPLETED]).toBe(1);
      expect(stats.statusDistribution[RPGNodeStatus.PENDING]).toBe(1);
      expect(stats.statusDistribution[RPGNodeStatus.IN_PROGRESS]).toBe(1);
      expect(stats.edgeTypeDistribution[RPGEdgeType.HIERARCHY]).toBe(1);
      expect(stats.edgeTypeDistribution[RPGEdgeType.DATA_FLOW]).toBe(1);
    });

    test('should analyze complexity', () => {
      const analysis = graph.analyzeComplexity();

      expect(analysis.overall).toMatch(/^(low|medium|high)$/);
      expect(analysis.factors.length).toBeGreaterThan(0);
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('Advanced Build Ordering (Task 38.2)', () => {
    beforeEach(() => {
      // Create a more complex graph for build order testing
      graph.addNode('core', {
        priority: 10,
        type: RPGNodeType.MODULE,
        metadata: { estimatedBuildTime: 5 }
      });
      graph.addNode('utils', {
        priority: 8,
        type: RPGNodeType.MODULE,
        metadata: { estimatedBuildTime: 2 }
      });
      graph.addNode('api', {
        priority: 6,
        type: RPGNodeType.MODULE,
        metadata: { estimatedBuildTime: 3 }
      });
      graph.addNode('ui', {
        priority: 4,
        type: RPGNodeType.MODULE,
        metadata: { estimatedBuildTime: 4 }
      });
      graph.addNode('tests', {
        priority: 2,
        type: RPGNodeType.MODULE,
        metadata: { estimatedBuildTime: 1 }
      });

      // Dependencies: core -> utils -> api -> ui -> tests
      graph.addEdge('utils', 'core', { type: RPGEdgeType.IMPLEMENTATION, weight: 10 });
      graph.addEdge('api', 'utils', { type: RPGEdgeType.DATA_FLOW, weight: 8 });
      graph.addEdge('ui', 'api', { type: RPGEdgeType.DATA_FLOW, weight: 6 });
      graph.addEdge('tests', 'ui', { type: RPGEdgeType.IMPLEMENTATION, weight: 4 });
      graph.addEdge('tests', 'core', { type: RPGEdgeType.IMPLEMENTATION, weight: 9 });
    });

    test('should generate optimal build order with priority consideration', () => {
      const buildOrder = graph.generateBuildOrder({
        considerPriorities: true,
        maxParallelism: 3
      });

      expect(buildOrder.length).toBeGreaterThan(0);

      // First group should contain nodes with no dependencies
      const firstGroup = buildOrder[0];
      expect(firstGroup.nodes).toContain('core');
      expect(firstGroup.nodes).toContain('utils');

      // Each group should respect max parallelism
      buildOrder.forEach(group => {
        expect(group.nodes.length).toBeLessThanOrEqual(3);
      });

      // Dependencies should be respected
      const nodeToGroupMap = new Map<string, number>();
      buildOrder.forEach((group, index) => {
        group.nodes.forEach(node => {
          nodeToGroupMap.set(node, index);
        });
      });

      // tests depends on ui and core, so it should be in a later group
      const testsGroup = nodeToGroupMap.get('tests')!;
      const uiGroup = nodeToGroupMap.get('ui')!;
      const coreGroup = nodeToGroupMap.get('core')!;
      expect(testsGroup).toBeGreaterThanOrEqual(uiGroup);
      expect(testsGroup).toBeGreaterThanOrEqual(coreGroup);
    });

    test('should perform advanced topological sort with priorities', () => {
      const sorted = graph.topologicalSortAdvanced({
        considerPriorities: true,
        considerWeights: true
      });

      expect(sorted).toHaveLength(5);

      // Should contain all nodes
      expect(sorted).toContain('core');
      expect(sorted).toContain('utils');
      expect(sorted).toContain('api');
      expect(sorted).toContain('ui');
      expect(sorted).toContain('tests');

      // Dependencies should be respected
      const coreIndex = sorted.indexOf('core');
      const utilsIndex = sorted.indexOf('utils');
      const testsIndex = sorted.indexOf('tests');
      const uiIndex = sorted.indexOf('ui');

      expect(coreIndex).toBeLessThan(utilsIndex); // core before utils
      expect(uiIndex).toBeLessThan(testsIndex); // ui before tests
    });

    test('should generate partial build order for specific targets', () => {
      const partialOrder = graph.generatePartialBuildOrder(['ui'], {
        considerPriorities: true
      });

      expect(partialOrder.length).toBeGreaterThan(0);

      // Should include ui and its dependencies
      const allNodes = partialOrder.flatMap(group => group.nodes);
      expect(allNodes).toContain('ui');
      expect(allNodes).toContain('api');
      expect(allNodes).toContain('utils');
      expect(allNodes).toContain('core');

      // Should not include tests (not a dependency of ui)
      expect(allNodes).not.toContain('tests');
    });

    test('should analyze parallelization potential', () => {
      const analysis = graph.analyzeParallelizationPotential({
        considerPriorities: true
      });

      expect(analysis.maxParallelism).toBeGreaterThan(0);
      expect(analysis.criticalPath).toBeInstanceOf(Array);
      expect(analysis.criticalPath.length).toBeGreaterThan(0);
      expect(analysis.criticalPathTime).toBeGreaterThan(0);
      expect(analysis.totalSequentialTime).toBeGreaterThan(0);
      expect(analysis.parallelizationRatio).toBeGreaterThanOrEqual(0);
      expect(analysis.parallelizationRatio).toBeLessThanOrEqual(1);
      expect(analysis.bottlenecks).toBeInstanceOf(Array);
      expect(analysis.recommendations).toBeInstanceOf(Array);
    });

    test('should check if nodes can be built in parallel', () => {
      // core and utils can be built in parallel (no dependency between them)
      expect(graph.canBuildInParallel('core', 'utils')).toBe(true);

      // core and tests cannot be built in parallel (tests depends on core)
      expect(graph.canBuildInParallel('core', 'tests')).toBe(false);

      // utils and api cannot be built in parallel (api depends on utils)
      expect(graph.canBuildInParallel('utils', 'api')).toBe(false);
    });

    test('should find critical path correctly', () => {
      const analysis = graph.analyzeParallelizationPotential();

      // Critical path should be the longest path through the graph
      expect(analysis.criticalPath.length).toBeGreaterThan(2);

      // Should start with a node that has no dependencies
      const firstNode = analysis.criticalPath[0];
      const firstNodeDeps = graph.getBuildDependencies(firstNode);
      expect(firstNodeDeps).toHaveLength(0);

      // Should end with a node that has many dependencies
      const lastNode = analysis.criticalPath[analysis.criticalPath.length - 1];
      const lastNodeDeps = graph.getBuildDependencies(lastNode);
      expect(lastNodeDeps.length).toBeGreaterThan(0);
    });

    test('should identify bottlenecks in build process', () => {
      // Add a node that creates a bottleneck
      graph.addNode('bottleneck', {
        priority: 1,
        type: RPGNodeType.MODULE,
        metadata: { estimatedBuildTime: 10 } // Very slow build
      });

      // Make many nodes depend on the bottleneck
      ['ui', 'api', 'tests'].forEach(node => {
        graph.addEdge('bottleneck', node, { type: RPGEdgeType.IMPLEMENTATION });
      });

      const analysis = graph.analyzeParallelizationPotential();

      expect(analysis.bottlenecks.length).toBeGreaterThan(0);

      // Should identify high fan-out bottleneck
      const fanOutBottleneck = analysis.bottlenecks.find(b =>
        b.reason.includes('High fan-out')
      );
      expect(fanOutBottleneck).toBeDefined();
    });

    test('should provide meaningful parallelization recommendations', () => {
      // Create a graph with poor parallelization
      const poorGraph = new ExtendedDependencyGraph();

      // Linear chain: a -> b -> c -> d -> e
      ['a', 'b', 'c', 'd', 'e'].forEach(node => {
        poorGraph.addNode(node, { type: RPGNodeType.MODULE });
      });

      ['a', 'b', 'c', 'd'].forEach((node, index) => {
        const nextNode = ['b', 'c', 'd', 'e'][index];
        poorGraph.addEdge(node, nextNode);
      });

      const analysis = poorGraph.analyzeParallelizationPotential();

      expect(analysis.parallelizationRatio).toBeLessThan(0.3);
      expect(analysis.recommendations.length).toBeGreaterThan(0);

      // Should recommend breaking down modules
      const breakdownRec = analysis.recommendations.find(r =>
        r.includes('breaking down')
      );
      expect(breakdownRec).toBeDefined();
    });

    test('should handle edge type filtering in build ordering', () => {
      const dataFlowOrder = graph.generateBuildOrder({
        edgeTypes: [RPGEdgeType.DATA_FLOW]
      });

      const implOrder = graph.generateBuildOrder({
        edgeTypes: [RPGEdgeType.IMPLEMENTATION]
      });

      // Different edge type filters should produce different build orders
      expect(dataFlowOrder).not.toEqual(implOrder);

      // Both should contain all nodes
      const dataFlowNodes = dataFlowOrder.flatMap(g => g.nodes);
      const implNodes = implOrder.flatMap(g => g.nodes);

      expect(dataFlowNodes.sort()).toEqual(['api', 'core', 'tests', 'ui', 'utils']);
      expect(implNodes.sort()).toEqual(['api', 'core', 'tests', 'ui', 'utils']);
    });
  });
});