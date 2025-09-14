import { describe, it, expect } from 'vitest';
import type { MindmapData } from '../../types';
import { DataIntegrityChecker } from '../dataIntegrityChecker';

const makeData = (): MindmapData => ({
  version: '1.0',
  title: 'Doc',
  schema: { version: '1.0' },
  root: {
    id: 'ROOT',
    title: 'Root [[A-1]]',
    description: 'root desc',
    children: [
      { id: 'A-1', title: 'Node A', description: 'see [[B-2]]', children: [] },
      { id: 'B-2', title: 'Node B', description: 'bad [[X-404]]', children: [ { id: 'B-2-1', title: 'Child', children: [] } ] },
    ]
  }
});

describe('DataIntegrityChecker (基盤)', () => {
  it('全ノードIDを収集できる', () => {
    const data = makeData();
    const checker = new DataIntegrityChecker(data);
    const ids = checker.collectIds();
    expect(Array.from(ids).sort()).toEqual(['A-1','B-2','B-2-1','ROOT'].sort());
  });

  it('テキストからリンク参照を抽出し、ダングリング参照を検出できる', () => {
    const data = makeData();
    const checker = new DataIntegrityChecker(data);
    const refs = checker.collectReferences();
    // ROOTのタイトルとA-1のdesc、B-2のdescにそれぞれ1つずつ = 3
    expect(refs.length).toBe(3);

    const dangling = checker.detectDanglingReferences();
    // X-404 が1件
    expect(dangling.length).toBe(1);
    expect(dangling[0].token.id).toBe('X-404');
    // どのノード由来か識別できる
    expect(typeof dangling[0].sourceNodeId).toBe('string');
  });
});

