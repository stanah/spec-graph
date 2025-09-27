import { describe, expect, it } from 'vitest';
import { collectFailedTestFiles } from '../vitestFailureParser.js';

const sampleReport = {
  numTotalTestSuites: 3,
  numFailedTestSuites: 2,
  testResults: [
    {
      name: '/path/to/first.test.ts',
      status: 'passed',
    },
    {
      name: '/path/to/second.test.ts',
      status: 'failed',
    },
    {
      name: '/path/to/third.test.ts',
      status: 'failed',
    },
    {
      name: '/path/to/second.test.ts',
      status: 'failed',
    },
  ],
};

describe('collectFailedTestFiles', () => {
  it('重複なしで失敗したテストファイルを返す', () => {
    const result = collectFailedTestFiles(sampleReport);
    expect(result).toEqual([
      '/path/to/second.test.ts',
      '/path/to/third.test.ts',
    ]);
  });

  it('testResults が存在しない場合は空配列を返す', () => {
    const result = collectFailedTestFiles({});
    expect(result).toEqual([]);
  });

  it('status が failed 以外のものは除外される', () => {
    const report = {
      testResults: [
        { name: '/path/a.test.ts', status: 'passed' },
        { name: '/path/b.test.ts', status: 'todo' },
        { name: '/path/c.test.ts', status: 'skipped' },
      ],
    };
    const result = collectFailedTestFiles(report);
    expect(result).toEqual([]);
  });
});
