import { describe, it, expect } from 'vitest';
import { schemaManager } from '../schemaManager';

const validData = {
  version: '1.0',
  title: 'テスト',
  root: { id: 'root', title: 'ルート', children: [] },
};

describe('SchemaManager (core)', () => {
  it('validateWithZod: 正常データで成功する', () => {
    const result = schemaManager.validateWithZod(validData);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validateWithZod: 不正データでエラーを返す', () => {
    const invalid = { ...validData, root: { id: 123, title: null } } as unknown;
    const result = schemaManager.validateWithZod(invalid);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('getCurrentSchemaInfo: 情報を返す', () => {
    const info = schemaManager.getCurrentSchemaInfo();
    expect(info.engine).toBe('zod');
    expect(Array.isArray(info.supports)).toBe(true);
  });
});

