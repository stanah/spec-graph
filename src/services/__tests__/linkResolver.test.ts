import { describe, it, expect } from 'vitest';
import { LinkResolver } from '../linkResolver';
import type { MindmapData } from '../../types';

const makeData = (): MindmapData => ({
  version: '1.0',
  title: 'Doc',
  schema: { version: '1.0' },
  root: {
    id: 'ROOT',
    title: 'Root',
    children: [
      { id: 'A-1', title: 'Node A', children: [] },
      { id: 'B-2', title: 'Node B', children: [ { id: 'B-2-1', title: 'Child', children: [] } ] },
    ]
  }
});

describe('LinkResolver', () => {
  it('[[ID]] を検出してトークン化できる', () => {
    const r = new LinkResolver();
    const tokens = r.parseMarkdownLinks('前文 [[A-1]] 後文');
    expect(tokens.length).toBe(1);
    expect(tokens[0]).toMatchObject({ id: 'A-1', label: 'A-1' });
  });

  it('[[ID|LABEL]] のラベルを解釈できる', () => {
    const r = new LinkResolver();
    const tokens = r.parseMarkdownLinks('参照 [[B-2|仕様B]] です');
    expect(tokens[0]).toMatchObject({ id: 'B-2', label: '仕様B' });
  });

  it('複数リンクを抽出できる', () => {
    const r = new LinkResolver();
    const tokens = r.parseMarkdownLinks('[[A-1]] と [[B-2]] と [[B-2-1|C]]');
    expect(tokens.map(t => t.id)).toEqual(['A-1','B-2','B-2-1']);
  });

  it('IDでノードを解決できる', () => {
    const data = makeData();
    const r = new LinkResolver(data);
    expect(r.resolve('A-1')?.title).toBe('Node A');
    expect(r.resolve('B-2-1')?.title).toBe('Child');
    expect(r.resolve('X-404')).toBeNull();
  });

  it('テキスト内のリンク検証ができる', () => {
    const data = makeData();
    const r = new LinkResolver(data);
    const result = r.validateInline('see [[A-1]] and [[X-404|未知]]');
    expect(result.validCount).toBe(1);
    expect(result.invalidCount).toBe(1);
    expect(result.invalid[0].id).toBe('X-404');
  });
});

