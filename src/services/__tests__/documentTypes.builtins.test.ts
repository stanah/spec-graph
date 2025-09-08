import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentTypeRegistry } from '../documentTypes';
import { RequirementsDocumentType, StakeholdersDocumentType, registerDefaultDocumentTypes } from '../documentTypes.builtins';

describe('Built-in Document Types', () => {
  let registry: DocumentTypeRegistry;

  beforeEach(() => {
    registry = new DocumentTypeRegistry();
  });

  it('exports Requirements and Stakeholders types with stable keys', () => {
    const req = new RequirementsDocumentType();
    const st = new StakeholdersDocumentType();
    expect(req.key).toBe('requirements');
    expect(st.key).toBe('stakeholders');
    expect(req.label).toBeTypeOf('string');
    expect(st.label).toBeTypeOf('string');
  });

  it('registerDefaultDocumentTypes registers both without duplication', () => {
    registerDefaultDocumentTypes(registry);
    const keys = registry.list().map(t => t.key).sort();
    expect(keys).toEqual(['design', 'requirements', 'stakeholders', 'tasks']);
  });

  it('provides minimal schemas for each type', () => {
    const req = new RequirementsDocumentType();
    const st = new StakeholdersDocumentType();
    const reqSchema = req.getSchema?.();
    const stSchema = st.getSchema?.();
    expect(reqSchema && typeof reqSchema).toBe('object');
    expect(stSchema && typeof stSchema).toBe('object');
    // 最低限のJSON Schema形状
    expect((reqSchema as any)?.type).toBe('object');
    expect((stSchema as any)?.type).toBe('object');
  });
});

