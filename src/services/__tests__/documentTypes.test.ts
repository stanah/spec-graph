import { describe, it, expect, beforeEach } from 'vitest';
import { BaseDocumentType, DocumentTypeRegistry } from '../documentTypes';

class TestDocType extends BaseDocumentType {
  readonly key = 'test';
  readonly label = 'Test';
}

class AnotherDocType extends BaseDocumentType {
  readonly key = 'another';
  readonly label = 'Another';
}

describe('DocumentTypeRegistry', () => {
  let registry: DocumentTypeRegistry;

  beforeEach(() => {
    registry = new DocumentTypeRegistry();
  });

  it('registers and retrieves a document type', () => {
    const t = new TestDocType();
    registry.register(t);
    expect(registry.has('test')).toBe(true);
    const got = registry.get('test');
    expect(got?.label).toBe('Test');
  });

  it('lists all registered types', () => {
    registry.register(new TestDocType());
    registry.register(new AnotherDocType());
    const all = registry.list();
    const keys = all.map((t) => t.key).sort();
    expect(keys).toEqual(['another', 'test']);
  });

  it('prevents duplicate key registration', () => {
    registry.register(new TestDocType());
    expect(() => registry.register(new TestDocType())).toThrowError(/already registered/i);
  });

  it('unregister removes a type', () => {
    registry.register(new TestDocType());
    expect(registry.has('test')).toBe(true);
    const removed = registry.unregister('test');
    expect(removed).toBe(true);
    expect(registry.has('test')).toBe(false);
  });
});

