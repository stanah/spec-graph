/**
 * Codebase Generation Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CodebaseGenerationService } from '../../codebaseGeneration/CodebaseGenerationService';
import type { RPGGraph, RPGNode, RPGEdge } from '../../../core/rpg/types';
import { RPGNodeType, RPGNodeLevel, RPGNodeStatus, RPGEdgeType } from '../../../core/rpg/types';
import type { CodeGenerationOptions } from '../../codebaseGeneration/types';

describe('CodebaseGenerationService', () => {
  let service: CodebaseGenerationService;

  beforeEach(() => {
    service = new CodebaseGenerationService();
  });

  describe('generate', () => {
    it('should generate code from RPG graph with TypeScript class', async () => {
      // Create a simple RPG graph with a class node
      const classNode: RPGNode = {
        id: 'user-class',
        name: 'User',
        description: 'User entity class',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map([['user-class', classNode]]),
        edges: new Map(),
        rootNodeIds: ['user-class'],
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
      };

      const result = await service.generate(graph, options);

      expect(result.structure.files).toHaveLength(1);
      expect(result.structure.files[0].path).toContain('User');
      expect(result.structure.files[0].content).toContain('export class User');
      expect(result.structure.files[0].content).toContain('User entity class');
      expect(result.metadata.fileCount).toBe(1);
      expect(result.metadata.language).toBe('typescript');
    });

    it('should generate code from RPG graph with TypeScript function', async () => {
      const functionNode: RPGNode = {
        id: 'calculate-total',
        name: 'calculateTotal',
        description: 'Calculate the total price',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.FUNCTION,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        typeSignature: 'number',
        metadata: {
          parameters: [
            { name: 'items', type: 'Item[]', description: 'List of items' },
          ],
        },
      };

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map([['calculate-total', functionNode]]),
        edges: new Map(),
        rootNodeIds: ['calculate-total'],
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
      };

      const result = await service.generate(graph, options);

      expect(result.structure.files).toHaveLength(1);
      expect(result.structure.files[0].content).toContain('export function calculateTotal');
      expect(result.structure.files[0].content).toContain('items: Item[]');
      expect(result.structure.files[0].content).toContain(': number');
      expect(result.metadata.fileCount).toBe(1);
    });

    it('should generate code from RPG graph with TypeScript interface', async () => {
      const interfaceNode: RPGNode = {
        id: 'user-interface',
        name: 'IUser',
        description: 'User interface definition',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.INTERFACE,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          properties: [
            { name: 'id', type: 'string', description: 'User ID' },
            { name: 'name', type: 'string', description: 'User name' },
            { name: 'email', type: 'string', optional: true, description: 'User email' },
          ],
        },
      };

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map([['user-interface', interfaceNode]]),
        edges: new Map(),
        rootNodeIds: ['user-interface'],
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
      };

      const result = await service.generate(graph, options);

      expect(result.structure.files).toHaveLength(1);
      expect(result.structure.files[0].content).toContain('export interface IUser');
      expect(result.structure.files[0].content).toContain('id: string');
      expect(result.structure.files[0].content).toContain('name: string');
      expect(result.structure.files[0].content).toContain('email?: string');
      expect(result.metadata.fileCount).toBe(1);
    });

    it('should handle nodes without matching templates', async () => {
      const unknownNode: RPGNode = {
        id: 'unknown-node',
        name: 'Unknown',
        level: RPGNodeLevel.PROPOSAL,
        type: RPGNodeType.FEATURE,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map([['unknown-node', unknownNode]]),
        edges: new Map(),
        rootNodeIds: ['unknown-node'],
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
      };

      const result = await service.generate(graph, options);

      expect(result.structure.files).toHaveLength(0);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.message.includes('No template found'))).toBe(true);
    });

    it('should generate multiple files for multiple nodes', async () => {
      const classNode: RPGNode = {
        id: 'user-class',
        name: 'User',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const interfaceNode: RPGNode = {
        id: 'user-interface',
        name: 'IUser',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.INTERFACE,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map([
          ['user-class', classNode],
          ['user-interface', interfaceNode],
        ]),
        edges: new Map(),
        rootNodeIds: ['user-class', 'user-interface'],
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
      };

      const result = await service.generate(graph, options);

      expect(result.structure.files).toHaveLength(2);
      expect(result.metadata.fileCount).toBe(2);
    });

    it('should use custom file paths when provided', async () => {
      const classNode: RPGNode = {
        id: 'user-class',
        name: 'User',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        filePath: 'models/User.ts',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map([['user-class', classNode]]),
        edges: new Map(),
        rootNodeIds: ['user-class'],
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
      };

      const result = await service.generate(graph, options);

      expect(result.structure.files[0].path).toBe('models/User.ts');
    });
  });

  describe('registerTemplate', () => {
    it('should allow registering custom templates', () => {
      const customTemplate = {
        metadata: {
          id: 'custom-class',
          name: 'Custom Class',
          language: 'typescript' as const,
          nodeTypes: [RPGNodeType.CLASS],
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'export class {{node.name}} { /* custom */ }',
      };

      expect(() => service.registerTemplate(customTemplate)).not.toThrow();
      expect(service.getRegistry().get('custom-class')).toBeDefined();
    });
  });

  describe('dependency resolution and generation order', () => {
    it('should generate files in dependency order', async () => {
      // Create nodes with dependencies: Interface -> Class -> Function
      const interfaceNode: RPGNode = {
        id: 'user-interface',
        name: 'IUser',
        description: 'User interface',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.INTERFACE,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const classNode: RPGNode = {
        id: 'user-class',
        name: 'User',
        description: 'User class implementing IUser',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const functionNode: RPGNode = {
        id: 'create-user',
        name: 'createUser',
        description: 'Function to create a user',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.FUNCTION,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Define dependencies: classNode depends on interfaceNode, functionNode depends on classNode
      const edge1: RPGEdge = {
        id: 'edge-class-interface',
        name: 'Class depends on Interface',
        fromId: 'user-class',
        toId: 'user-interface',
        type: RPGEdgeType.IMPLEMENTATION,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const edge2: RPGEdge = {
        id: 'edge-function-class',
        name: 'Function depends on Class',
        fromId: 'create-user',
        toId: 'user-class',
        type: RPGEdgeType.IMPLEMENTATION,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map([
          ['user-interface', interfaceNode],
          ['user-class', classNode],
          ['create-user', functionNode],
        ]),
        edges: new Map([
          ['edge-class-interface', edge1],
          ['edge-function-class', edge2],
        ]),
        rootNodeIds: ['user-interface'],
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
      };

      const result = await service.generate(graph, options);

      // All files should be generated
      expect(result.structure.files).toHaveLength(3);
      expect(result.metadata.fileCount).toBe(3);
      expect(result.errors).toBeUndefined();

      // Files should be in dependency order: interface, class, function
      const fileIds = result.structure.files.map(f => f.sourceNodeId);
      const interfaceIndex = fileIds.indexOf('user-interface');
      const classIndex = fileIds.indexOf('user-class');
      const functionIndex = fileIds.indexOf('create-user');

      // Interface should come before class
      expect(interfaceIndex).toBeLessThan(classIndex);
      // Class should come before function
      expect(classIndex).toBeLessThan(functionIndex);
    });

    it('should detect and warn about circular dependencies', async () => {
      // Create nodes with circular dependency: A -> B -> C -> A
      const nodeA: RPGNode = {
        id: 'class-a',
        name: 'ClassA',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nodeB: RPGNode = {
        id: 'class-b',
        name: 'ClassB',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nodeC: RPGNode = {
        id: 'class-c',
        name: 'ClassC',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const edgeAB: RPGEdge = {
        id: 'edge-a-b',
        name: 'A depends on B',
        fromId: 'class-a',
        toId: 'class-b',
        type: RPGEdgeType.IMPLEMENTATION,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const edgeBC: RPGEdge = {
        id: 'edge-b-c',
        name: 'B depends on C',
        fromId: 'class-b',
        toId: 'class-c',
        type: RPGEdgeType.IMPLEMENTATION,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const edgeCA: RPGEdge = {
        id: 'edge-c-a',
        name: 'C depends on A (creates cycle)',
        fromId: 'class-c',
        toId: 'class-a',
        type: RPGEdgeType.IMPLEMENTATION,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map([
          ['class-a', nodeA],
          ['class-b', nodeB],
          ['class-c', nodeC],
        ]),
        edges: new Map([
          ['edge-a-b', edgeAB],
          ['edge-b-c', edgeBC],
          ['edge-c-a', edgeCA],
        ]),
        rootNodeIds: ['class-a'],
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
      };

      const result = await service.generate(graph, options);

      // Files should still be generated despite cycles
      expect(result.structure.files).toHaveLength(3);

      // Should have warnings about circular dependencies
      expect(result.warnings).toBeDefined();
      const circularDependencyWarning = result.warnings?.find(w =>
        w.message.includes('circular dependencies') || w.message.includes('Circular dependency')
      );
      expect(circularDependencyWarning).toBeDefined();
    });

    it('should handle complex dependency graphs', async () => {
      // Create a diamond dependency pattern: D depends on B and C, both depend on A
      const nodeA: RPGNode = {
        id: 'base-interface',
        name: 'IBase',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.INTERFACE,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nodeB: RPGNode = {
        id: 'service-b',
        name: 'ServiceB',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nodeC: RPGNode = {
        id: 'service-c',
        name: 'ServiceC',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nodeD: RPGNode = {
        id: 'controller',
        name: 'Controller',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const edges: RPGEdge[] = [
        {
          id: 'edge-b-a',
          name: 'B depends on A',
          fromId: 'service-b',
          toId: 'base-interface',
          type: RPGEdgeType.IMPLEMENTATION,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'edge-c-a',
          name: 'C depends on A',
          fromId: 'service-c',
          toId: 'base-interface',
          type: RPGEdgeType.IMPLEMENTATION,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'edge-d-b',
          name: 'D depends on B',
          fromId: 'controller',
          toId: 'service-b',
          type: RPGEdgeType.IMPLEMENTATION,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'edge-d-c',
          name: 'D depends on C',
          fromId: 'controller',
          toId: 'service-c',
          type: RPGEdgeType.IMPLEMENTATION,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map([
          ['base-interface', nodeA],
          ['service-b', nodeB],
          ['service-c', nodeC],
          ['controller', nodeD],
        ]),
        edges: new Map(edges.map(e => [e.id, e])),
        rootNodeIds: ['base-interface'],
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
      };

      const result = await service.generate(graph, options);

      // All files should be generated
      expect(result.structure.files).toHaveLength(4);
      expect(result.metadata.fileCount).toBe(4);

      // Base interface should be generated first
      const fileIds = result.structure.files.map(f => f.sourceNodeId);
      const baseIndex = fileIds.indexOf('base-interface');
      const serviceBIndex = fileIds.indexOf('service-b');
      const serviceCIndex = fileIds.indexOf('service-c');
      const controllerIndex = fileIds.indexOf('controller');

      // Base should come before both services
      expect(baseIndex).toBeLessThan(serviceBIndex);
      expect(baseIndex).toBeLessThan(serviceCIndex);

      // Both services should come before controller
      expect(serviceBIndex).toBeLessThan(controllerIndex);
      expect(serviceCIndex).toBeLessThan(controllerIndex);
    });
  });

  describe('file hierarchy generation', () => {
    it('should generate hierarchical directory structure', () => {
      const nodes: RPGNode[] = [
        {
          id: 'model',
          name: 'User',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.CLASS,
          status: RPGNodeStatus.PENDING,
          filePath: 'models/User.ts',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'service',
          name: 'UserService',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.CLASS,
          status: RPGNodeStatus.PENDING,
          filePath: 'services/UserService.ts',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'controller',
          name: 'UserController',
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.CLASS,
          status: RPGNodeStatus.PENDING,
          filePath: 'controllers/UserController.ts',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map(nodes.map(n => [n.id, n])),
        edges: new Map(),
        rootNodeIds: nodes.map(n => n.id),
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
      };

      const hierarchy = service.generateFileHierarchy(graph, options);

      // Should have structure entries for directories
      expect(hierarchy.structure.size).toBeGreaterThan(0);

      // Should have root directories
      expect(hierarchy.rootDirectories.length).toBeGreaterThan(0);
    });
  });

  describe('batch processing and performance', () => {
    it('should process nodes in batches when batch size is set', async () => {
      // Create a large number of nodes
      const nodes: RPGNode[] = [];
      for (let i = 0; i < 25; i++) {
        nodes.push({
          id: `class-${i}`,
          name: `Class${i}`,
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.CLASS,
          status: RPGNodeStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map(nodes.map(n => [n.id, n])),
        edges: new Map(),
        rootNodeIds: nodes.map(n => n.id),
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
        batchSize: 5,
      };

      const result = await service.generate(graph, options);

      // All files should be generated
      expect(result.structure.files).toHaveLength(25);
      expect(result.metadata.fileCount).toBe(25);
    });

    it('should not batch when batch size is 0', async () => {
      const nodes: RPGNode[] = [];
      for (let i = 0; i < 15; i++) {
        nodes.push({
          id: `class-${i}`,
          name: `Class${i}`,
          level: RPGNodeLevel.IMPLEMENTATION,
          type: RPGNodeType.CLASS,
          status: RPGNodeStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map(nodes.map(n => [n.id, n])),
        edges: new Map(),
        rootNodeIds: nodes.map(n => n.id),
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
        batchSize: 0, // Disable batching
      };

      const result = await service.generate(graph, options);

      // All files should be generated without batching
      expect(result.structure.files).toHaveLength(15);
      expect(result.metadata.fileCount).toBe(15);
    });
  });

  describe('error recovery', () => {
    it('should retry failed template rendering', async () => {
      // Create a node that might fail template rendering
      const node: RPGNode = {
        id: 'test-class',
        name: 'TestClass',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map([['test-class', node]]),
        edges: new Map(),
        rootNodeIds: ['test-class'],
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
        maxRetries: 3,
      };

      const result = await service.generate(graph, options);

      // Should complete successfully (template rendering should work)
      expect(result.structure.files).toHaveLength(1);
      expect(result.errors).toBeUndefined();
    });

    it('should report errors after max retries exceeded', async () => {
      // Create a node with invalid template data that will fail
      const node: RPGNode = {
        id: 'invalid-node',
        name: 'Invalid',
        level: RPGNodeLevel.IMPLEMENTATION,
        type: RPGNodeType.CLASS,
        status: RPGNodeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Register a template that will fail due to invalid syntax
      const failingTemplate = {
        metadata: {
          id: 'failing-template',
          name: 'Failing Template',
          language: 'typescript' as const,
          nodeTypes: [RPGNodeType.CLASS],
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // Template with unclosed block which will fail to compile
        template: '{{#each items}}unclosed block',
      };

      service.registerTemplate(failingTemplate);

      const graph: RPGGraph = {
        metadata: {
          version: '1.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        nodes: new Map([['invalid-node', node]]),
        edges: new Map(),
        rootNodeIds: ['invalid-node'],
      };

      const options: CodeGenerationOptions = {
        language: 'typescript',
        outputDir: 'src',
        maxRetries: 2,
        templateOverrides: {
          class: 'failing-template',
        },
      };

      const result = await service.generate(graph, options);

      // Should have errors after retries
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      expect(result.errors?.[0].message).toContain('retries');
    });
  });
});
