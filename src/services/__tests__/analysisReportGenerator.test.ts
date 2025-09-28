/**
 * 分析レポート生成器のテストスイート
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnalysisReportGenerator, type ReportFormat, type ComprehensiveAnalysis } from '../analysisReportGenerator';
import type { MindmapData, MindmapNode } from '../../types';

describe('AnalysisReportGenerator', () => {
  let testMindmapData: MindmapData;
  let complexMindmapData: MindmapData;
  let testAnalysis: ComprehensiveAnalysis;

  beforeEach(() => {
    // シンプルなテストデータ
    testMindmapData = {
      root: {
        id: 'root',
        title: 'テストプロジェクト',
        description: 'テスト用のマインドマップ',
        priority: 'high',
        status: 'in-progress',
        tags: ['プロジェクト', '重要'],
        children: [
          {
            id: 'child1',
            title: '機能開発',
            priority: 'high',
            status: 'in-progress',
            tags: ['開発'],
            children: [
              {
                id: 'grandchild1',
                title: 'ユーザー認証',
                priority: 'high',
                status: 'todo',
                description: 'JWT認証の実装',
                customFields: { estimate: '3days' }
              },
              {
                id: 'grandchild2',
                title: 'API設計',
                priority: 'medium',
                status: 'done',
                tags: ['設計']
              }
            ]
          },
          {
            id: 'child2',
            title: 'テスト',
            priority: 'medium',
            status: 'todo',
            tags: ['テスト', 'QA'],
            children: [
              {
                id: 'test1',
                title: '単体テスト',
                priority: 'medium',
                status: 'todo'
              }
            ]
          },
          {
            id: 'child3',
            title: 'ドキュメント',
            priority: 'low',
            status: 'todo',
            tags: ['ドキュメント']
          }
        ]
      },
      metadata: {
        title: 'テストプロジェクト',
        version: '1.0',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-12-01T00:00:00Z'
      }
    };

    // より複雑なテストデータ（深い階層と多くの分岐）
    complexMindmapData = {
      root: {
        id: 'complex-root',
        title: '複雑なプロジェクト',
        children: Array.from({ length: 15 }, (_, i) => ({
          id: `branch-${i}`,
          title: `分岐${i + 1}`,
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          status: i % 4 === 0 ? 'done' : i % 4 === 1 ? 'in-progress' : i % 4 === 2 ? 'todo' : 'blocked',
          children: i < 5 ? Array.from({ length: 8 }, (_, j) => ({
            id: `deep-${i}-${j}`,
            title: `深いノード${i}-${j}`,
            children: j < 3 ? Array.from({ length: 3 }, (_, k) => ({
              id: `very-deep-${i}-${j}-${k}`,
              title: `とても深いノード${i}-${j}-${k}`,
              children: k === 0 ? [{
                id: `extremely-deep-${i}-${j}-${k}`,
                title: `極度に深いノード${i}-${j}-${k}`,
                children: [{
                  id: `ultra-deep-${i}-${j}-${k}`,
                  title: `超深いノード${i}-${j}-${k}`
                }]
              }] : undefined
            })) : undefined
          })) : undefined
        }))
      }
    };
  });

  describe('analyze', () => {
    it('基本的な分析が正常に実行される', () => {
      const analysis = AnalysisReportGenerator.analyze(testMindmapData);

      expect(analysis).toBeDefined();
      expect(analysis.statistics).toBeDefined();
      expect(analysis.issues).toBeDefined();
      expect(analysis.optimization).toBeDefined();
      expect(analysis.visualizations).toBeDefined();
      expect(analysis.timestamp).toBeDefined();
      expect(analysis.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallHealthScore).toBeLessThanOrEqual(100);
    });

    it('統計情報が正確に収集される', () => {
      const analysis = AnalysisReportGenerator.analyze(testMindmapData);
      const stats = analysis.statistics;

      expect(stats.totalNodes).toBe(7); // root + 3 children + 3 grandchildren
      expect(stats.maxDepth).toBe(2); // root -> child -> grandchild
      expect(stats.structure.leafNodes).toBeGreaterThan(0);
      expect(stats.structure.branchNodes).toBeGreaterThan(0);
      expect(stats.nodeStats.withPriority).toBeGreaterThan(0);
      expect(stats.nodeStats.withStatus).toBeGreaterThan(0);
      expect(stats.nodeStats.withTags).toBeGreaterThan(0);
    });

    it('視覚化データが生成される', () => {
      const analysis = AnalysisReportGenerator.analyze(testMindmapData);

      expect(analysis.visualizations).toHaveLength(5); // depth, branching, priority, status, optimization_impact

      const depthViz = analysis.visualizations.find(v => v.type === 'depth_distribution');
      expect(depthViz).toBeDefined();
      expect(depthViz!.title).toBe('階層深度分布');
      expect(depthViz!.data.labels).toEqual(['レベル 0', 'レベル 1', 'レベル 2']);

      const priorityViz = analysis.visualizations.find(v => v.type === 'priority_distribution');
      expect(priorityViz).toBeDefined();
      expect(priorityViz!.data.labels).toContain('high');
      expect(priorityViz!.data.labels).toContain('medium');
      expect(priorityViz!.data.labels).toContain('low');
    });

    it('複雑な構造での分析が正常に動作する', () => {
      const analysis = AnalysisReportGenerator.analyze(complexMindmapData);

      expect(analysis.statistics.totalNodes).toBeGreaterThan(50);
      expect(analysis.statistics.maxDepth).toBeGreaterThan(3);
      expect(analysis.overallHealthScore).toBeLessThan(80); // 複雑な構造なので低いスコア
      expect(analysis.optimization.proposals.length).toBeGreaterThan(0);
    });

    it('健康度スコアが適切に計算される', () => {
      // シンプルな構造は高スコア
      const simpleAnalysis = AnalysisReportGenerator.analyze(testMindmapData);
      expect(simpleAnalysis.overallHealthScore).toBeGreaterThan(60);

      // 複雑な構造は低スコア
      const complexAnalysis = AnalysisReportGenerator.analyze(complexMindmapData);
      expect(complexAnalysis.overallHealthScore).toBeLessThan(simpleAnalysis.overallHealthScore);
    });
  });

  describe('generateReport', () => {
    beforeEach(() => {
      testAnalysis = AnalysisReportGenerator.analyze(testMindmapData);
    });

    describe('HTMLレポート生成', () => {
      it('デフォルト設定でHTMLレポートが生成される', () => {
        const htmlReport = AnalysisReportGenerator.generateReport(testAnalysis, 'html');

        expect(htmlReport).toContain('<!DOCTYPE html>');
        expect(htmlReport).toContain('<html lang="ja">');
        expect(htmlReport).toContain('マインドマップ分析レポート');
        expect(htmlReport).toContain('総合健康度:');
        expect(htmlReport).toContain('📊 統計情報');
        expect(htmlReport).toContain('🔧 最適化提案');
        expect(htmlReport).toContain('📈 視覚化');
        expect(htmlReport).toContain('Chart.js');
      });

      it('カスタム設定でHTMLレポートが生成される', () => {
        const customConfig = {
          title: 'カスタムレポート',
          includeTimestamp: false,
          includeIssues: false,
          customCSS: 'body { background: red; }'
        };

        const htmlReport = AnalysisReportGenerator.generateReport(testAnalysis, 'html', customConfig);

        expect(htmlReport).toContain('カスタムレポート');
        expect(htmlReport).not.toContain('生成日時:');
        expect(htmlReport).not.toContain('⚠️ 検出された問題');
        expect(htmlReport).toContain('background: red;');
      });

      it('視覚化セクションが正しく生成される', () => {
        const htmlReport = AnalysisReportGenerator.generateReport(testAnalysis, 'html');

        expect(htmlReport).toContain('chart-depth_distribution');
        expect(htmlReport).toContain('chart-branching_distribution');
        expect(htmlReport).toContain('window.chartData_');
        expect(htmlReport).toContain('new Chart(canvas');
      });
    });

    describe('Markdownレポート生成', () => {
      it('デフォルト設定でMarkdownレポートが生成される', () => {
        const mdReport = AnalysisReportGenerator.generateReport(testAnalysis, 'markdown');

        expect(mdReport).toContain('# マインドマップ分析レポート');
        expect(mdReport).toContain('## 📊 統計情報');
        expect(mdReport).toContain('| 項目 | 値 |');
        expect(mdReport).toContain('| 総ノード数 |');
        expect(mdReport).toContain('## 🔧 最適化提案');
        expect(mdReport).toContain('## 📈 視覚化データ');
      });

      it('統計テーブルが正しく生成される', () => {
        const mdReport = AnalysisReportGenerator.generateReport(testAnalysis, 'markdown');

        expect(mdReport).toContain('| 総ノード数 | 7 |');
        expect(mdReport).toContain('| 最大深度 | 2 |');
        expect(mdReport).toContain('| リーフノード数 |');
        expect(mdReport).toContain('| 分岐ノード数 |');
      });

      it('視覚化データがテーブル形式で生成される', () => {
        const mdReport = AnalysisReportGenerator.generateReport(testAnalysis, 'markdown');

        expect(mdReport).toContain('### 階層深度分布');
        expect(mdReport).toContain('| 項目 | ノード数 |');
        expect(mdReport).toContain('| レベル 0 |');
        expect(mdReport).toContain('| レベル 1 |');
      });
    });

    describe('JSONレポート生成', () => {
      it('デフォルト設定でJSONレポートが生成される', () => {
        const jsonReport = AnalysisReportGenerator.generateReport(testAnalysis, 'json');
        const parsed = JSON.parse(jsonReport);

        expect(parsed.metadata).toBeDefined();
        expect(parsed.metadata.title).toBe('マインドマップ分析レポート');
        expect(parsed.metadata.overallHealthScore).toBeDefined();
        expect(parsed.statistics).toBeDefined();
        expect(parsed.optimization).toBeDefined();
        expect(parsed.visualizations).toBeDefined();
      });

      it('カスタム設定でJSONレポートが生成される', () => {
        const customConfig = {
          includeStatistics: false,
          includeOptimizations: false
        };

        const jsonReport = AnalysisReportGenerator.generateReport(testAnalysis, 'json', customConfig);
        const parsed = JSON.parse(jsonReport);

        expect(parsed.statistics).toBeUndefined();
        expect(parsed.optimization).toBeUndefined();
        expect(parsed.visualizations).toBeDefined(); // デフォルトで含まれる
      });

      it('JSONが正しい形式で生成される', () => {
        const jsonReport = AnalysisReportGenerator.generateReport(testAnalysis, 'json');

        expect(() => JSON.parse(jsonReport)).not.toThrow();

        const parsed = JSON.parse(jsonReport);
        expect(typeof parsed).toBe('object');
        expect(parsed).not.toBeNull();
      });
    });

    it('サポートされていない形式でエラーが発生する', () => {
      expect(() => {
        AnalysisReportGenerator.generateReport(testAnalysis, 'pdf' as ReportFormat);
      }).toThrow('Unsupported format: pdf');
    });
  });

  describe('エッジケース', () => {
    it('空のマインドマップでも正常に動作する', () => {
      const emptyMindmap: MindmapData = { root: null };
      const analysis = AnalysisReportGenerator.analyze(emptyMindmap);

      expect(analysis.statistics.totalNodes).toBe(0);
      expect(analysis.statistics.maxDepth).toBe(0);
      expect(analysis.overallHealthScore).toBe(0);
      expect(analysis.issues).toHaveLength(0);
      expect(analysis.optimization.proposals).toHaveLength(0);
    });

    it('ルートノードのみのマインドマップが正常に処理される', () => {
      const singleNodeMindmap: MindmapData = {
        root: {
          id: 'only-root',
          title: 'ルートのみ'
        }
      };

      const analysis = AnalysisReportGenerator.analyze(singleNodeMindmap);

      expect(analysis.statistics.totalNodes).toBe(1);
      expect(analysis.statistics.maxDepth).toBe(0);
      expect(analysis.statistics.structure.leafNodes).toBe(1);
      expect(analysis.statistics.structure.branchNodes).toBe(0);
    });

    it('メタデータなしでも正常に動作する', () => {
      const noMetadataMindmap: MindmapData = {
        root: {
          id: 'root',
          title: 'メタデータなし',
          children: [
            { id: 'child', title: '子' }
          ]
        }
      };

      const analysis = AnalysisReportGenerator.analyze(noMetadataMindmap);

      expect(analysis.statistics.nodeStats.withPriority).toBe(0);
      expect(analysis.statistics.nodeStats.withStatus).toBe(0);
      expect(analysis.statistics.nodeStats.withTags).toBe(0);
      expect(analysis.visualizations.find(v => v.type === 'priority_distribution')).toBeUndefined();
    });
  });

  describe('視覚化データの詳細テスト', () => {
    it('深度分布チャートが正確に生成される', () => {
      const analysis = AnalysisReportGenerator.analyze(testMindmapData);
      const depthViz = analysis.visualizations.find(v => v.type === 'depth_distribution');

      expect(depthViz).toBeDefined();
      expect(depthViz!.data.labels).toHaveLength(3); // レベル0, 1, 2
      expect(depthViz!.data.datasets[0].data).toHaveLength(3);
      expect(depthViz!.data.datasets[0].data[0]).toBe(1); // ルートノード
      expect(depthViz!.data.datasets[0].data[1]).toBe(3); // 子ノード3個
      expect(depthViz!.data.datasets[0].data[2]).toBe(3); // 孫ノード3個
    });

    it('分岐数分布チャートが生成される', () => {
      const analysis = AnalysisReportGenerator.analyze(complexMindmapData);
      const branchingViz = analysis.visualizations.find(v => v.type === 'branching_distribution');

      expect(branchingViz).toBeDefined();
      expect(branchingViz!.title).toBe('分岐数分布');
      expect(branchingViz!.data.labels).toContain('5-9 (最適)');
      expect(branchingViz!.data.datasets[0].backgroundColor).toBeDefined();
    });

    it('優先度分布チャートの色が正しく設定される', () => {
      const analysis = AnalysisReportGenerator.analyze(testMindmapData);
      const priorityViz = analysis.visualizations.find(v => v.type === 'priority_distribution');

      expect(priorityViz).toBeDefined();
      const colors = priorityViz!.data.datasets[0].backgroundColor as string[];
      expect(colors).toBeDefined();
      expect(colors.length).toBeGreaterThan(0);
    });
  });

  describe('レポート設定テスト', () => {
    beforeEach(() => {
      testAnalysis = AnalysisReportGenerator.analyze(testMindmapData);
    });

    it('視覚化タイプを制限できる', () => {
      const config = {
        visualizationTypes: ['depth_distribution', 'priority_distribution'] as const
      };

      const htmlReport = AnalysisReportGenerator.generateReport(testAnalysis, 'html', config);

      expect(htmlReport).toContain('chart-depth_distribution');
      expect(htmlReport).toContain('chart-priority_distribution');
      expect(htmlReport).not.toContain('chart-branching_distribution');
      expect(htmlReport).not.toContain('chart-status_distribution');
    });

    it('カスタムテンプレートが適用される', () => {
      const config = {
        template: {
          header: '<div class="custom-header">カスタムヘッダー</div>',
          footer: '<div class="custom-footer">カスタムフッター</div>'
        }
      };

      const htmlReport = AnalysisReportGenerator.generateReport(testAnalysis, 'html', config);

      expect(htmlReport).toContain('custom-header');
      expect(htmlReport).toContain('カスタムヘッダー');
      expect(htmlReport).toContain('custom-footer');
      expect(htmlReport).toContain('カスタムフッター');
    });
  });
});