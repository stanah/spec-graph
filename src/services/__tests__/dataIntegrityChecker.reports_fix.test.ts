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
      { id: 'A-1', title: 'Node A', description: 'see [[B-2]] and [[X-404]]', children: [] },
      { id: 'B-2', title: 'Node B', description: 'back [[A-1]]', children: [] },
      { id: 'C-3', title: 'Node C', description: 'no refs', children: [] },
    ]
  }
});

describe('DataIntegrityChecker - 自動修正とレポート', () => {
  it('未使用IDを検出できる（どこからも参照されないノード）', () => {
    const data = makeData();
    const checker = new DataIntegrityChecker(data);
    const unused = checker.detectUnusedIds();
    // C-3 はどこからも参照されていない前提
    expect(unused).toContain('C-3');
    // ROOT は参照されなくても除外される前提
    expect(unused).not.toContain('ROOT');
  });

  it('ダングリング参照に対する安全な修正提案を返す（リンク削除）', () => {
    const data = makeData();
    const checker = new DataIntegrityChecker(data);
    const fixes = checker.suggestSafeFixes();
    // X-404 へのリンク除去が含まれる
    expect(fixes.some(f => f.type === 'removeLink' && f.nodeId === 'A-1' && f.linkId === 'X-404')).toBe(true);
  });

  it('安全な修正を適用できる（テキストからダングリングリンクが除去される）', () => {
    const data = makeData();
    const checker = new DataIntegrityChecker(data);
    const fixed = checker.applySafeFixes();
    const a1 = fixed.root.children!.find(n => n.id === 'A-1')!;
    expect(a1.description).toContain('see [[B-2]]');
    expect(a1.description).not.toContain('[[X-404]]');
  });

  it('JSONレポートを生成できる（ダングリング/循環/未使用の集計）', () => {
    const data = makeData();
    // 循環を作る: A-1 <-> B-2
    (data.root.children![1]!.description as string) = 'back [[A-1]]';
    const checker = new DataIntegrityChecker(data);
    const report = checker.generateReportJSON();
    expect(report.danglingReferences.length).toBeGreaterThanOrEqual(1);
    expect(report.cycles.some(c => JSON.stringify(c) === JSON.stringify(['A-1','B-2']))).toBe(true);
    expect(report.unusedIds).toContain('C-3');
  });

  it('HTMLレポートを生成できる（最低限の要約を含む）', () => {
    const data = makeData();
    const checker = new DataIntegrityChecker(data);
    const html = checker.generateReportHTML();
    expect(typeof html).toBe('string');
    expect(html).toContain('<html');
    expect(html).toContain('Dangling');
  });
});

