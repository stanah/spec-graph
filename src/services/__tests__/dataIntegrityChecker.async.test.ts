import { describe, it, expect, vi } from 'vitest';
import type { MindmapData } from '../../types';
import { DataIntegrityChecker } from '../dataIntegrityChecker';

const makeBadData = (): MindmapData => ({
  version: '1.0',
  title: 'Doc',
  schema: { version: '1.0' },
  root: {
    id: 'ROOT',
    title: 'Root [[X-404]]',
    children: [ { id: 'A-1', title: 'A', description: '-> [[A-1]]', children: [] } ]
  }
});

describe('DataIntegrityChecker - 非同期チェックと通知', () => {
  it('runInBackground がレポート完了通知を発火し、結果を返す', async () => {
    const data = makeBadData();
    const checker = new DataIntegrityChecker(data);

    const onReport = vi.fn();
    const onIssue = vi.fn();
    checker.on('report', onReport);
    checker.on('issue', onIssue);

    const report = await checker.runInBackground();

    expect(onReport).toHaveBeenCalledTimes(1);
    // 問題があるため issue も少なくとも1回は呼ばれる
    expect(onIssue.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(report.danglingReferences.length).toBeGreaterThan(0);
    expect(report.cycles).toEqual([['A-1']]);
  });
});

