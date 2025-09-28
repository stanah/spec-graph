/**
 * マインドマップ分析器のテストスイート
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  MindmapAnalyzer, 
  OptimizedMindmapAnalyzer,
  RealTimeCircularReferenceDetector,
  ParallelCircularReferenceDetector
} from '../mindmapAnalyzer';
import type { MindmapData, MindmapNode } from '../../types';

describe('MindmapAnalyzer', () => {
  let simpleMindmapData: MindmapData;
  let complexMindmapData: MindmapData;
  let circularReferenceMindmapData: MindmapData;

  beforeEach(() => {
    // シンプルなテストデータ
    simpleMindmapData = {
      root: {
        id: 'root',
        title: 'ルートノード',
        description: 'ルートノードの説明',
        priority: 'high',
        status: 'in-progress',
        tags: ['プロジェクト', '重要'],
        children: [
          {
            id: 'child1',
            title: '子ノード1',
            priority: 'medium',
            status: 'todo',
            tags: ['タスク'],
            children: [
              {
                id: 'grandchild1',
                title: '孫ノード1',
                description: '孫ノードの説明',
                customFields: { type: 'feature' }
              }
            ]
          },
          {
            id: 'child2',
            title: '子ノード2',
            status: 'done',
            tags: ['完了']
          }
        ]
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z'
      }
    };

    // 複雑なテストデータ（深い階層、多様なメタデータ）
    complexMindmapData = {
      root: {
        id: 'complex-root',
        title: '複雑なマインドマップ',
        children: Array.from({ length: 5 }, (_, i) => ({
          id: `branch-${i}`,
          title: `ブランチ ${i}`,
          priority: i % 2 === 0 ? 'high' : 'low',
          status: ['todo', 'in-progress', 'done'][i % 3] as any,
          tags: [`tag-${i}`, 'common'],
          children: Array.from({ length: 3 }, (_, j) => ({
            id: `branch-${i}-child-${j}`,
            title: `子ノード ${i}-${j}`,
            description: `説明 ${i}-${j}`,
            customFields: { category: `cat-${j}`, value: j * 10 },
            children: j === 0 ? Array.from({ length: 2 }, (_, k) => ({
              id: `branch-${i}-child-${j}-grandchild-${k}`,
              title: `孫ノード ${i}-${j}-${k}`,
              priority: 'medium',
              tags: [`deep-tag-${k}`]
            })) : undefined
          }))
        }))
      },
      metadata: {
        createdAt: '2024-01-01T00:00:00Z'
      }
    };
  });

  describe('collectStatistics', () => {
    it('空のマインドマップに対して正しく動作する', () => {
      const emptyData: MindmapData = { metadata: {} };
      const stats = MindmapAnalyzer.collectStatistics(emptyData);

      expect(stats.totalNodes).toBe(0);
      expect(stats.maxDepth).toBe(0);
      expect(stats.averageBranching).toBe(0);
      expect(stats.structure.leafNodes).toBe(0);
      expect(stats.structure.branchNodes).toBe(0);
    });

    it('シンプルなマインドマップの統計を正しく収集する', () => {
      const stats = MindmapAnalyzer.collectStatistics(simpleMindmapData);

      expect(stats.totalNodes).toBe(4); // root + 2 children + 1 grandchild
      expect(stats.maxDepth).toBe(2); // root(0) -> child(1) -> grandchild(2)
      expect(stats.structure.leafNodes).toBe(2); // grandchild1, child2
      expect(stats.structure.branchNodes).toBe(2); // root, child1

      // メタデータ統計
      expect(stats.nodeStats.withPriority).toBe(2); // root, child1
      expect(stats.nodeStats.withStatus).toBe(3); // root, child1, child2
      expect(stats.nodeStats.withTags).toBe(3); // root, child1, child2
      expect(stats.nodeStats.withDescription).toBe(2); // root, grandchild1
      expect(stats.nodeStats.withCustomFields).toBe(1); // grandchild1

      // 分布統計
      expect(stats.distribution.priorities['high']).toBe(1);
      expect(stats.distribution.priorities['medium']).toBe(1);
      expect(stats.distribution.statuses['in-progress']).toBe(1);
      expect(stats.distribution.statuses['todo']).toBe(1);
      expect(stats.distribution.statuses['done']).toBe(1);
      expect(stats.distribution.tags['プロジェクト']).toBe(1);
      expect(stats.distribution.tags['重要']).toBe(1);
      expect(stats.distribution.tags['タスク']).toBe(1);
      expect(stats.distribution.tags['完了']).toBe(1);
    });

    it('複雑なマインドマップの統計を正しく収集する', () => {
      const stats = MindmapAnalyzer.collectStatistics(complexMindmapData);

      // 期待されるノード数: root(1) + branch(5) + child(15) + grandchild(10) = 31
      expect(stats.totalNodes).toBe(31);
      expect(stats.maxDepth).toBe(3);

      // 分岐ノード: root(1) + branch with children(5) + child with grandchildren(5) = 11
      expect(stats.structure.branchNodes).toBe(11);
      
      // リーフノード: child without grandchildren(10) + all grandchildren(10) = 20
      expect(stats.structure.leafNodes).toBe(20);

      // 優先度分布
      expect(stats.distribution.priorities['high']).toBe(3); // branches 0, 2, 4
      expect(stats.distribution.priorities['low']).toBe(2); // branches 1, 3
      expect(stats.distribution.priorities['medium']).toBe(10); // all grandchildren

      // タグ分布
      expect(stats.distribution.tags['common']).toBe(5); // all branches
    });

    it('深度分布を正しく計算する', () => {
      const stats = MindmapAnalyzer.collectStatistics(simpleMindmapData);

      expect(stats.structure.depthDistribution[0]).toBe(1); // root
      expect(stats.structure.depthDistribution[1]).toBe(2); // child1, child2
      expect(stats.structure.depthDistribution[2]).toBe(1); // grandchild1
    });

    it('平均分岐数を正しく計算する', () => {
      const stats = MindmapAnalyzer.collectStatistics(simpleMindmapData);
      
      // 総子ノード数 = 3, 分岐ノード数 = 2
      // 平均分岐数 = 3 / 2 = 1.5
      expect(stats.averageBranching).toBe(1.5);
    });
  });

  describe('detectCircularReferences', () => {
    beforeEach(() => {
      // 循環参照を含むテストデータ（概念的）
      // 実際のJavaScriptでは直接的な循環参照は作成困難なため、
      // IDベースの循環参照検出をテストする場合は、より複雑な構造が必要
      circularReferenceMindmapData = {
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            {
              id: 'child1',
              title: '子1',
              children: [
                {
                  id: 'child2',
                  title: '子2',
                  children: [
                    {
                      id: 'child1', // 循環参照（同じIDが再度現れる）
                      title: '子1（循環）'
                    }
                  ]
                }
              ]
            }
          ]
        },
        metadata: {}
      };
    });

    it('循環参照のないマインドマップでは問題を検出しない', () => {
      const issues = MindmapAnalyzer.detectCircularReferences(simpleMindmapData);
      expect(issues).toHaveLength(0);
    });

    it('循環参照を正しく検出する', () => {
      const issues = MindmapAnalyzer.detectCircularReferences(circularReferenceMindmapData);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe('circular_reference');
      expect(issues[0].nodeId).toBe('child1');
      expect(issues[0].severity).toBe('error');
      expect(issues[0].path).toEqual(['child1', 'child2', 'child1']);
    });
  });

  describe('detectOrphanedNodes', () => {
    it('孤立ノードのないマインドマップでは問題を検出しない', () => {
      const issues = MindmapAnalyzer.detectOrphanedNodes(simpleMindmapData);
      expect(issues).toHaveLength(0);
    });

    it('ルートから到達できないノードを検出する', () => {
      const floatingNode: MindmapNode = {
        id: 'floating-node',
        title: '浮遊ノード',
        metadata: {
          parentId: 'child1'
        }
      };

      const issues = MindmapAnalyzer.detectOrphanedNodes(simpleMindmapData, {
        additionalNodes: [floatingNode]
      });

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        type: 'orphaned_node',
        nodeId: 'floating-node',
        severity: 'warning'
      });
      expect(issues[0].message).toContain('floating-node');
      expect(issues[0].message).toContain('child1');
    });

    it('親情報が不整合なノードを検出し詳細を含める', () => {
      const danglingNode: MindmapNode = {
        id: 'dangling-node',
        title: '孤児ノード',
        metadata: {
          parentId: 'missing-parent'
        }
      };

      const issues = MindmapAnalyzer.detectOrphanedNodes(simpleMindmapData, {
        additionalNodes: [danglingNode]
      });

      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        type: 'orphaned_node',
        nodeId: 'dangling-node',
        severity: 'error'
      });
      expect(issues[0].message).toContain('dangling-node');
      expect(issues[0].message).toContain('missing-parent');
    });

    it('親が到達可能な孤立ノードには再接続提案を提示する', () => {
      const detachedNode: MindmapNode = {
        id: 'detached-node',
        title: '切り離されたノード',
        metadata: {
          parentId: 'child1'
        }
      };

      const issues = MindmapAnalyzer.detectOrphanedNodes(simpleMindmapData, {
        additionalNodes: [detachedNode]
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].cause).toBe('detached_from_parent');
      expect(issues[0].relatedNodeIds).toContain('child1');
      expect(issues[0].suggestedFixes).toBeDefined();
      expect(issues[0].suggestedFixes![0]).toMatchObject({
        type: 'attach',
        targetParentId: 'child1',
        confidence: 'high'
      });
    });

    it('親ノードが存在しない孤立ノードには原因とルート直下への接続提案を返す', () => {
      const ghostNode: MindmapNode = {
        id: 'ghost-node',
        title: '親不明ノード'
      };

      const issues = MindmapAnalyzer.detectOrphanedNodes(simpleMindmapData, {
        additionalNodes: [ghostNode]
      });

      expect(issues).toHaveLength(1);
      expect(issues[0].cause).toBe('missing_parent_reference');
      expect(issues[0].suggestedFixes).toBeDefined();
      expect(issues[0].suggestedFixes![0]).toMatchObject({
        type: 'attach',
        targetParentId: 'root',
        confidence: 'low'
      });
    });
  });

  describe('analyzeStructure', () => {
    it('包括的な構造分析を実行する', () => {
      const result = MindmapAnalyzer.analyzeStructure(simpleMindmapData);

      expect(result.statistics).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.statistics.totalNodes).toBe(4);
      expect(result.issues).toHaveLength(0);
    });
  });
});

describe('OptimizedMindmapAnalyzer', () => {
  let largeMindmapData: MindmapData;

  beforeEach(() => {
    // 大規模データの生成（パフォーマンステスト用）
    const generateLargeTree = (id: string, depth: number, maxDepth: number, branchFactor: number): MindmapNode => {
      const node: MindmapNode = {
        id,
        title: `ノード ${id}`,
        priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as any,
        status: ['todo', 'in-progress', 'done'][Math.floor(Math.random() * 3)] as any,
        tags: [`tag-${depth}`, `tag-${Math.floor(Math.random() * 10)}`],
      };

      if (depth < maxDepth) {
        node.children = Array.from({ length: branchFactor }, (_, i) => 
          generateLargeTree(`${id}-${i}`, depth + 1, maxDepth, branchFactor)
        );
      }

      return node;
    };

    largeMindmapData = {
      root: generateLargeTree('root', 0, 5, 3), // 深度5、分岐因子3 = 約364ノード
      metadata: {}
    };
  });

  describe('collectStatisticsOptimized', () => {
    it('大規模データに対して効率的に統計を収集する', () => {
      const startTime = performance.now();
      const stats = OptimizedMindmapAnalyzer.collectStatisticsOptimized(largeMindmapData);
      const endTime = performance.now();

      expect(stats.totalNodes).toBeGreaterThan(300);
      expect(stats.maxDepth).toBe(5);
      expect(endTime - startTime).toBeLessThan(100); // 100ms以下で完了することを期待
    });

    it('最大深度制限オプションが正しく動作する', () => {
      const stats = OptimizedMindmapAnalyzer.collectStatisticsOptimized(largeMindmapData, {
        maxDepth: 2
      });

      expect(stats.maxDepth).toBeLessThanOrEqual(2);
    });

    it('サンプリングレートオプションが正しく動作する', () => {
      const fullStats = OptimizedMindmapAnalyzer.collectStatisticsOptimized(largeMindmapData);
      const sampledStats = OptimizedMindmapAnalyzer.collectStatisticsOptimized(largeMindmapData, {
        samplingRate: 0.5
      });

      // サンプリングにより、ノード数が減少することを期待
      expect(sampledStats.totalNodes).toBeLessThanOrEqual(fullStats.totalNodes);
    });

    it('分布統計の無効化オプションが正しく動作する', () => {
      const stats = OptimizedMindmapAnalyzer.collectStatisticsOptimized(largeMindmapData, {
        includeDistribution: false
      });

      expect(stats.nodeStats.withPriority).toBe(0);
      expect(stats.nodeStats.withStatus).toBe(0);
      expect(stats.nodeStats.withTags).toBe(0);
      expect(Object.keys(stats.distribution.priorities)).toHaveLength(0);
      expect(Object.keys(stats.distribution.statuses)).toHaveLength(0);
      expect(Object.keys(stats.distribution.tags)).toHaveLength(0);
    });
  });

  describe('パフォーマンステスト', () => {
    it('10,000ノード以上のデータでも合理的な時間で処理できる', () => {
      // より大規模なデータ生成
      const veryLargeMindmapData: MindmapData = {
        root: {
          id: 'huge-root',
          title: '巨大なルート',
          children: Array.from({ length: 100 }, (_, i) => ({
            id: `huge-branch-${i}`,
            title: `巨大ブランチ ${i}`,
            children: Array.from({ length: 100 }, (_, j) => ({
              id: `huge-leaf-${i}-${j}`,
              title: `巨大リーフ ${i}-${j}`,
              priority: 'medium',
              status: 'todo',
              tags: [`tag-${i}`, `tag-${j}`],
              description: `説明 ${i}-${j}`,
              customFields: { index: i * 100 + j }
            }))
          }))
        },
        metadata: {}
      };

      const startTime = performance.now();
      const stats = OptimizedMindmapAnalyzer.collectStatisticsOptimized(veryLargeMindmapData);
      const endTime = performance.now();

      expect(stats.totalNodes).toBe(10101); // 1 + 100 + 10000
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以下で完了することを期待
    });

    it('メモリ効率的な処理を行う', () => {
      // メモリ使用量の測定は環境依存のため、基本的な動作確認のみ
      const stats = OptimizedMindmapAnalyzer.collectStatisticsOptimized(largeMindmapData, {
        samplingRate: 0.8, // 80%サンプリング（確実にノードが取得されるように）
        includeDistribution: false
      });

      expect(stats.totalNodes).toBeGreaterThan(0);
      expect(stats.maxDepth).toBeGreaterThan(0);
    });
  });
});

describe('統計情報の精度テスト', () => {
  it('様々な構造パターンで正確な統計を生成する', () => {
    // 深い単一パス
    const deepSinglePath: MindmapData = {
      root: {
        id: 'root',
        title: 'ルート',
        children: [{
          id: 'level1',
          title: 'レベル1',
          children: [{
            id: 'level2',
            title: 'レベル2',
            children: [{
              id: 'level3',
              title: 'レベル3',
              children: [{
                id: 'level4',
                title: 'レベル4'
              }]
            }]
          }]
        }]
      },
      metadata: {}
    };

    const stats = MindmapAnalyzer.collectStatistics(deepSinglePath);

    expect(stats.totalNodes).toBe(5);
    expect(stats.maxDepth).toBe(4);
    expect(stats.structure.leafNodes).toBe(1);
    expect(stats.structure.branchNodes).toBe(4);
    expect(stats.averageBranching).toBe(1); // 4 children / 4 branch nodes = 1

    // 広い浅いツリー
    const wideFlatTree: MindmapData = {
      root: {
        id: 'root',
        title: 'ルート',
        children: Array.from({ length: 10 }, (_, i) => ({
          id: `child${i}`,
          title: `子${i}`
        }))
      },
      metadata: {}
    };

    const wideStats = MindmapAnalyzer.collectStatistics(wideFlatTree);

    expect(wideStats.totalNodes).toBe(11);
    expect(wideStats.maxDepth).toBe(1);
    expect(wideStats.structure.leafNodes).toBe(10);
    expect(wideStats.structure.branchNodes).toBe(1);
    expect(wideStats.averageBranching).toBe(10); // 10 children / 1 branch node = 10
  });
});

describe('RealTimeCircularReferenceDetector', () => {
  let detector: RealTimeCircularReferenceDetector;

  beforeEach(() => {
    detector = new RealTimeCircularReferenceDetector();
  });

  describe('checkNodeAddition', () => {
    it('循環参照のない追加を正しく処理する', () => {
      const issue1 = detector.checkNodeAddition('child1', 'root');
      expect(issue1).toBeNull();

      const issue2 = detector.checkNodeAddition('grandchild1', 'child1');
      expect(issue2).toBeNull();
    });

    it('直接的な循環参照を検出する', () => {
      detector.checkNodeAddition('child1', 'root');
      
      // child1の子として自分自身（root）を追加しようとする
      const issue = detector.checkNodeAddition('root', 'child1');
      
      expect(issue).not.toBeNull();
      expect(issue!.type).toBe('circular_reference');
      expect(issue!.nodeId).toBe('root');
      expect(issue!.path).toEqual(['root', 'child1', 'root']);
    });

    it('間接的な循環参照を検出する', () => {
      detector.checkNodeAddition('child1', 'root');
      detector.checkNodeAddition('child2', 'child1');
      detector.checkNodeAddition('child3', 'child2');
      
      // child3の子としてrootを追加しようとする（4段階の循環）
      const issue = detector.checkNodeAddition('root', 'child3');
      
      expect(issue).not.toBeNull();
      expect(issue!.type).toBe('circular_reference');
      expect(issue!.nodeId).toBe('root');
      expect(issue!.path).toEqual(['root', 'child1', 'child2', 'child3', 'root']);
    });

    it('自己参照を検出する', () => {
      const issue = detector.checkNodeAddition('node1', 'node1');
      
      expect(issue).not.toBeNull();
      expect(issue!.type).toBe('circular_reference');
      expect(issue!.nodeId).toBe('node1');
    });
  });

  describe('cleanupNode', () => {
    it('ノード削除時にキャッシュを正しくクリーンアップする', () => {
      detector.checkNodeAddition('child1', 'root');
      detector.checkNodeAddition('child2', 'child1');
      
      // child1を削除
      detector.cleanupNode('child1');
      
      // child1の再追加が可能になることを確認
      const issue = detector.checkNodeAddition('child1', 'root');
      expect(issue).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('全キャッシュをクリアする', () => {
      detector.checkNodeAddition('child1', 'root');
      detector.checkNodeAddition('child2', 'child1');
      
      detector.clearCache();
      
      // キャッシュクリア後は以前の関係が忘れられる
      const issue = detector.checkNodeAddition('root', 'child2');
      expect(issue).toBeNull();
    });
  });
});

describe('ParallelCircularReferenceDetector', () => {
  let largeMindmapForParallel: MindmapData;

  beforeEach(() => {
    // 並列処理テスト用の大規模データ
    largeMindmapForParallel = {
      root: {
        id: 'parallel-root',
        title: '並列ルート',
        children: Array.from({ length: 8 }, (_, i) => ({
          id: `branch-${i}`,
          title: `ブランチ ${i}`,
          children: Array.from({ length: 10 }, (_, j) => ({
            id: `branch-${i}-child-${j}`,
            title: `子 ${i}-${j}`,
            children: Array.from({ length: 5 }, (_, k) => ({
              id: `branch-${i}-child-${j}-grandchild-${k}`,
              title: `孫 ${i}-${j}-${k}`
            }))
          }))
        }))
      },
      metadata: {}
    };
  });

  describe('detectCircularReferencesParallel', () => {
    it('並列処理で循環参照のないデータを正しく処理する', async () => {
      const issues = await ParallelCircularReferenceDetector.detectCircularReferencesParallel(
        largeMindmapForParallel,
        { concurrency: 4 }
      );
      
      expect(issues).toHaveLength(0);
    });

    it('並列処理で循環参照を検出する', async () => {
      // 通常の検出方法で確実に循環参照があることを確認してからテスト
      const circularData: MindmapData = {
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            {
              id: 'branch1',
              title: 'ブランチ1',
              children: [
                { id: 'child1', title: '子1' },
                { id: 'child2', title: '子2' }
              ]
            },
            {
              id: 'branch2', 
              title: 'ブランチ2',
              children: [
                { id: 'child3', title: '子3' },
                { id: 'root', title: 'ルート（循環）' } // 循環参照
              ]
            }
          ]
        },
        metadata: {}
      };

      // まず通常の方法で循環参照があることを確認
      const normalIssues = MindmapAnalyzer.detectCircularReferences(circularData);
      expect(normalIssues.length).toBeGreaterThan(0);

      const issues = await ParallelCircularReferenceDetector.detectCircularReferencesParallel(
        circularData,
        { concurrency: 2 }
      );
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.type === 'circular_reference')).toBe(true);
    });

    it('タイムアウトが発生した場合にフォールバックする', async () => {
      const issues = await ParallelCircularReferenceDetector.detectCircularReferencesParallel(
        largeMindmapForParallel,
        { timeout: 1 } // 極端に短いタイムアウト
      );
      
      // フォールバックが動作して結果が返される
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('detectCircularReferencesWithProgress', () => {
    it('プログレス報告付きで循環参照検出を実行する', async () => {
      const progressReports: Array<{ current: number; total: number; percentage: number }> = [];
      
      const issues = await ParallelCircularReferenceDetector.detectCircularReferencesWithProgress(
        largeMindmapForParallel,
        (progress) => {
          progressReports.push({ ...progress });
        }
      );
      
      expect(issues).toHaveLength(0);
      expect(progressReports.length).toBeGreaterThan(0);
      
      // プログレスが増加していることを確認
      expect(progressReports[0].current).toBeLessThan(progressReports[progressReports.length - 1].current);
      
      // 最後のプログレスが100%であることを確認
      const lastProgress = progressReports[progressReports.length - 1];
      expect(lastProgress.percentage).toBe(100);
    });

    it('空のデータでも正しく動作する', async () => {
      const emptyData: MindmapData = { metadata: {} };
      const progressReports: any[] = [];
      
      const issues = await ParallelCircularReferenceDetector.detectCircularReferencesWithProgress(
        emptyData,
        (progress) => progressReports.push(progress)
      );
      
      expect(issues).toHaveLength(0);
      expect(progressReports).toHaveLength(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('不正なデータ構造でもエラーを発生させない', async () => {
      const invalidData = {
        root: null,
        metadata: {}
      } as any;
      
      const issues = await ParallelCircularReferenceDetector.detectCircularReferencesParallel(invalidData);
      expect(issues).toHaveLength(0);
    });
  });
});

describe('拡張循環参照検出テスト', () => {
  describe('複雑な循環パターン', () => {
    it('多段階循環参照を検出する', () => {
      const complexCircularData: MindmapData = {
        root: {
          id: 'A',
          title: 'ノードA',
          children: [{
            id: 'B',
            title: 'ノードB',
            children: [{
              id: 'C',
              title: 'ノードC',
              children: [{
                id: 'D',
                title: 'ノードD',
                children: [{
                  id: 'B', // B->C->D->B の循環
                  title: 'ノードB（循環）'
                }]
              }]
            }]
          }]
        },
        metadata: {}
      };

      const issues = MindmapAnalyzer.detectCircularReferences(complexCircularData);
      
      expect(issues).toHaveLength(1);
      expect(issues[0].nodeId).toBe('B');
      expect(issues[0].path).toEqual(['B', 'C', 'D', 'B']);
    });

    it('複数の独立した循環参照を検出する', () => {
      const multipleCircularData: MindmapData = {
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            {
              id: 'branch1',
              title: 'ブランチ1',
              children: [{
                id: 'loop1',
                title: 'ループ1',
                children: [{
                  id: 'branch1', // 第1の循環
                  title: 'ブランチ1（循環）'
                }]
              }]
            },
            {
              id: 'branch2',
              title: 'ブランチ2',
              children: [{
                id: 'loop2',
                title: 'ループ2',
                children: [{
                  id: 'branch2', // 第2の循環
                  title: 'ブランチ2（循環）'
                }]
              }]
            }
          ]
        },
        metadata: {}
      };

      const issues = MindmapAnalyzer.detectCircularReferences(multipleCircularData);
      
      expect(issues.length).toBeGreaterThanOrEqual(2);
      const nodeIds = issues.map(issue => issue.nodeId);
      expect(nodeIds).toContain('branch1');
      expect(nodeIds).toContain('branch2');
    });
  });
});
