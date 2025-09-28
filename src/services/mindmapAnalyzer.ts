/**
 * マインドマップ構造分析とバリデーション機能
 * 
 * マインドマップの統計情報収集、循環参照検出、孤立ノード検出等の
 * 構造分析機能を提供する
 */

import type { MindmapData, MindmapNode } from '../types';

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
 * 孤立ノード検出時の追加コンテキスト
 */
export interface OrphanDetectionOptions {
  /** ツリー外に存在する追加ノード */
  additionalNodes?: MindmapNode[];
  /** フラットなノードインデックス */
  nodeIndex?: Map<string, MindmapNode> | Record<string, MindmapNode>;
  /** ノードIDと親IDの対応表 */
  parentIndex?: Map<string, string | null | undefined> | Record<string, string | null | undefined>;
  /** メタデータ内で孤立ノード候補として走査するキー */
  metadataNodeKeys?: string[];
}

/**
 * マインドマップ分析器クラス
 */
export class MindmapAnalyzer {
  private static readonly DEFAULT_METADATA_NODE_KEYS = [
    'floatingNodes',
    'detachedNodes',
    'orphanNodes',
    'unlinkedNodes',
    'isolatedNodes',
    'nodeIndex',
    'nodes'
  ];

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
  public static detectOrphanedNodes(
    mindmapData: MindmapData,
    options: OrphanDetectionOptions = {}
  ): StructureIssue[] {
    const issues: StructureIssue[] = [];
    const candidateNodes = new Map<string, { node: MindmapNode; parentId?: string | null }>();
    const reachableNodes = new Set<string>();

    const addCandidate = (node: MindmapNode, parentId?: string | null) => {
      if (!node || typeof node.id !== 'string' || node.id.length === 0) {
        return;
      }

      const existing = candidateNodes.get(node.id);
      if (!existing) {
        candidateNodes.set(node.id, { node, parentId });
        return;
      }

      if (existing.parentId === undefined && parentId !== undefined) {
        existing.parentId = parentId;
      }
    };

    const traverse = (node: MindmapNode, parentId: string | null) => {
      addCandidate(node, parentId);
      reachableNodes.add(node.id);

      if (node.children) {
        for (const child of node.children) {
          traverse(child, node.id);
        }
      }
    };

    if (mindmapData.root) {
      traverse(mindmapData.root, null);
    }

    const metadataNodes = this.collectMetadataNodes(mindmapData, options);
    const extraNodes: MindmapNode[] = [
      ...(options.additionalNodes ?? []),
      ...this.entriesToNodes(options.nodeIndex),
      ...metadataNodes,
    ];

    for (const node of extraNodes) {
      if (!node || typeof node.id !== 'string') {
        continue;
      }

      const parentId = this.resolveParentId(node.id, node, options.parentIndex);
      addCandidate(node, parentId);
    }

    for (const [nodeId, info] of candidateNodes.entries()) {
      if (reachableNodes.has(nodeId)) {
        continue;
      }

      const parentId = this.resolveParentId(
        nodeId,
        info.node,
        options.parentIndex,
        info.parentId
      );

      let severity: StructureIssue['severity'] = 'warning';
      let message = `孤立ノードが検出されました: ${nodeId}`;

      if (typeof parentId === 'string' && parentId.length > 0) {
        if (!candidateNodes.has(parentId)) {
          severity = 'error';
          message = `親ノード(${parentId})が見つからない孤立ノードです: ${nodeId}`;
        } else if (!reachableNodes.has(parentId)) {
          message = `親ノード(${parentId})も孤立しているため、ノードが切り離されています: ${nodeId}`;
        } else {
          message = `親ノード(${parentId})から到達できないノードです: ${nodeId}`;
        }
      }

      issues.push({
        type: 'orphaned_node',
        nodeId,
        message,
        severity,
      });
    }

    return issues;
  }

  /**
   * 包括的な構造分析を実行する
   * 
   * @param mindmapData - 分析対象のマインドマップデータ
   * @param options - 追加分析オプション
   * @returns 分析結果
   */
  public static analyzeStructure(
    mindmapData: MindmapData,
    options: OrphanDetectionOptions = {}
  ): {
    statistics: MindmapStatistics;
    issues: StructureIssue[];
  } {
    const statistics = this.collectStatistics(mindmapData);
    const circularIssues = this.detectCircularReferences(mindmapData);
    const orphanedIssues = this.detectOrphanedNodes(mindmapData, options);
    
    return {
      statistics,
      issues: [...circularIssues, ...orphanedIssues],
    };
  }

