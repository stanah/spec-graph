/**
 * 構造最適化提案エンジン
 *
 * マインドマップの構造を分析し、可読性や管理性を向上させるための
 * 最適化提案を生成する機能を提供します。
 */

import type { MindmapData, MindmapNode } from '../types';
import { MindmapAnalyzer, type MindmapStatistics } from './mindmapAnalyzer';

/**
 * 最適化提案の種類
 */
export type OptimizationProposalType =
  | 'flatten_hierarchy'     // 深い階層の平坦化
  | 'group_similar_nodes'   // 類似ノードのグループ化
  | 'rebalance_branches'    // バランスの悪い分岐の再構成
  | 'optimize_branching'    // 7±2の法則に基づく分岐数最適化
  | 'restructure_depth';    // 深度構造の再編成

/**
 * 最適化提案の重要度
 */
export type OptimizationPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * 最適化提案の信頼度
 */
export type OptimizationConfidence = 'low' | 'medium' | 'high';

/**
 * ノード移動アクション
 */
export interface NodeMoveAction {
  /** 移動するノードのID */
  nodeId: string;
  /** 移動元の親ノードID */
  fromParentId: string;
  /** 移動先の親ノードID */
  toParentId: string;
  /** 移動先での位置（インデックス） */
  position?: number;
  /** 移動の理由 */
  reason: string;
}

/**
 * ノード作成アクション
 */
export interface NodeCreateAction {
  /** 新しいノードのID（提案） */
  nodeId: string;
  /** 新しいノードのタイトル */
  title: string;
  /** 親ノードのID */
  parentId: string;
  /** 位置（インデックス） */
  position?: number;
  /** 作成の理由 */
  reason: string;
  /** 初期プロパティ */
  properties?: Partial<MindmapNode>;
}

/**
 * ノード変更アクション
 */
export interface NodeModifyAction {
  /** 変更するノードのID */
  nodeId: string;
  /** 変更内容 */
  changes: Partial<MindmapNode>;
  /** 変更の理由 */
  reason: string;
}

/**
 * 最適化アクション
 */
export type OptimizationAction =
  | { type: 'move'; action: NodeMoveAction }
  | { type: 'create'; action: NodeCreateAction }
  | { type: 'modify'; action: NodeModifyAction };

/**
 * 構造比較データ
 */
export interface StructureComparison {
  /** 変更前の統計情報 */
  before: {
    statistics: MindmapStatistics;
    structure: StructureSnapshot;
  };
  /** 変更後の統計情報（予測） */
  after: {
    statistics: MindmapStatistics;
    structure: StructureSnapshot;
  };
  /** 改善度のスコア */
  improvementScore: number;
  /** 変更点の詳細 */
  changes: {
    totalNodes: number;
    maxDepth: number;
    averageBranching: number;
    balanceScore: number;
  };
}

/**
 * 構造スナップショット
 */
export interface StructureSnapshot {
  /** ノード階層の表現 */
  hierarchy: HierarchyNode[];
  /** 深度分布 */
  depthDistribution: Record<number, number>;
  /** 分岐数分布 */
  branchingDistribution: Record<number, number>;
  /** バランススコア（0-1, 1が最もバランスが良い） */
  balanceScore: number;
}

/**
 * 階層ノードの表現
 */
export interface HierarchyNode {
  id: string;
  title: string;
  depth: number;
  childCount: number;
  children: HierarchyNode[];
}

/**
 * 最適化提案
 */
