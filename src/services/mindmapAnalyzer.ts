/**
 * マインドマップ構造分析とバリデーション機能
 * 
 * マインドマップの統計情報収集、循環参照検出、孤立ノード検出等の
 * 構造分析機能を提供する
 */

import type { MindmapData, MindmapNode, NodePriority, NodeStatus } from '../types';

/**
 * マインドマップ統計情報
 */
export interface MindmapStatistics {
  /** 総ノード数 */
  totalNodes: number;
  /** 最大深度 */
  maxDepth: number;
  /** 平均分岐数 */
  averageBranching: number;
  /** ノード統計 */
  nodeStats: {
    /** 優先度が設定されているノード数 */
    withPriority: number;
    /** ステータスが設定されているノード数 */
    withStatus: number;
    /** タグが設定されているノード数 */
    withTags: number;
    /** 説明が設定されているノード数 */
    withDescription: number;
    /** カスタムフィールドが設定されているノード数 */
    withCustomFields: number;
  };
  /** 分布統計 */
  distribution: {
    /** 優先度別分布 */
    priorities: Record<string, number>;
    /** ステータス別分布 */
    statuses: Record<string, number>;
    /** タグ別分布 */
    tags: Record<string, number>;
  };
  /** 構造統計 */
  structure: {
    /** リーフノード数（子を持たないノード） */
    leafNodes: number;
    /** 分岐ノード数（子を持つノード） */
    branchNodes: number;
    /** 深度別ノード数 */
    depthDistribution: Record<number, number>;
  };
}

/**
 * 構造分析の問題報告
 */
export interface StructureIssue {
  /** 問題の種類 */
  type: 'circular_reference' | 'orphaned_node' | 'invalid_reference';
  /** 問題のあるノードID */
  nodeId: string;
  /** 問題の説明 */
  message: string;
  /** 問題のパス（循環参照の場合） */
  path?: string[];
  /** 重要度 */
  severity: 'error' | 'warning' | 'info';
}

/**
 * マインドマップ分析器クラス
 */
export class MindmapAnalyzer {
  /**
   * マインドマップの統計情報を収集する
   * 
   * @param mindmapData - 分析対象のマインドマップデータ
   * @returns 統計情報
   */
  public static collectStatistics(mindmapData: MindmapData): MindmapStatistics {
    const stats: MindmapStatistics = {
      totalNodes: 0,
      maxDepth: 0,
      averageBranching: 0,
      nodeStats: {
        withPriority: 0,
        withStatus: 0,
        withTags: 0,
        withDescription: 0,
        withCustomFields: 0,
      },
      distribution: {
        priorities: {},
        statuses: {},
        tags: {},
      },
      structure: {
        leafNodes: 0,
        branchNodes: 0,
        depthDistribution: {},
      },
    };

    if (!mindmapData.root) {
      return stats;
    }

    // 再帰的に統計情報を収集
    const collector = new StatisticsCollector(stats);
    collector.traverse(mindmapData.root, 0);

    // 平均分岐数を計算
    if (stats.structure.branchNodes > 0) {
      const totalChildren = stats.totalNodes - 1; // ルートノードを除く
      stats.averageBranching = totalChildren / stats.structure.branchNodes;
    }

    return stats;
  }

