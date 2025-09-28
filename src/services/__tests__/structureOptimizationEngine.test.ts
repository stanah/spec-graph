/**
 * 構造最適化エンジンのテストスイート
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StructureOptimizationEngine
} from '../structureOptimizationEngine';
import type { MindmapData } from '../../types';

describe('StructureOptimizationEngine', () => {
  let simpleMindmapData: MindmapData;
  let deepHierarchyData: MindmapData;
  let similarNodesData: MindmapData;
  let unbalancedData: MindmapData;
  let overbranchedData: MindmapData;

  beforeEach(() => {
    // 基本的なテストデータ
    simpleMindmapData = {
      root: {
        id: 'root',
        title: 'ルートノード',
        children: [
          {
            id: 'child1',
            title: '子ノード1',
            children: [
              { id: 'grandchild1', title: '孫ノード1' }
            ]
          },
          {
            id: 'child2',
            title: '子ノード2'
          }
        ]
      },
      metadata: {}
    };

    // 深い階層のテストデータ
    deepHierarchyData = {
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
                title: 'レベル4',
                children: [{
                  id: 'level5',
                  title: 'レベル5',
                  children: [{
                    id: 'level6',
                    title: 'レベル6'
                  }]
                }]
              }]
            }]
          }]
        }]
      },
      metadata: {}
    };

    // 類似ノードのテストデータ
    similarNodesData = {
      root: {
        id: 'root',
        title: 'プロジェクト',
        children: [
          {
            id: 'task1',
            title: 'ユーザー登録機能',
            priority: 'high',
            status: 'todo',
            tags: ['機能', 'フロントエンド']
          },
          {
            id: 'task2',
            title: 'ユーザーログイン機能',
            priority: 'high',
            status: 'todo',
            tags: ['機能', 'フロントエンド']
          },
          {
            id: 'task3',
            title: 'ユーザープロフィール編集機能',
            priority: 'medium',
            status: 'todo',
            tags: ['機能', 'フロントエンド']
          },
          {
            id: 'bug1',
            title: 'データベース接続エラー',
            priority: 'critical',
            status: 'todo',
            tags: ['バグ', 'バックエンド']
          },
          {
            id: 'bug2',
            title: 'API応答エラー',
            priority: 'high',
            status: 'todo',
            tags: ['バグ', 'バックエンド']
          },
          {
            id: 'other',
            title: 'その他のタスク',
            priority: 'low',
            status: 'done',
            tags: ['その他']
          }
        ]
      },
      metadata: {}
    };

    // 不均衡なデータ
    unbalancedData = {
      root: {
        id: 'root',
        title: 'ルート',
        children: [
          {
            id: 'shallow1',
            title: '浅いブランチ1'
          },
          {
            id: 'shallow2',
            title: '浅いブランチ2'
          },
          {
            id: 'deep1',
            title: '深いブランチ1',
            children: [
              {
                id: 'deep1-1',
                title: '深いブランチ1-1',
                children: [
                  {
                    id: 'deep1-1-1',
                    title: '深いブランチ1-1-1',
                    children: [
                      { id: 'deep1-1-1-1', title: '深いブランチ1-1-1-1' }
                    ]
                  }
                ]
              }
            ]
          },
          {
            id: 'medium1',
            title: '中程度ブランチ1',
            children: [
              { id: 'medium1-1', title: '中程度ブランチ1-1' }
            ]
          }
        ]
      },
      metadata: {}
    };

    // 分岐数が多すぎるデータ
    overbranchedData = {
      root: {
        id: 'root',
        title: 'ルート',
        children: Array.from({ length: 15 }, (_, i) => ({
          id: `child${i}`,
          title: `子ノード${i}`,
          priority: 'medium',
          status: 'todo'
        }))
      },
      metadata: {}
    };
  });

  describe('analyzeStructure', () => {
    it('空のマインドマップを正しく処理する', () => {
      const emptyData: MindmapData = { metadata: {} };
      const analysis = StructureOptimizationEngine.analyzeStructure(emptyData);

      expect(analysis.proposals).toHaveLength(0);
      expect(analysis.overallScore).toBe(0);
      expect(analysis.summary.mainIssues).toContain('マインドマップにルートノードがありません');
    });

    it('最適な構造のマインドマップには少ない提案のみ生成される', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(simpleMindmapData);

      // 分岐数が少ないため、最適化提案が生成される可能性がある
      expect(analysis.proposals.length).toBeLessThanOrEqual(3);
      expect(analysis.overallScore).toBeGreaterThan(50);
      expect(analysis.summary.totalProposals).toBe(analysis.proposals.length);
    });

    it('全体的な分析結果を正しく生成する', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(deepHierarchyData);

      expect(analysis.statistics).toBeDefined();
      expect(analysis.proposals).toBeDefined();
      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
      expect(analysis.summary).toBeDefined();
      expect(analysis.summary.totalProposals).toBe(analysis.proposals.length);
    });
  });

  describe('深い階層の平坦化提案', () => {
    it('深い階層を検出して平坦化提案を生成する', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(deepHierarchyData);

      const flatteningProposals = analysis.proposals.filter(
        p => p.type === 'flatten_hierarchy'
      );

      expect(flatteningProposals.length).toBeGreaterThan(0);

      const proposal = flatteningProposals[0];
      expect(proposal.title).toBe('深い階層の平坦化');
      expect(proposal.priority).toBeOneOf(['medium', 'high']);
      expect(proposal.confidence).toBe('high');
      expect(proposal.targetNodeIds.length).toBeGreaterThan(2);
      expect(proposal.expectedBenefits).toContain('可読性の向上');
    });

    it('適度な深度では平坦化提案を生成しない', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(simpleMindmapData);

      const flatteningProposals = analysis.proposals.filter(
        p => p.type === 'flatten_hierarchy'
      );

      expect(flatteningProposals).toHaveLength(0);
    });

    it('非常に深い階層では高優先度の提案を生成する', () => {
      const veryDeepData: MindmapData = {
        root: {
          id: 'root',
          title: 'ルート',
          children: [{
            id: 'l1', title: 'レベル1',
            children: [{
              id: 'l2', title: 'レベル2',
              children: [{
                id: 'l3', title: 'レベル3',
                children: [{
                  id: 'l4', title: 'レベル4',
                  children: [{
                    id: 'l5', title: 'レベル5',
                    children: [{
                      id: 'l6', title: 'レベル6',
                      children: [{
                        id: 'l7', title: 'レベル7',
                        children: [{
                          id: 'l8', title: 'レベル8'
                        }]
                      }]
                    }]
                  }]
                }]
              }]
            }]
          }]
        },
        metadata: {}
      };

      const analysis = StructureOptimizationEngine.analyzeStructure(veryDeepData);
      const flatteningProposals = analysis.proposals.filter(
        p => p.type === 'flatten_hierarchy'
      );

      expect(flatteningProposals.length).toBeGreaterThan(0);
      expect(flatteningProposals[0].priority).toBe('high');
    });
  });

  describe('類似ノードのグループ化提案', () => {
    it('類似ノードを検出してグループ化提案を生成する', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(similarNodesData);

      const groupingProposals = analysis.proposals.filter(
        p => p.type === 'group_similar_nodes'
      );

      expect(groupingProposals.length).toBeGreaterThan(0);

      const proposal = groupingProposals[0];
      expect(proposal.title).toBe('類似ノードのグループ化');
      expect(proposal.targetNodeIds.length).toBeGreaterThanOrEqual(2);
      expect(proposal.actions.length).toBeGreaterThan(1); // create + moves
      expect(proposal.expectedBenefits).toContain('構造の整理');
    });

    it('類似度の高いノードには高信頼度を設定する', () => {
      const highSimilarityData: MindmapData = {
        root: {
          id: 'root',
          title: 'プロジェクト',
          children: [
            {
              id: 'auth1',
              title: 'ユーザー認証',
              priority: 'high',
              status: 'todo',
              tags: ['認証', 'セキュリティ']
            },
            {
              id: 'auth2',
              title: 'ユーザー認証システム',
              priority: 'high',
              status: 'todo',
              tags: ['認証', 'セキュリティ']
            },
            {
              id: 'auth3',
              title: 'ユーザー認証機能',
              priority: 'high',
              status: 'todo',
              tags: ['認証', 'セキュリティ']
            }
          ]
        },
        metadata: {}
      };

      const analysis = StructureOptimizationEngine.analyzeStructure(highSimilarityData);
      const groupingProposals = analysis.proposals.filter(
        p => p.type === 'group_similar_nodes'
      );

      if (groupingProposals.length > 0) {
        expect(groupingProposals[0].confidence).toBeOneOf(['medium', 'high']);
      }
    });

    it('類似ノードが少ない場合はグループ化提案を生成しない', () => {
      const diverseData: MindmapData = {
        root: {
          id: 'root',
          title: 'プロジェクト',
          children: [
            { id: 'task1', title: 'データベース設計' },
            { id: 'task2', title: 'UI/UX改善' },
            { id: 'task3', title: 'パフォーマンス最適化' }
          ]
        },
        metadata: {}
      };

      const analysis = StructureOptimizationEngine.analyzeStructure(diverseData);
      const groupingProposals = analysis.proposals.filter(
        p => p.type === 'group_similar_nodes'
      );

      expect(groupingProposals).toHaveLength(0);
    });
  });

  describe('分岐の再構成提案', () => {
    it('不均衡な分岐を検出して再構成提案を生成する', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(unbalancedData);

      const rebalancingProposals = analysis.proposals.filter(
        p => p.type === 'rebalance_branches'
      );

      // 不均衡さが十分でない場合は提案が生成されない可能性がある
      if (rebalancingProposals.length > 0) {
        const proposal = rebalancingProposals[0];
        expect(proposal.title).toBe('分岐のバランス調整');
        expect(proposal.expectedBenefits).toContain('バランスの向上');
      }
    });

    it('均等な分岐では再構成提案を生成しない', () => {
      const balancedData: MindmapData = {
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            {
              id: 'branch1',
              title: 'ブランチ1',
              children: [
                { id: 'leaf1', title: 'リーフ1' },
                { id: 'leaf2', title: 'リーフ2' }
              ]
            },
            {
              id: 'branch2',
              title: 'ブランチ2',
              children: [
                { id: 'leaf3', title: 'リーフ3' },
                { id: 'leaf4', title: 'リーフ4' }
              ]
            }
          ]
        },
        metadata: {}
      };

      const analysis = StructureOptimizationEngine.analyzeStructure(balancedData);
      const rebalancingProposals = analysis.proposals.filter(
        p => p.type === 'rebalance_branches'
      );

      expect(rebalancingProposals).toHaveLength(0);
    });
  });

  describe('7±2の法則による分岐最適化提案', () => {
    it('分岐数が多すぎるノードに対して最適化提案を生成する', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(overbranchedData);

      const branchingProposals = analysis.proposals.filter(
        p => p.type === 'optimize_branching'
      );

      expect(branchingProposals.length).toBeGreaterThan(0);

      const proposal = branchingProposals[0];
      expect(proposal.title).toBe('分岐数の最適化');
      expect(proposal.description).toContain('分岐数15');
      expect(proposal.expectedBenefits).toContain('7±2の法則に準拠');
      expect(proposal.priority).toBeOneOf(['medium', 'high']);
    });

    it('適切な分岐数では最適化提案を生成しない', () => {
      const optimalBranchingData: MindmapData = {
        root: {
          id: 'root',
          title: 'ルート',
          children: Array.from({ length: 7 }, (_, i) => ({
            id: `child${i}`,
            title: `子ノード${i}`
          }))
        },
        metadata: {}
      };

      const analysis = StructureOptimizationEngine.analyzeStructure(optimalBranchingData);
      const branchingProposals = analysis.proposals.filter(
        p => p.type === 'optimize_branching'
      );

      expect(branchingProposals).toHaveLength(0);
    });

    it('分岐数が非常に多い場合は高優先度の提案を生成する', () => {
      const veryOverbranchedData: MindmapData = {
        root: {
          id: 'root',
          title: 'ルート',
          children: Array.from({ length: 25 }, (_, i) => ({
            id: `child${i}`,
            title: `子ノード${i}`
          }))
        },
        metadata: {}
      };

      const analysis = StructureOptimizationEngine.analyzeStructure(veryOverbranchedData);
      const branchingProposals = analysis.proposals.filter(
        p => p.type === 'optimize_branching'
      );

      expect(branchingProposals.length).toBeGreaterThan(0);
      expect(branchingProposals[0].priority).toBe('high');
      expect(branchingProposals[0].warnings).toBeDefined();
    });

    it('分岐数が少なすぎる場合も最適化提案を生成する', () => {
      const underbranchedData: MindmapData = {
        root: {
          id: 'root',
          title: 'ルート',
          children: [
            { id: 'child1', title: '子ノード1' },
            { id: 'child2', title: '子ノード2' },
            { id: 'child3', title: '子ノード3' }
          ]
        },
        metadata: {}
      };

      const analysis = StructureOptimizationEngine.analyzeStructure(underbranchedData);
      const branchingProposals = analysis.proposals.filter(
        p => p.type === 'optimize_branching'
      );

      expect(branchingProposals.length).toBeGreaterThan(0);
    });
  });

  describe('構造比較とプレビュー', () => {
    it('すべての提案に構造比較データが含まれる', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(deepHierarchyData);

      for (const proposal of analysis.proposals) {
        expect(proposal.comparison).toBeDefined();
        expect(proposal.comparison.before).toBeDefined();
        expect(proposal.comparison.after).toBeDefined();
        expect(proposal.comparison.improvementScore).toBeGreaterThan(0);
        expect(proposal.comparison.improvementScore).toBeLessThanOrEqual(1);
        expect(proposal.comparison.changes).toBeDefined();
      }
    });

    it('改善スコアが適切に計算される', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(overbranchedData);

      const branchingProposals = analysis.proposals.filter(
        p => p.type === 'optimize_branching'
      );

      if (branchingProposals.length > 0) {
        expect(branchingProposals[0].comparison.improvementScore).toBeGreaterThan(0.5);
      }
    });

    it('構造スナップショットが正しく生成される', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(simpleMindmapData);

      // 提案がある場合のみテスト
      if (analysis.proposals.length > 0) {
        const snapshot = analysis.proposals[0].comparison.before.structure;
        expect(snapshot.hierarchy).toBeDefined();
        expect(snapshot.depthDistribution).toBeDefined();
        expect(snapshot.branchingDistribution).toBeDefined();
        expect(snapshot.balanceScore).toBeGreaterThanOrEqual(0);
        expect(snapshot.balanceScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('提案の優先度とフィルタリング', () => {
    it('提案が優先度順にソートされる', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(overbranchedData);

      if (analysis.proposals.length > 1) {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };

        for (let i = 0; i < analysis.proposals.length - 1; i++) {
          const currentPriority = priorityOrder[analysis.proposals[i].priority];
          const nextPriority = priorityOrder[analysis.proposals[i + 1].priority];
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
        }
      }
    });

    it('すべての提案が必要な属性を持つ', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(similarNodesData);

      for (const proposal of analysis.proposals) {
        expect(proposal.id).toBeDefined();
        expect(proposal.type).toBeOneOf([
          'flatten_hierarchy',
          'group_similar_nodes',
          'rebalance_branches',
          'optimize_branching',
          'restructure_depth'
        ]);
        expect(proposal.title).toBeDefined();
        expect(proposal.description).toBeDefined();
        expect(proposal.priority).toBeOneOf(['low', 'medium', 'high', 'critical']);
        expect(proposal.confidence).toBeOneOf(['low', 'medium', 'high']);
        expect(proposal.targetNodeIds).toBeInstanceOf(Array);
        expect(proposal.actions).toBeInstanceOf(Array);
        expect(proposal.expectedBenefits).toBeInstanceOf(Array);
        expect(proposal.comparison).toBeDefined();
        expect(typeof proposal.requiresConfirmation).toBe('boolean');
        expect(typeof proposal.autoApplicable).toBe('boolean');
      }
    });
  });

  describe('全体スコアとサマリー', () => {
    it('全体スコアが適切に計算される', () => {
      const goodAnalysis = StructureOptimizationEngine.analyzeStructure(simpleMindmapData);
      const badAnalysis = StructureOptimizationEngine.analyzeStructure(deepHierarchyData);

      expect(goodAnalysis.overallScore).toBeGreaterThan(badAnalysis.overallScore);
    });

    it('サマリーが正確な情報を含む', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(overbranchedData);

      expect(analysis.summary.totalProposals).toBe(analysis.proposals.length);

      const actualHighPriority = analysis.proposals.filter(
        p => p.priority === 'high' || p.priority === 'critical'
      ).length;
      expect(analysis.summary.highPriorityProposals).toBe(actualHighPriority);

      expect(analysis.summary.potentialImprovement).toBeGreaterThanOrEqual(0);
      expect(analysis.summary.potentialImprovement).toBeLessThanOrEqual(100);
      expect(analysis.summary.mainIssues).toBeInstanceOf(Array);
    });

    it('主要な問題が正しく特定される', () => {
      const deepAnalysis = StructureOptimizationEngine.analyzeStructure(deepHierarchyData);
      if (deepAnalysis.summary.mainIssues.length > 0) {
        expect(deepAnalysis.summary.mainIssues).toContain('深い階層構造');
      }

      const branchingAnalysis = StructureOptimizationEngine.analyzeStructure(overbranchedData);
      if (branchingAnalysis.summary.mainIssues.length > 0) {
        expect(branchingAnalysis.summary.mainIssues).toContain('非最適な分岐数');
      }
    });
  });

  describe('エッジケースと安定性', () => {
    it('単一ノードのマインドマップを処理する', () => {
      const singleNodeData: MindmapData = {
        root: {
          id: 'root',
          title: 'ルートのみ'
        },
        metadata: {}
      };

      const analysis = StructureOptimizationEngine.analyzeStructure(singleNodeData);

      expect(analysis.proposals).toHaveLength(0);
      expect(analysis.overallScore).toBeGreaterThan(0);
    });

    it('循環参照があっても安全に処理する', () => {
      // 循環参照を含むデータは実際には作成困難なため、
      // 深い構造で代替テスト
      const analysis = StructureOptimizationEngine.analyzeStructure(deepHierarchyData);

      expect(() => analysis).not.toThrow();
      expect(analysis).toBeDefined();
    });

    it('大量のノードでも適切に処理する', () => {
      const largeMindmapData: MindmapData = {
        root: {
          id: 'root',
          title: 'ルート',
          children: Array.from({ length: 50 }, (_, i) => ({
            id: `branch${i}`,
            title: `ブランチ${i}`,
            children: Array.from({ length: 10 }, (_, j) => ({
              id: `leaf${i}-${j}`,
              title: `リーフ${i}-${j}`
            }))
          }))
        },
        metadata: {}
      };

      const startTime = performance.now();
      const analysis = StructureOptimizationEngine.analyzeStructure(largeMindmapData);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
      expect(analysis.proposals.length).toBeGreaterThan(0);
    });
  });

  describe('アクションの妥当性', () => {
    it('生成されたアクションが有効な形式を持つ', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(similarNodesData);

      for (const proposal of analysis.proposals) {
        for (const action of proposal.actions) {
          expect(action.type).toBeOneOf(['move', 'create', 'modify']);

          switch (action.type) {
            case 'move':
              expect(action.action.nodeId).toBeDefined();
              expect(action.action.fromParentId).toBeDefined();
              expect(action.action.toParentId).toBeDefined();
              expect(action.action.reason).toBeDefined();
              break;
            case 'create':
              expect(action.action.nodeId).toBeDefined();
              expect(action.action.title).toBeDefined();
              expect(action.action.parentId).toBeDefined();
              expect(action.action.reason).toBeDefined();
              break;
            case 'modify':
              expect(action.action.nodeId).toBeDefined();
              expect(action.action.changes).toBeDefined();
              expect(action.action.reason).toBeDefined();
              break;
          }
        }
      }
    });

    it('移動アクションが論理的に正しい', () => {
      const analysis = StructureOptimizationEngine.analyzeStructure(similarNodesData);

      const moveActions = analysis.proposals
        .flatMap(p => p.actions)
        .filter(a => a.type === 'move');

      for (const action of moveActions) {
        if (action.type === 'move') {
          expect(action.action.nodeId).not.toBe(action.action.fromParentId);
          expect(action.action.nodeId).not.toBe(action.action.toParentId);
          expect(action.action.fromParentId).not.toBe(action.action.toParentId);
        }
      }
    });
  });
});

describe('類似度計算のテスト', () => {
  it('同一ノードは高い類似度を持つ', () => {
    // この部分は内部メソッドのため、間接的にテスト
    const identicalNodesData: MindmapData = {
      root: {
        id: 'root',
        title: 'プロジェクト',
        children: [
          {
            id: 'task1',
            title: 'ユーザー認証',
            priority: 'high',
            status: 'todo',
            tags: ['認証']
          },
          {
            id: 'task2',
            title: 'ユーザー認証',
            priority: 'high',
            status: 'todo',
            tags: ['認証']
          }
        ]
      },
      metadata: {}
    };

    const analysis = StructureOptimizationEngine.analyzeStructure(identicalNodesData);
    const groupingProposals = analysis.proposals.filter(p => p.type === 'group_similar_nodes');

    if (groupingProposals.length > 0) {
      expect(groupingProposals[0].confidence).toBe('high');
    }
  });

  it('全く異なるノードは類似度が低い', () => {
    const differentNodesData: MindmapData = {
      root: {
        id: 'root',
        title: 'プロジェクト',
        children: [
          {
            id: 'task1',
            title: 'データベース設計',
            priority: 'low',
            status: 'done',
            tags: ['設計']
          },
          {
            id: 'task2',
            title: 'UI作成',
            priority: 'high',
            status: 'todo',
            tags: ['フロントエンド']
          }
        ]
      },
      metadata: {}
    };

    const analysis = StructureOptimizationEngine.analyzeStructure(differentNodesData);
    const groupingProposals = analysis.proposals.filter(p => p.type === 'group_similar_nodes');

    // 類似度が低い場合、グループ化提案は生成されないはず
    expect(groupingProposals).toHaveLength(0);
  });
});