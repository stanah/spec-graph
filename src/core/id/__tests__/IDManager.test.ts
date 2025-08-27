import { describe, it, expect } from 'vitest';
import { IDManager } from '../IDManager';

describe('IDManager', () => {
  it('generates unique IDs with default settings', () => {
    const manager = new IDManager();
    const set = new Set<string>();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      const id = manager.generate();
      expect(id).toMatch(/^[A-Za-z0-9_-]{10,}$/); // nanoid default alphabet
      set.add(id);
    }
    expect(set.size).toBe(count);
  });

  it('applies prefix when provided', () => {
    const manager = new IDManager({ prefix: 'node_' });
    const id = manager.generate();
    expect(id.startsWith('node_')).toBe(true);
    expect(id.replace('node_', '')).toMatch(/^[A-Za-z0-9_-]{10,}$/);
  });

  it('assign() returns generated id when auto is enabled', () => {
    const manager = new IDManager({ auto: true, prefix: 'p:' });
    const id = manager.assign();
    expect(id.startsWith('p:')).toBe(true);
  });

  it('assign() uses provided manual id when auto is disabled', () => {
    const manager = new IDManager({ auto: false, prefix: 'item-' });
    const id = manager.assign('123');
    expect(id).toBe('item-123');
  });

  it('assign() throws when auto is disabled and no id provided', () => {
    const manager = new IDManager({ auto: false });
    expect(() => manager.assign()).toThrowError();
  });

  it('does not duplicate prefix for manual ids that already include it', () => {
    const manager = new IDManager({ auto: false, prefix: 'x_' });
    const id = manager.assign('x_abc');
    expect(id).toBe('x_abc');
  });
});

