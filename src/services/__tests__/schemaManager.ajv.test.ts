import { describe, it, expect } from 'vitest';
import { schemaManager, type JsonSchema } from '../schemaManager';

const validData = {
  version: '1.0',
  title: 'テスト',
  root: { id: 'root', title: 'ルート', children: [ { id: 'a', title: 'A', children: [] } ] },
};

describe('SchemaManager Ajv custom keywords', () => {
  it('nonEmptyString keyword: rejects empty title', () => {
    const schema: JsonSchema = {
      type: 'object',
      properties: {
        title: { type: 'string', nonEmptyString: true as unknown as boolean },
      },
      required: ['title'],
    };
    const res1 = schemaManager.validateWithAjv(schema, { title: 'ok' });
    expect(res1.valid).toBe(true);

    const res2 = schemaManager.validateWithAjv(schema, { title: '   ' });
    expect(res2.valid).toBe(false);
  });

  it('uniqueNodeIds keyword: detects duplicate ids in tree', () => {
    const schema: JsonSchema = {
      type: 'object',
      uniqueNodeIds: true as unknown as boolean,
    };
    const ok = schemaManager.validateWithAjv(schema, validData);
    expect(ok.valid).toBe(true);

    const bad = {
      ...validData,
      root: { id: 'root', title: 'ルート', children: [ { id: 'dup', title: 'x' }, { id: 'dup', title: 'y' } ] }
    };
    const res = schemaManager.validateWithAjv(schema, bad);
    expect(res.valid).toBe(false);
  });
});