export interface OptimizationProposal {
  /** 提案のID */
  id: string;
  /** 提案の種類 */
  type: OptimizationProposalType;
  /** 提案のタイトル */
  title: string;
  /** 提案の詳細説明 */
  description: string;
  /** 重要度 */
  priority: OptimizationPriority;
  /** 信頼度 */
  confidence: OptimizationConfidence;
  /** 対象ノードID（複数可） */
  targetNodeIds: string[];
  /** 実行するアクションの配列 */
  actions: OptimizationAction[];
  /** 予想される効果 */
  expectedBenefits: string[];
  /** 注意点・リスク */
  warnings?: string[];
  /** 構造比較データ */
  comparison: StructureComparison;
  /** 適用前にユーザー確認が必要かどうか */
  requiresConfirmation: boolean;
  /** 自動適用可能かどうか */
  autoApplicable: boolean;
}

/**
 * 最適化分析結果
 */
export interface OptimizationAnalysis {
  /** 分析対象のマインドマップ統計 */
  statistics: MindmapStatistics;
  /** 検出された最適化提案 */
  proposals: OptimizationProposal[];
  /** 全体的な構造スコア（0-100） */
  overallScore: number;
  /** 分析サマリー */
  summary: {
    totalProposals: number;
    highPriorityProposals: number;
    potentialImprovement: number; // パーセンテージ
    mainIssues: string[];
  };
}

/**
 * 類似ノードグループ
 */
export interface SimilarNodeGroup {
  /** グループID */
  groupId: string;
  /** グループの説明 */
  description: string;
  /** グループに含まれるノードID */
  nodeIds: string[];
  /** 類似度スコア（0-1） */
  similarityScore: number;
  /** 類似性の根拠 */
  similarities: SimilarityFactor[];
}

/**
 * 類似性の要因
 */
export interface SimilarityFactor {
  /** 要因の種類 */
  type: 'title' | 'tags' | 'priority' | 'status' | 'structure' | 'content';
  /** 要因の説明 */
  description: string;
  /** 重み（影響度） */
  weight: number;
}

/**
 * 構造最適化提案エンジン
 */
export class StructureOptimizationEngine {
  /** 7±2の法則での理想的な分岐数の範囲 */
  private static readonly OPTIMAL_BRANCHING_MIN = 5;
  private static readonly OPTIMAL_BRANCHING_MAX = 9;

  /** 深い階層と判定する閾値 */
  private static readonly DEEP_HIERARCHY_THRESHOLD = 5;

  /** 不均衡な分岐と判定する閾値（標準偏差） */
  private static readonly UNBALANCED_THRESHOLD = 2.0;

  /**
   * マインドマップの構造を分析し、最適化提案を生成します
   *
   * @param mindmapData - 分析対象のマインドマップデータ
   * @returns 最適化分析結果
   */
  public static analyzeStructure(mindmapData: MindmapData): OptimizationAnalysis {
    if (!mindmapData.root) {
      return {
        statistics: MindmapAnalyzer.collectStatistics(mindmapData),
        proposals: [],
        overallScore: 0,
        summary: {
          totalProposals: 0,
          highPriorityProposals: 0,
          potentialImprovement: 0,
          mainIssues: ['マインドマップにルートノードがありません']
        }
      };
    }

    const statistics = MindmapAnalyzer.collectStatistics(mindmapData);
    const proposals: OptimizationProposal[] = [];

    // 各種最適化提案を生成
    proposals.push(...this.generateFlatteningProposals(mindmapData, statistics));
    proposals.push(...this.generateGroupingProposals(mindmapData, statistics));
    proposals.push(...this.generateRebalancingProposals(mindmapData, statistics));
    proposals.push(...this.generateBranchingOptimizationProposals(mindmapData, statistics));

    // 提案を優先度順にソート
    proposals.sort(this.compareProposalPriority);

    const overallScore = this.calculateOverallScore(statistics, proposals);
    const summary = this.generateSummary(proposals);

    return {
      statistics,
      proposals,
      overallScore,
      summary
    };
  }