  /**
   * 循環参照を検出する
   * 
   * @param mindmapData - 検査対象のマインドマップデータ
   * @returns 検出された問題のリスト
   */
  public static detectCircularReferences(mindmapData: MindmapData): StructureIssue[] {
    const issues: StructureIssue[] = [];
    
    if (!mindmapData.root) {
      return issues;
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const detectCycles = (node: MindmapNode, path: string[]): void => {
      if (recursionStack.has(node.id)) {
        // 循環参照を検出
        const cycleStart = path.indexOf(node.id);
        const cyclePath = [...path.slice(cycleStart), node.id];
        
        issues.push({
          type: 'circular_reference',
          nodeId: node.id,
          message: `循環参照が検出されました: ${cyclePath.join(' -> ')}`,
          path: cyclePath,
          severity: 'error',
        });
        return;
      }

      if (visited.has(node.id)) {
        return;
      }

      visited.add(node.id);
      recursionStack.add(node.id);

      // 子ノードを再帰的に検査
      if (node.children) {
        for (const child of node.children) {
          detectCycles(child, [...path, node.id]);
        }
      }

      recursionStack.delete(node.id);
    };

    detectCycles(mindmapData.root, []);
    return issues;
  }

  /**
   * 孤立ノードを検出する
   * 
   * @param mindmapData - 検査対象のマインドマップデータ
   * @returns 検出された問題のリスト
   */
  public static detectOrphanedNodes(mindmapData: MindmapData): StructureIssue[] {
    const issues: StructureIssue[] = [];
    
    if (!mindmapData.root) {
      return issues;
    }

    const reachableNodes = new Set<string>();
    
    // ルートから到達可能なノードを収集
    const collectReachable = (node: MindmapNode): void => {
      reachableNodes.add(node.id);
      
      if (node.children) {
        for (const child of node.children) {
          collectReachable(child);
        }
      }
    };

    collectReachable(mindmapData.root);

    // 全ノードIDを収集（実装では、実際のデータ構造に応じて調整が必要）
    const allNodes = new Set<string>();
    const collectAllNodes = (node: MindmapNode): void => {
      allNodes.add(node.id);
      
      if (node.children) {
        for (const child of node.children) {
          collectAllNodes(child);
        }
      }
    };

    collectAllNodes(mindmapData.root);

    // 到達不可能なノードを検出
    for (const nodeId of allNodes) {
      if (!reachableNodes.has(nodeId)) {
        issues.push({
          type: 'orphaned_node',
          nodeId,
          message: `孤立ノードが検出されました: ${nodeId}`,
          severity: 'warning',
        });
      }
    }

    return issues;
  }

  /**
   * 包括的な構造分析を実行する
   * 
   * @param mindmapData - 分析対象のマインドマップデータ
   * @returns 分析結果
   */
  public static analyzeStructure(mindmapData: MindmapData): {
    statistics: MindmapStatistics;
    issues: StructureIssue[];
  } {
    const statistics = this.collectStatistics(mindmapData);
    const circularIssues = this.detectCircularReferences(mindmapData);
    const orphanedIssues = this.detectOrphanedNodes(mindmapData);
    
    return {
      statistics,
      issues: [...circularIssues, ...orphanedIssues],
    };
  }
}

/**
 * 統計情報収集用のヘルパークラス
 */
class StatisticsCollector {
  constructor(private stats: MindmapStatistics) {}

