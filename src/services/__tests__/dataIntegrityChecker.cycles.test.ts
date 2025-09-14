import { describe, it, expect } from 'vitest';
import type { MindmapData } from '../../types';
import { DataIntegrityChecker } from '../dataIntegrityChecker';

const makeData = (): MindmapData => ({
  version: '1.0',
  title: 'Doc',
  schema: { version: '1.0' },
  root: {
    id: 'ROOT',
    title: 'Root',
    children: [
      { id: 'A-1', title: 'A', description: '', children: [] },
      { id: 'B-2', title: 'B', description: '', children: [] },
      { id: 'C-3', title: 'C', description: '', children: [] },
    ]
  }
});

describe('DataIntegrityChecker - 循環参照検出', () => {
  it('循環がない場合は空配列', () => {
    const data = makeData();
    // A -> B のみ
    (data.root.children![0]!.description as string) = 'ref [[B-2]]';
    const checker = new DataIntegrityChecker(data);
    expect(checker.detectCycles()).toEqual([]);
  });

  it('2ノード循環を検出できる (A<->B)', () => {
    const data = makeData();
    // A -> B, B -> A
    (data.root.children![0]!.description as string) = 'ref [[B-2]]';
    (data.root.children![1]!.description as string) = 'ref [[A-1]]';
    const checker = new DataIntegrityChecker(data);
    expect(checker.detectCycles()).toEqual([[ 'A-1', 'B-2' ]]);
  });

  it('3ノード循環を検出できる (A->B->C->A)', () => {
    const data = makeData();
    (data.root.children![0]!.description as string) = 'ref [[B-2]]';
    (data.root.children![1]!.description as string) = 'ref [[C-3]]';
    (data.root.children![2]!.description as string) = 'ref [[A-1]]';
    const checker = new DataIntegrityChecker(data);
    expect(checker.detectCycles()).toEqual([[ 'A-1', 'B-2', 'C-3' ]]);
  });

  it('自己ループを検出できる (A->A)', () => {
    const data = makeData();
    (data.root.children![0]!.description as string) = 'self [[A-1]]';
    const checker = new DataIntegrityChecker(data);
    expect(checker.detectCycles()).toEqual([[ 'A-1' ]]);
  });
});

