import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentTypeRegistry } from '../documentTypes';
import { registerDefaultDocumentTypes } from '../documentTypes.builtins';

describe('DocumentTypeRegistry - relations & custom types', () => {
  let registry: DocumentTypeRegistry;

  beforeEach(() => {
    registry = new DocumentTypeRegistry();
    registerDefaultDocumentTypes(registry);
  });

  it('manages dependencies between types and returns topological order', () => {
    // design depends on requirements; tasks depends on requirements and design
    registry.addRelation('design', 'requirements');
    registry.addRelation('tasks', 'requirements');
    registry.addRelation('tasks', 'design');

    expect(registry.getDependencies('design')).toEqual(['requirements']);
    expect(registry.getDependencies('tasks').sort()).toEqual(['design', 'requirements']);
    const order = registry.resolveOrder();
    // requirements should appear before design and tasks; design before tasks
    const iReq = order.indexOf('requirements');
    const iDes = order.indexOf('design');
    const iTask = order.indexOf('tasks');
    expect(iReq).toBeLessThan(iDes);
    expect(iReq).toBeLessThan(iTask);
    expect(iDes).toBeLessThan(iTask);
  });

  it('detects cycles in dependency graph', () => {
    registry.addRelation('requirements', 'design');
    registry.addRelation('design', 'requirements');
    expect(registry.hasCycle()).toBe(true);
    expect(registry.findCycles().length).toBeGreaterThan(0);
  });

  it('supports registering custom types from config object', () => {
    registry.registerCustomType({
      key: 'qa',
      label: 'QA',
      schema: {
        type: 'object',
        properties: { title: { type: 'string' } },
      },
    });
    const t = registry.get('qa');
    expect(t?.key).toBe('qa');
    expect(t?.label).toBe('QA');
    expect(typeof t?.getSchema?.()).toBe('object');
  });
});

