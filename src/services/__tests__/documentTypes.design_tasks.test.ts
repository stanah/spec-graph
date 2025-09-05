import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentTypeRegistry } from '../documentTypes';
import { DesignDocumentType, TasksDocumentType, registerDefaultDocumentTypes } from '../documentTypes.builtins';

describe('Built-in Document Types (Design/Tasks)', () => {
  let registry: DocumentTypeRegistry;

  beforeEach(() => {
    registry = new DocumentTypeRegistry();
  });

  it('exports Design and Tasks types with stable keys', () => {
    const design = new DesignDocumentType();
    const tasks = new TasksDocumentType();
    expect(design.key).toBe('design');
    expect(tasks.key).toBe('tasks');
    expect(typeof design.label).toBe('string');
    expect(typeof tasks.label).toBe('string');
  });

  it('registerDefaultDocumentTypes registers all built-ins including design and tasks', () => {
    registerDefaultDocumentTypes(registry);
    const keys = registry.list().map(t => t.key).sort();
    expect(keys).toEqual(['design', 'requirements', 'stakeholders', 'tasks']);
  });

  it('provides minimal JSON Schemas for design and tasks', () => {
    const design = new DesignDocumentType();
    const tasks = new TasksDocumentType();
    const dSchema = design.getSchema?.();
    const tSchema = tasks.getSchema?.();
    expect((dSchema as any)?.type).toBe('object');
    expect((tSchema as any)?.type).toBe('object');
  });
});

