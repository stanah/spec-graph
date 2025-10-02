/**
 * Template Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateRegistry } from '../../codebaseGeneration/TemplateRegistry';
import type { CodeTemplate } from '../../codebaseGeneration/types';
import { RPGNodeType, RPGNodeLevel } from '../../../core/rpg/types';

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  describe('register', () => {
    it('should register a valid template', () => {
      const template: CodeTemplate = {
        metadata: {
          id: 'test-template',
          name: 'Test Template',
          language: 'typescript',
          nodeTypes: [RPGNodeType.CLASS],
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'export class {{node.name}} {}',
      };

      expect(() => registry.register(template)).not.toThrow();
      expect(registry.get('test-template')).toBe(template);
    });

    it('should throw error for invalid template', () => {
      const invalidTemplate: CodeTemplate = {
        metadata: {
          id: '',
          name: 'Test',
          language: 'typescript',
          nodeTypes: [RPGNodeType.CLASS],
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'export class {{node.name}} {}',
      };

      expect(() => registry.register(invalidTemplate)).toThrow();
    });

    it('should throw error for duplicate template ID', () => {
      const template: CodeTemplate = {
        metadata: {
          id: 'test-template',
          name: 'Test Template',
          language: 'typescript',
          nodeTypes: [RPGNodeType.CLASS],
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'export class {{node.name}} {}',
      };

      registry.register(template);
      expect(() => registry.register(template)).toThrow(/already exists/);
    });
  });

  describe('unregister', () => {
    it('should unregister an existing template', () => {
      const template: CodeTemplate = {
        metadata: {
          id: 'test-template',
          name: 'Test Template',
          language: 'typescript',
          nodeTypes: [RPGNodeType.CLASS],
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'export class {{node.name}} {}',
      };

      registry.register(template);
      expect(registry.unregister('test-template')).toBe(true);
      expect(registry.get('test-template')).toBeUndefined();
    });

    it('should return false for non-existent template', () => {
      expect(registry.unregister('non-existent')).toBe(false);
    });
  });

  describe('find', () => {
    beforeEach(() => {
      registry.register({
        metadata: {
          id: 'ts-class',
          name: 'TS Class',
          language: 'typescript',
          nodeTypes: [RPGNodeType.CLASS],
          nodeLevels: [RPGNodeLevel.IMPLEMENTATION],
          version: '1.0.0',
          tags: ['typescript', 'oop'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'class {{node.name}} {}',
      });

      registry.register({
        metadata: {
          id: 'ts-function',
          name: 'TS Function',
          language: 'typescript',
          nodeTypes: [RPGNodeType.FUNCTION],
          nodeLevels: [RPGNodeLevel.IMPLEMENTATION],
          version: '1.0.0',
          tags: ['typescript', 'functional'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'function {{node.name}}() {}',
      });

      registry.register({
        metadata: {
          id: 'py-class',
          name: 'Python Class',
          language: 'python',
          nodeTypes: [RPGNodeType.CLASS],
          nodeLevels: [RPGNodeLevel.IMPLEMENTATION],
          version: '1.0.0',
          tags: ['python', 'oop'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'class {{node.name}}:',
      });
    });

    it('should find templates by language', () => {
      const templates = registry.find({ language: 'typescript' });
      expect(templates).toHaveLength(2);
      expect(templates.every(t => t.metadata.language === 'typescript')).toBe(true);
    });

    it('should find templates by node type', () => {
      const templates = registry.find({ nodeType: RPGNodeType.CLASS });
      expect(templates).toHaveLength(2);
      expect(templates.every(t => t.metadata.nodeTypes.includes(RPGNodeType.CLASS))).toBe(true);
    });

    it('should find templates by multiple criteria', () => {
      const templates = registry.find({
        language: 'typescript',
        nodeType: RPGNodeType.CLASS,
      });
      expect(templates).toHaveLength(1);
      expect(templates[0].metadata.id).toBe('ts-class');
    });

    it('should find templates by tags', () => {
      const templates = registry.find({ tags: ['oop'] });
      expect(templates).toHaveLength(2);
      expect(templates.every(t => t.metadata.tags?.includes('oop'))).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate correct template', () => {
      const template: CodeTemplate = {
        metadata: {
          id: 'test',
          name: 'Test',
          language: 'typescript',
          nodeTypes: [RPGNodeType.CLASS],
          version: '1.0.0',
          description: 'A test template',
          author: 'Test Author',
          tags: ['test'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'class {{node.name}} {}',
      };

      const result = registry.validate(template);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const template: CodeTemplate = {
        metadata: {
          id: '',
          name: '',
          language: 'typescript',
          nodeTypes: [],
          version: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: '',
      };

      const result = registry.validate(template);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should compile template successfully', () => {
      const template: CodeTemplate = {
        metadata: {
          id: 'test',
          name: 'Test',
          language: 'typescript',
          nodeTypes: [RPGNodeType.CLASS],
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'class {{node.name}} {}',
      };

      const result = registry.validate(template);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('list', () => {
    it('should list all templates', () => {
      const template1: CodeTemplate = {
        metadata: {
          id: 'test1',
          name: 'Test 1',
          language: 'typescript',
          nodeTypes: [RPGNodeType.CLASS],
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'class {{node.name}} {}',
      };

      const template2: CodeTemplate = {
        metadata: {
          id: 'test2',
          name: 'Test 2',
          language: 'typescript',
          nodeTypes: [RPGNodeType.FUNCTION],
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        template: 'function {{node.name}}() {}',
      };

      registry.register(template1);
      registry.register(template2);

      const templates = registry.list();
      expect(templates).toHaveLength(2);
      expect(templates).toContain(template1);
      expect(templates).toContain(template2);
    });
  });
});