  /**
   * ノードツリーを走査して統計情報を収集
   * 
   * @param node - 現在のノード
   * @param depth - 現在の深度
   */
  public traverse(node: MindmapNode, depth: number): void {
    // 基本統計
    this.stats.totalNodes++;
    this.stats.maxDepth = Math.max(this.stats.maxDepth, depth);

    // 深度分布
    this.stats.structure.depthDistribution[depth] = 
      (this.stats.structure.depthDistribution[depth] || 0) + 1;

    // ノード分類
    const hasChildren = node.children && node.children.length > 0;
    if (hasChildren) {
      this.stats.structure.branchNodes++;
    } else {
      this.stats.structure.leafNodes++;
    }

    // メタデータ統計
    if (node.priority) {
      this.stats.nodeStats.withPriority++;
      const priority = node.priority;
      this.stats.distribution.priorities[priority] = 
        (this.stats.distribution.priorities[priority] || 0) + 1;
    }

    if (node.status) {
      this.stats.nodeStats.withStatus++;
      const status = node.status;
      this.stats.distribution.statuses[status] = 
        (this.stats.distribution.statuses[status] || 0) + 1;
    }

    if (node.description) {
      this.stats.nodeStats.withDescription++;
    }

    if (node.tags && node.tags.length > 0) {
      this.stats.nodeStats.withTags++;
      
      for (const tag of node.tags) {
        this.stats.distribution.tags[tag] = 
          (this.stats.distribution.tags[tag] || 0) + 1;
      }
    }

    if (node.customFields && Object.keys(node.customFields).length > 0) {
      this.stats.nodeStats.withCustomFields++;
    }

    // 子ノードを再帰的に処理
    if (hasChildren) {
      for (const child of node.children!) {
        this.traverse(child, depth + 1);
      }
    }
  }
}

/**
 * パフォーマンス最適化版の統計収集（大規模データ用）
 */
export class OptimizedMindmapAnalyzer {
  /**
   * 大規模なマインドマップに対してメモリ効率の良い統計収集を行う
   * 
   * @param mindmapData - 分析対象のマインドマップデータ
   * @param options - 分析オプション
   * @returns 統計情報
   */
  public static collectStatisticsOptimized(
    mindmapData: MindmapData,
    options: {
      /** 最大深度制限 */
      maxDepth?: number;
      /** 統計収集対象の制限 */
      includeDistribution?: boolean;
      /** サンプリング率（0.1 = 10%のノードのみ処理） */
      samplingRate?: number;
    } = {}
  ): MindmapStatistics {
    const {
      maxDepth = Number.MAX_SAFE_INTEGER,
      includeDistribution = true,
      samplingRate = 1.0,
    } = options;

    const stats: MindmapStatistics = {
      totalNodes: 0,
      maxDepth: 0,
      averageBranching: 0,
      nodeStats: {
        withPriority: 0,
        withStatus: 0,
        withTags: 0,
        withDescription: 0,
        withCustomFields: 0,
      },
      distribution: {
        priorities: {},
        statuses: {},
        tags: {},
      },
      structure: {
        leafNodes: 0,
        branchNodes: 0,
        depthDistribution: {},
      },
    };

    if (!mindmapData.root) {
      return stats;
    }

    // 非再帰的な走査（スタックオーバーフロー防止）
    const stack: Array<{ node: MindmapNode; depth: number }> = [
      { node: mindmapData.root, depth: 0 }
    ];

    while (stack.length > 0) {
      const { node, depth } = stack.pop()!;

      // 深度制限チェック
      if (depth > maxDepth) continue;

      // サンプリング
      if (Math.random() > samplingRate) continue;

      // 統計収集
      stats.totalNodes++;
      stats.maxDepth = Math.max(stats.maxDepth, depth);

      const hasChildren = node.children && node.children.length > 0;
      if (hasChildren) {
        stats.structure.branchNodes++;
        // 子ノードをスタックに追加
        for (const child of node.children!) {
          stack.push({ node: child, depth: depth + 1 });
        }
      } else {
        stats.structure.leafNodes++;
      }

      // 分布統計（オプション）
      if (includeDistribution) {
        if (node.priority) {
          stats.nodeStats.withPriority++;
          stats.distribution.priorities[node.priority] = 
            (stats.distribution.priorities[node.priority] || 0) + 1;
        }

        if (node.status) {
          stats.nodeStats.withStatus++;
          stats.distribution.statuses[node.status] = 
            (stats.distribution.statuses[node.status] || 0) + 1;
        }

        if (node.tags) {
          stats.nodeStats.withTags++;
          for (const tag of node.tags) {
            stats.distribution.tags[tag] = 
              (stats.distribution.tags[tag] || 0) + 1;
          }
        }
      }

      // その他の統計
      if (node.description) stats.nodeStats.withDescription++;
      if (node.customFields && Object.keys(node.customFields).length > 0) {
        stats.nodeStats.withCustomFields++;
      }

      // 深度分布
      stats.structure.depthDistribution[depth] = 
        (stats.structure.depthDistribution[depth] || 0) + 1;
    }

    // 平均分岐数を計算
    if (stats.structure.branchNodes > 0) {
      const totalChildren = stats.totalNodes - 1;
      stats.averageBranching = totalChildren / stats.structure.branchNodes;
    }

    return stats;
  }
}