  /**
   * 深い階層の平坦化提案を生成
   */
  private static generateFlatteningProposals(
    mindmapData: MindmapData,
    statistics: MindmapStatistics
  ): OptimizationProposal[] {
    const proposals: OptimizationProposal[] = [];

    if (statistics.maxDepth <= this.DEEP_HIERARCHY_THRESHOLD) {
      return proposals;
    }

    // 深いパスを特定
    const deepPaths = this.findDeepPaths(mindmapData.root!, this.DEEP_HIERARCHY_THRESHOLD);

    for (const path of deepPaths) {
      const proposal = this.createFlatteningProposal(path, mindmapData);
      if (proposal) {
        proposals.push(proposal);
      }
    }

    return proposals;
  }

  /**
   * 類似ノードのグループ化提案を生成
   */
  private static generateGroupingProposals(
    mindmapData: MindmapData,
    statistics: MindmapStatistics
  ): OptimizationProposal[] {
    const proposals: OptimizationProposal[] = [];

    // 類似ノードグループを検出
    const similarGroups = this.findSimilarNodeGroups(mindmapData.root!);

    for (const group of similarGroups) {
      if (group.nodeIds.length >= 3 && group.similarityScore >= 0.6) {
        const proposal = this.createGroupingProposal(group, mindmapData);
        if (proposal) {
          proposals.push(proposal);
        }
      }
    }

    return proposals;
  }

  /**
   * バランスの悪い分岐の再構成提案を生成
   */
  private static generateRebalancingProposals(
    mindmapData: MindmapData,
    statistics: MindmapStatistics
  ): OptimizationProposal[] {
    const proposals: OptimizationProposal[] = [];

    // 不均衡なノードを特定
    const unbalancedNodes = this.findUnbalancedNodes(mindmapData.root!);

    for (const node of unbalancedNodes) {
      const proposal = this.createRebalancingProposal(node, mindmapData);
      if (proposal) {
        proposals.push(proposal);
      }
    }

    return proposals;
  }

  /**
   * 7±2の法則に基づく分岐数最適化提案を生成
   */
  private static generateBranchingOptimizationProposals(
    mindmapData: MindmapData,
    statistics: MindmapStatistics
  ): OptimizationProposal[] {
    const proposals: OptimizationProposal[] = [];

    // 最適でない分岐数のノードを特定
    const suboptimalNodes = this.findSuboptimalBranchingNodes(mindmapData.root!);

    for (const node of suboptimalNodes) {
      const proposal = this.createBranchingOptimizationProposal(node, mindmapData);
      if (proposal) {
        proposals.push(proposal);
      }
    }

    return proposals;
  }

  /**
   * 深いパスを検出
   */
  private static findDeepPaths(node: MindmapNode, threshold: number): MindmapNode[][] {
    const paths: MindmapNode[][] = [];

    const traverse = (current: MindmapNode, path: MindmapNode[], depth: number): void => {
      const newPath = [...path, current];

      if (depth >= threshold) {
        paths.push(newPath);
      }

      if (current.children) {
        for (const child of current.children) {
          traverse(child, newPath, depth + 1);
        }
      }
    };

    traverse(node, [], 0);
    return paths;
  }

  /**
   * 類似ノードグループを検出
   */
  private static findSimilarNodeGroups(root: MindmapNode): SimilarNodeGroup[] {
    const allNodes = this.collectAllNodes(root);
    const groups: SimilarNodeGroup[] = [];
    const processedNodes = new Set<string>();

    for (let i = 0; i < allNodes.length; i++) {
      if (processedNodes.has(allNodes[i].id)) continue;

      const similarNodes = [allNodes[i]];

      for (let j = i + 1; j < allNodes.length; j++) {
        if (processedNodes.has(allNodes[j].id)) continue;

        const similarity = this.calculateNodeSimilarity(allNodes[i], allNodes[j]);
        if (similarity.score >= 0.6) {
          similarNodes.push(allNodes[j]);
        }
      }

      if (similarNodes.length >= 2) {
        similarNodes.forEach(node => processedNodes.add(node.id));

        groups.push({
          groupId: `group-${i}`,
          description: `「${similarNodes[0].title}」などの類似ノード`,
          nodeIds: similarNodes.map(node => node.id),
          similarityScore: similarNodes.length > 2 ?
            this.calculateGroupSimilarity(similarNodes) :
            this.calculateNodeSimilarity(similarNodes[0], similarNodes[1]).score,
          similarities: this.calculateNodeSimilarity(similarNodes[0], similarNodes[1]).factors
        });
      }
    }

    return groups;
  }