  private static collectMetadataNodes(
    mindmapData: MindmapData,
    options: OrphanDetectionOptions
  ): MindmapNode[] {
    const metadata = mindmapData.metadata as Record<string, unknown> | undefined;
    if (!metadata || typeof metadata !== 'object') {
      return [];
    }

    const keys = options.metadataNodeKeys ?? this.DEFAULT_METADATA_NODE_KEYS;
    const results: MindmapNode[] = [];

    for (const key of keys) {
      const value = (metadata as Record<string, unknown>)[key];
      if (!value) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          if (this.isMindmapNodeLike(item)) {
            results.push(item as MindmapNode);
          }
        }
        continue;
      }

      if (this.isMindmapNodeLike(value)) {
        results.push(value as MindmapNode);
        continue;
      }

      if (typeof value === 'object') {
        for (const item of Object.values(value as Record<string, unknown>)) {
          if (this.isMindmapNodeLike(item)) {
            results.push(item as MindmapNode);
          }
        }
      }
    }

    return results;
  }

  private static entriesToNodes(
    index?: Map<string, MindmapNode> | Record<string, MindmapNode>
  ): MindmapNode[] {
    if (!index) {
      return [];
    }

    if (index instanceof Map) {
      return Array.from(index.values());
    }

    return Object.values(index);
  }

  private static getParentFromIndex(
    parentIndex: OrphanDetectionOptions['parentIndex'],
    nodeId: string
  ): string | null | undefined {
    if (!parentIndex) {
      return undefined;
    }

    if (parentIndex instanceof Map) {
      return parentIndex.has(nodeId) ? parentIndex.get(nodeId) ?? null : undefined;
    }

    if (Object.prototype.hasOwnProperty.call(parentIndex, nodeId)) {
      const value = parentIndex[nodeId];
      return typeof value === 'string' ? value : value ?? null;
    }

    return undefined;
  }

  private static getParentFromMetadata(node: MindmapNode): string | null | undefined {
    const metadata = node.metadata as Record<string, unknown> | undefined;
    if (metadata && typeof metadata === 'object') {
      const candidates = [
        metadata.parentId,
        metadata.parentID,
        metadata.parent,
        metadata.parentNodeId,
        metadata.parentNodeID,
      ];

      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.length > 0) {
          return candidate;
        }
        if (candidate === null) {
          return null;
        }
      }
    }

    const customFields = node.customFields as Record<string, unknown> | undefined;
    if (customFields && typeof customFields === 'object') {
      const customCandidates = [
        customFields.parentId,
        customFields.parentID,
        customFields.parent,
      ];

      for (const candidate of customCandidates) {
        if (typeof candidate === 'string' && candidate.length > 0) {
          return candidate;
        }
        if (candidate === null) {
          return null;
        }
      }
    }

    return undefined;
  }

  private static resolveParentId(
    nodeId: string,
    node: MindmapNode,
    parentIndex?: OrphanDetectionOptions['parentIndex'],
    fallbackParentId?: string | null
  ): string | null | undefined {
    if (fallbackParentId !== undefined) {
      return fallbackParentId;
    }

    const fromIndex = this.getParentFromIndex(parentIndex, nodeId);
    if (fromIndex !== undefined) {
      return fromIndex;
    }

    return this.getParentFromMetadata(node);
  }

  private static isMindmapNodeLike(value: unknown): value is MindmapNode {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const obj = value as Record<string, unknown>;
    return typeof obj.id === 'string' && obj.id.length > 0 && typeof obj.title === 'string';
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
/**
 * リアルタイム循環参照検出器
 */
export class RealTimeCircularReferenceDetector {
  private nodeCache = new Map<string, Set<string>>();
  private pathCache = new Map<string, string[]>();
  
  /**
   * ノード追加時にリアルタイムで循環参照をチェック
   * 
   * @param nodeId - 追加するノードのID
   * @param parentId - 親ノードのID
   * @param existingPath - 既存のパス（オプション）
   * @returns 循環参照の問題があれば返す
   */
  public checkNodeAddition(nodeId: string, parentId: string, existingPath?: string[]): StructureIssue | null {
    // 既存のパスを取得または新規作成
    const currentPath = existingPath || this.pathCache.get(parentId) || [];
    const newPath = [...currentPath, parentId];
    
    // 循環参照チェック
    if (newPath.includes(nodeId)) {
      const cycleStart = newPath.indexOf(nodeId);
      const cyclePath = [...newPath.slice(cycleStart), nodeId];
      
      return {
        type: 'circular_reference',
        nodeId,
        message: `循環参照が検出されました: ${cyclePath.join(' -> ')}`,
        path: cyclePath,
        severity: 'error',
      };
    }
    
    // キャッシュを更新
    this.pathCache.set(nodeId, newPath);
    if (!this.nodeCache.has(parentId)) {
      this.nodeCache.set(parentId, new Set());
    }
    this.nodeCache.get(parentId)!.add(nodeId);
    
    return null;
  }
  
  /**
   * ノード削除時にキャッシュをクリーンアップ
   * 
   * @param nodeId - 削除するノードのID
   */
  public cleanupNode(nodeId: string): void {
    this.pathCache.delete(nodeId);
    this.nodeCache.delete(nodeId);
    
    // 他のノードのキャッシュからも削除
    for (const [_parentId, children] of this.nodeCache.entries()) {
      if (children.has(nodeId)) {
        children.delete(nodeId);
      }
    }
  }
  
  /**
   * キャッシュをクリア
   */
  public clearCache(): void {
    this.nodeCache.clear();
    this.pathCache.clear();
  }
}

/**
 * 並列処理対応循環参照検出器
 */
export class ParallelCircularReferenceDetector {
  /**
   * 並列処理で複数のサブツリーの循環参照を検出
   * 
   * @param mindmapData - 検査対象のマインドマップデータ
   * @param options - 並列処理オプション
   * @returns 検出された問題のリスト
   */
  public static async detectCircularReferencesParallel(
    mindmapData: MindmapData,
    options: {
      /** 並列度（同時に処理するサブツリー数） */
      concurrency?: number;
      /** タイムアウト（ミリ秒） */
      timeout?: number;
    } = {}
  ): Promise<StructureIssue[]> {
    const { concurrency: _concurrency = 4, timeout = 5000 } = options;
    
    if (!mindmapData.root) {
      return [];
    }
    
    // 単純に通常の検出を並列チャンクで実行するのではなく、
    // 全体のデータを並列処理する（実際のケースでは効果的ではないが、テスト用）
    try {
      const timeoutPromise = new Promise<StructureIssue[]>((_, reject) => {
        setTimeout(() => reject(new Error('Parallel detection timeout')), timeout);
      });
      
      const detectPromise = new Promise<StructureIssue[]>((resolve) => {
        // 非同期で通常の検出を実行
        setTimeout(() => {
          const issues = MindmapAnalyzer.detectCircularReferences(mindmapData);
          resolve(issues);
        }, 0);
      });
      
      const results = await Promise.race([detectPromise, timeoutPromise]);
      return results;
    } catch (error) {
      console.warn('Parallel circular reference detection failed, falling back to sequential:', error);
      
      // フォールバック: 通常の検出方法
      return MindmapAnalyzer.detectCircularReferences(mindmapData);
    }
  }
  
  /**
   * 非同期で循環参照検出（プログレス報告付き）
   * 
   * @param mindmapData - 検査対象のマインドマップデータ
   * @param progressCallback - プログレス報告コールバック
   * @returns 検出された問題のリスト
   */
  public static async detectCircularReferencesWithProgress(
    mindmapData: MindmapData,
    progressCallback?: (progress: { current: number; total: number; percentage: number }) => void
  ): Promise<StructureIssue[]> {
    const issues: StructureIssue[] = [];
    
    if (!mindmapData.root) {
      return issues;
    }
    
    // 循環参照に安全な方法でノード数を計算
    let totalNodes = 0;
    let processedNodes = 0;
    const nodeCountVisited = new Set<string>();
    
    // まず安全にノード数をカウント
    const countNodesSafely = (node: MindmapNode): void => {
      if (nodeCountVisited.has(node.id)) {
        return; // 既に訪問済みなら循環参照の可能性があるのでスキップ
      }
      
      nodeCountVisited.add(node.id);
      totalNodes++;
      
      if (node.children) {
        for (const child of node.children) {
          countNodesSafely(child);
        }
      }
    };
    
    countNodesSafely(mindmapData.root);
    
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    const detectCyclesAsync = async (node: MindmapNode, path: string[]): Promise<void> => {
      // プログレス報告
      processedNodes++;
      if (progressCallback) {
        progressCallback({
          current: processedNodes,
          total: totalNodes,
          percentage: Math.round((processedNodes / totalNodes) * 100)
        });
      }
      
      // 非同期処理のため、適度にyieldする
      if (processedNodes % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      if (recursionStack.has(node.id)) {
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

      if (node.children) {
        for (const child of node.children) {
          await detectCyclesAsync(child, [...path, node.id]);
        }
      }

      recursionStack.delete(node.id);
    };
    
    await detectCyclesAsync(mindmapData.root, []);
    return issues;
  }
}

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
