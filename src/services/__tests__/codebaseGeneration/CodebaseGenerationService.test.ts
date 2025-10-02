/**
 * Codebase Generation Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CodebaseGenerationService } from '../../codebaseGeneration/CodebaseGenerationService';
import type { RPGGraph, RPGNode } from '../../../core/rpg/types';
import { RPGNodeType, RPGNodeLevel, RPGNodeStatus } from '../../../core/rpg/types';
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
});