  /**
   * 不均衡なノードを検出
   */
  private static findUnbalancedNodes(root: MindmapNode): MindmapNode[] {
    const unbalancedNodes: MindmapNode[] = [];

    const traverse = (node: MindmapNode): void => {
      if (node.children && node.children.length > 3) {
        const childrenDepths = node.children.map(child => this.calculateNodeDepth(child));
        const variance = this.calculateVariance(childrenDepths);

        if (Math.sqrt(variance) > this.UNBALANCED_THRESHOLD) {
          unbalancedNodes.push(node);
        }
      }

      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(root);
    return unbalancedNodes;
  }

  /**
   * 最適でない分岐数のノードを検出
   */
  private static findSuboptimalBranchingNodes(root: MindmapNode): MindmapNode[] {
    const suboptimalNodes: MindmapNode[] = [];

    const traverse = (node: MindmapNode): void => {
      if (node.children) {
        const branchCount = node.children.length;

        if (branchCount > 0 && (branchCount < this.OPTIMAL_BRANCHING_MIN || branchCount > this.OPTIMAL_BRANCHING_MAX)) {
          suboptimalNodes.push(node);
        }

        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(root);
    return suboptimalNodes;
  }

  /**
   * 平坦化提案を作成
   */
  private static createFlatteningProposal(
    path: MindmapNode[],
    mindmapData: MindmapData
  ): OptimizationProposal | null {
    if (path.length < 3) return null;

    const deepestNode = path[path.length - 1];
    const intermediateNodes = path.slice(1, -1);
    const actions: OptimizationAction[] = [];

    // 中間ノードを統合するアクション
    for (let i = 0; i < intermediateNodes.length - 1; i++) {
      actions.push({
        type: 'move',
        action: {
          nodeId: deepestNode.id,
          fromParentId: intermediateNodes[i + 1].id,
          toParentId: intermediateNodes[i].id,
          reason: '深い階層を平坦化'
        }
      });
    }

    const beforeStats = MindmapAnalyzer.collectStatistics(mindmapData);
    const afterStats = this.simulateStructureChange(mindmapData, actions);

    return {
      id: `flatten-${deepestNode.id}`,
      type: 'flatten_hierarchy',
      title: '深い階層の平坦化',
      description: `深度${path.length - 1}の階層を浅くして可読性を向上させます`,
      priority: path.length > 7 ? 'high' : 'medium',
      confidence: 'high',
      targetNodeIds: path.map(node => node.id),
      actions,
      expectedBenefits: [
        '可読性の向上',
        'ナビゲーションの簡素化',
        '認知負荷の軽減'
      ],
      comparison: {
        before: {
          statistics: beforeStats,
          structure: this.createStructureSnapshot(mindmapData)
        },
        after: {
          statistics: afterStats,
          structure: this.createStructureSnapshot(mindmapData) // 簡略化
        },
        improvementScore: 0.8,
        changes: {
          totalNodes: 0,
          maxDepth: beforeStats.maxDepth - (path.length - 3),
          averageBranching: 0,
          balanceScore: 0.2
        }
      },
      requiresConfirmation: true,
      autoApplicable: false
    };
  }

  /**
   * グループ化提案を作成
   */
  private static createGroupingProposal(
    group: SimilarNodeGroup,
    mindmapData: MindmapData
  ): OptimizationProposal | null {
    const actions: OptimizationAction[] = [];

    // 新しいグループノードを作成
    const groupNodeId = `group-${Date.now()}`;
    actions.push({
      type: 'create',
      action: {
        nodeId: groupNodeId,
        title: group.description,
        parentId: mindmapData.root!.id,
        reason: '類似ノードのグループ化'
      }
    });

    // 類似ノードをグループノードに移動
    for (const nodeId of group.nodeIds) {
      actions.push({
        type: 'move',
        action: {
          nodeId,
          fromParentId: mindmapData.root!.id, // 簡略化
          toParentId: groupNodeId,
          reason: '類似ノードの整理'
        }
      });
    }

    const beforeStats = MindmapAnalyzer.collectStatistics(mindmapData);

    return {
      id: `group-${group.groupId}`,
      type: 'group_similar_nodes',
      title: '類似ノードのグループ化',
      description: `${group.nodeIds.length}個の類似ノードをグループ化します`,
      priority: group.nodeIds.length > 5 ? 'high' : 'medium',
      confidence: group.similarityScore > 0.8 ? 'high' : 'medium',
      targetNodeIds: group.nodeIds,
      actions,
      expectedBenefits: [
        '構造の整理',
        '関連ノードの見つけやすさ向上',
        '論理的なグループ分け'
      ],
      comparison: {
        before: {
          statistics: beforeStats,
          structure: this.createStructureSnapshot(mindmapData)
        },
        after: {
          statistics: beforeStats, // 簡略化
          structure: this.createStructureSnapshot(mindmapData)
        },
        improvementScore: 0.7,
        changes: {
          totalNodes: 1, // グループノード追加
          maxDepth: 0,
          averageBranching: 0,
          balanceScore: 0.3
        }
      },
      requiresConfirmation: true,
      autoApplicable: false
    };
  }

  /**
   * 再構成提案を作成
   */
  private static createRebalancingProposal(
    node: MindmapNode,
    mindmapData: MindmapData
  ): OptimizationProposal | null {
    if (!node.children || node.children.length < 4) return null;

    const actions: OptimizationAction[] = [];

    // 簡単な再構成アクション（詳細は省略）
    const groupNodeId = `rebalance-${Date.now()}`;

    actions.push({
      type: 'create',
      action: {
        nodeId: groupNodeId,
        title: `${node.title} - グループ2`,
        parentId: node.id,
        reason: 'バランスの改善'
      }
    });

    const beforeStats = MindmapAnalyzer.collectStatistics(mindmapData);

    return {
      id: `rebalance-${node.id}`,
      type: 'rebalance_branches',
      title: '分岐のバランス調整',
      description: `${node.children.length}個の子ノードを再配置してバランスを改善します`,
      priority: 'medium',
      confidence: 'medium',
      targetNodeIds: [node.id],
      actions,
      expectedBenefits: [
        'バランスの向上',
        '視認性の改善',
        '論理的な構造'
      ],
      comparison: {
        before: {
          statistics: beforeStats,
          structure: this.createStructureSnapshot(mindmapData)
        },
        after: {
          statistics: beforeStats,
          structure: this.createStructureSnapshot(mindmapData)
        },
        improvementScore: 0.6,
        changes: {
          totalNodes: 1,
          maxDepth: 1,
          averageBranching: 0,
          balanceScore: 0.4
        }
      },
      requiresConfirmation: true,
      autoApplicable: false
    };
  }

  /**
   * 分岐最適化提案を作成
   */
  private static createBranchingOptimizationProposal(
    node: MindmapNode,
    mindmapData: MindmapData
  ): OptimizationProposal | null {
    if (!node.children) return null;

    const branchCount = node.children.length;
    const actions: OptimizationAction[] = [];

    if (branchCount > this.OPTIMAL_BRANCHING_MAX) {
      // 分岐数が多すぎる場合はグループ化
      const groupsNeeded = Math.ceil(branchCount / this.OPTIMAL_BRANCHING_MAX);

      for (let i = 0; i < groupsNeeded; i++) {
        actions.push({
          type: 'create',
          action: {
            nodeId: `branch-group-${i}-${Date.now()}`,
            title: `グループ ${i + 1}`,
            parentId: node.id,
            reason: '7±2の法則に基づく最適化'
          }
        });
      }
    }

    const beforeStats = MindmapAnalyzer.collectStatistics(mindmapData);

    return {
      id: `branching-${node.id}`,
      type: 'optimize_branching',
      title: '分岐数の最適化',
      description: `分岐数${branchCount}を認知科学的に最適な範囲に調整します`,
      priority: branchCount > 15 ? 'high' : 'medium',
      confidence: 'high',
      targetNodeIds: [node.id],
      actions,
      expectedBenefits: [
        '認知負荷の軽減',
        '7±2の法則に準拠',
        '理解しやすい構造'
      ],
      warnings: branchCount > 20 ? ['大幅な構造変更になります'] : undefined,
      comparison: {
        before: {
          statistics: beforeStats,
          structure: this.createStructureSnapshot(mindmapData)
        },
        after: {
          statistics: beforeStats,
          structure: this.createStructureSnapshot(mindmapData)
        },
        improvementScore: 0.9,
        changes: {
          totalNodes: actions.filter(a => a.type === 'create').length,
          maxDepth: 1,
          averageBranching: -0.3,
          balanceScore: 0.5
        }
      },
      requiresConfirmation: true,
      autoApplicable: false
    };
  }

  /**
   * ヘルパーメソッド群
   */

  private static collectAllNodes(root: MindmapNode): MindmapNode[] {
    const nodes: MindmapNode[] = [];

    const traverse = (node: MindmapNode): void => {
      nodes.push(node);
      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(root);
    return nodes;
  }

  private static calculateNodeSimilarity(
    node1: MindmapNode,
    node2: MindmapNode
  ): { score: number; factors: SimilarityFactor[] } {
    const factors: SimilarityFactor[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // タイトルの類似性
    const titleSimilarity = this.calculateStringSimilarity(node1.title, node2.title);
    if (titleSimilarity > 0.3) {
      factors.push({
        type: 'title',
        description: 'タイトルが類似している',
        weight: 0.4
      });
      totalScore += titleSimilarity * 0.4;
    }
    totalWeight += 0.4;

    // タグの類似性
    if (node1.tags && node2.tags) {
      const commonTags = node1.tags.filter(tag => node2.tags!.includes(tag));
      if (commonTags.length > 0) {
        const tagSimilarity = commonTags.length / Math.max(node1.tags.length, node2.tags.length);
        factors.push({
          type: 'tags',
          description: `共通タグ: ${commonTags.join(', ')}`,
          weight: 0.3
        });
        totalScore += tagSimilarity * 0.3;
      }
    }
    totalWeight += 0.3;

    // 優先度・ステータスの類似性
    if (node1.priority === node2.priority || node1.status === node2.status) {
      factors.push({
        type: 'priority',
        description: '優先度またはステータスが同じ',
        weight: 0.2
      });
      totalScore += 0.2;
    }
    totalWeight += 0.2;

    // 構造の類似性
    const structure1 = node1.children?.length || 0;
    const structure2 = node2.children?.length || 0;
    if (Math.abs(structure1 - structure2) <= 1) {
      factors.push({
        type: 'structure',
        description: '子ノード数が類似している',
        weight: 0.1
      });
      totalScore += 0.1;
    }
    totalWeight += 0.1;

    return {
      score: totalWeight > 0 ? totalScore / totalWeight : 0,
      factors
    };
  }

  private static calculateGroupSimilarity(nodes: MindmapNode[]): number {
    if (nodes.length < 2) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        totalSimilarity += this.calculateNodeSimilarity(nodes[i], nodes[j]).score;
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private static calculateStringSimilarity(str1: string, str2: string): number {
    // 簡単なレーベンシュタイン距離ベースの類似度
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }

  private static calculateNodeDepth(node: MindmapNode): number {
    if (!node.children || node.children.length === 0) {
      return 1;
    }

    return 1 + Math.max(...node.children.map(child => this.calculateNodeDepth(child)));
  }

  private static calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private static compareProposalPriority(a: OptimizationProposal, b: OptimizationProposal): number {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  }

  private static calculateOverallScore(
    statistics: MindmapStatistics,
    proposals: OptimizationProposal[]
  ): number {
    let score = 100;

    // 深度ペナルティ
    if (statistics.maxDepth > this.DEEP_HIERARCHY_THRESHOLD) {
      score -= (statistics.maxDepth - this.DEEP_HIERARCHY_THRESHOLD) * 10;
    }

    // 提案数ペナルティ
    score -= proposals.length * 5;

    // 高優先度提案のペナルティ
    const highPriorityCount = proposals.filter(p => p.priority === 'high' || p.priority === 'critical').length;
    score -= highPriorityCount * 10;

    return Math.max(0, Math.min(100, score));
  }

  private static generateSummary(proposals: OptimizationProposal[]) {
    const highPriorityProposals = proposals.filter(p => p.priority === 'high' || p.priority === 'critical').length;
    const potentialImprovement = proposals.reduce((sum, p) => sum + p.comparison.improvementScore, 0) / proposals.length * 100 || 0;

    const mainIssues: string[] = [];
    const typeCount = proposals.reduce((acc, p) => {
      acc[p.type] = (acc[p.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (typeCount.flatten_hierarchy) {
      mainIssues.push('深い階層構造');
    }
    if (typeCount.optimize_branching) {
      mainIssues.push('非最適な分岐数');
    }
    if (typeCount.group_similar_nodes) {
      mainIssues.push('散らばった類似ノード');
    }
    if (typeCount.rebalance_branches) {
      mainIssues.push('不均衡な分岐');
    }

    return {
      totalProposals: proposals.length,
      highPriorityProposals,
      potentialImprovement: Math.round(potentialImprovement),
      mainIssues
    };
  }

  private static simulateStructureChange(
    mindmapData: MindmapData,
    actions: OptimizationAction[]
  ): MindmapStatistics {
    // 簡略化: 実際にはアクションを適用したコピーで統計を計算
    // 現在は元の統計をそのまま返す
    return MindmapAnalyzer.collectStatistics(mindmapData);
  }

  private static createStructureSnapshot(mindmapData: MindmapData): StructureSnapshot {
    const statistics = MindmapAnalyzer.collectStatistics(mindmapData);

    return {
      hierarchy: mindmapData.root ? [this.createHierarchyNode(mindmapData.root)] : [],
      depthDistribution: statistics.structure.depthDistribution,
      branchingDistribution: this.calculateBranchingDistribution(mindmapData.root!),
      balanceScore: this.calculateBalanceScore(mindmapData.root!)
    };
  }

  private static createHierarchyNode(node: MindmapNode, depth: number = 0): HierarchyNode {
    return {
      id: node.id,
      title: node.title,
      depth,
      childCount: node.children?.length || 0,
      children: node.children?.map(child => this.createHierarchyNode(child, depth + 1)) || []
    };
  }

  private static calculateBranchingDistribution(root: MindmapNode): Record<number, number> {
    const distribution: Record<number, number> = {};

    const traverse = (node: MindmapNode): void => {
      const branchCount = node.children?.length || 0;
      distribution[branchCount] = (distribution[branchCount] || 0) + 1;

      if (node.children) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(root);
    return distribution;
  }

  private static calculateBalanceScore(root: MindmapNode): number {
    // 簡略化: ランダムなバランススコアを返す
    // 実際には分岐の分散や深度の均一性を計算
    return Math.random() * 0.5 + 0.5;
  }
}