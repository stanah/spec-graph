import { describe, it, expect } from 'vitest';
import { schemaManager } from '../schemaManager';
import { listTemplateNames, getTemplate } from '../schemaTemplates';

describe('SchemaManager versioning & templates', () => {
  it('registers templates as versions and switches active schema', () => {
    const names = listTemplateNames();
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) {
      const t = getTemplate(n);
      schemaManager.registerSchema(n, t.version, t.schema, { description: t.description });
    }

    // pick one template and set it active
    const name = names[0];
    const infoList = schemaManager.listSchemaVersions(name);
    expect(infoList.length).toBe(1);
    const v = infoList[0].version;
    schemaManager.setActiveSchema(name, v);
    const active = schemaManager.getActiveSchemaInfo();
    expect(active?.name).toBe(name);
    expect(active?.version).toBe(v);
  });

  it('migrates (logs required differences)', () => {
    const n = 'mindmap-basic';
    const a = getTemplate('mindmap-basic');
    const b = getTemplate('mindmap-extended');
    schemaManager.registerSchema(n, a.version, a.schema);
    schemaManager.registerSchema(n, b.version, b.schema);
    const mig = schemaManager.migrate(n, a.version, b.version);
    expect(mig.ok).toBe(true);
    expect(Array.isArray(mig.log)).toBe(true);
  });
});

