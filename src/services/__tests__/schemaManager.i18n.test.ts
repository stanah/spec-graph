import { describe, it, expect } from 'vitest';
import { schemaManager, type JsonSchema } from '../schemaManager';

describe('SchemaManager i18n', () => {
  it('Ajv custom keyword messages are localized (ja/en)', () => {
    const schema: JsonSchema = { type: 'object', uniqueNodeIds: true as unknown as boolean };
    const data = { root: { id: 'x', title: 'x', children: [{ id: 'dup' }, { id: 'dup' }] } };

    schemaManager.setLocale('ja');
    const jaRes = schemaManager.validateWithAjv(schema, data);
    expect(jaRes.valid).toBe(false);
    expect(jaRes.errors[0].message).toMatch(/一意|必要/);

    schemaManager.setLocale('en');
    const enRes = schemaManager.validateWithAjv(schema, data);
    expect(enRes.valid).toBe(false);
    expect(enRes.errors[0].message).toMatch(/unique/);
  });

  it('Zod invalid_type is localized', () => {
    const bad = { version: 1, title: 2, root: { id: 3, title: 4 } } as any;
    schemaManager.setLocale('en');
    const enRes = schemaManager.validateWithZod(bad);
    expect(enRes.valid).toBe(false);
    // message may be generic but should be translated label when code matches
    expect(enRes.errors.some(e => /Invalid type/.test(e.message))).toBe(true);

    schemaManager.setLocale('ja');
    const jaRes = schemaManager.validateWithZod(bad);
    expect(jaRes.valid).toBe(false);
    expect(jaRes.errors.some(e => /型が不正/.test(e.message))).toBe(true);
  });
});

