import type { MindmapNode } from '../schemas/mindmap.zod';

/**
 * 進捗率の型定義（0-100の数値）
 */
export type ProgressPercentage = number;

/**
 * ノード進捗情報の型定義
 */
export interface NodeProgress {
  /** ノードID */
  nodeId: string;
  /** 進捗率（0-100） */
  progress: ProgressPercentage;
  /** 手動設定かどうか */
  isManuallySet: boolean;
  /** 最終更新日時 */
  updatedAt: string;
  /** 備考・メモ */
  note?: string;
}

/**
 * 進捗集計情報の型定義
 */
export interface ProgressSummary {
  /** 総ノード数 */
  totalNodes: number;
  /** 完了ノード数（進捗100%） */
  completedNodes: number;
  /** 進行中ノード数（進捗1-99%） */
  inProgressNodes: number;
  /** 未着手ノード数（進捗0%） */
  notStartedNodes: number;
  /** 全体進捗率 */
  overallProgress: ProgressPercentage;
  /** 平均進捗率 */
  averageProgress: ProgressPercentage;
}

/**
 * 進捗履歴エントリの型定義
 */
export interface ProgressHistoryEntry {
  /** ノードID */
  nodeId: string;
  /** 変更前の進捗率 */
  oldProgress: ProgressPercentage;
  /** 変更後の進捗率 */
  newProgress: ProgressPercentage;
  /** 変更日時 */
  timestamp: string;
  /** 変更理由・メモ */
  reason?: string;
}

/**
 * 進捗変更イベントの型定義
 */
export interface ProgressChangeEvent {
  /** ノードID */
  nodeId: string;
  /** 新しい進捗率 */
  newProgress: ProgressPercentage;
  /** 古い進捗率 */
  oldProgress: ProgressPercentage;
  /** 変更がカスケードかどうか */
  isCascadeUpdate: boolean;
  /** タイムスタンプ */
  timestamp: string;
}

/**
 * 進捗計算オプションの型定義
 */
export interface ProgressCalculationOptions {
  /** 重み付け計算を使用するか */
  useWeighting: boolean;
  /** 空のノードを計算に含めるか */
  includeEmptyNodes: boolean;
  /** 最小進捗しきい値 */
  minimumProgressThreshold: number;
}

/**
 * 進捗管理システムクラス
 * ノード単位の進捗率設定と親ノードへの自動集計機能を提供
 */
export class ProgressSystem {
  private progressData: Map<string, NodeProgress>;
  private nodes: MindmapNode[];
  private progressHistory: ProgressHistoryEntry[];
  private eventListeners: ((event: ProgressChangeEvent) => void)[];

  /**
   * コンストラクタ
   * @param nodes - 管理対象のマインドマップノード配列
   * @param initialProgressData - 初期進捗データ（オプション）
   */
  constructor(nodes: MindmapNode[], initialProgressData: NodeProgress[] = []) {
    this.nodes = nodes;
    this.progressData = new Map();
    this.progressHistory = [];
    this.eventListeners = [];

    // 初期進捗データを設定
    initialProgressData.forEach(progress => {
      this.progressData.set(progress.nodeId, progress);
    });

    // 既存ノードの進捗データを初期化
    this.initializeNodeProgress();
  }

  /**
   * ノードの進捗率を設定
   * @param nodeId - ノードID
   * @param progress - 進捗率（0-100）
   * @param note - 備考（オプション）
   * @param cascadeUpdate - 親ノードの自動更新を行うか（デフォルト: true）
   */
  setProgress(
    nodeId: string, 
    progress: ProgressPercentage, 
    note?: string, 
    cascadeUpdate: boolean = true
  ): void {
    // 進捗率の妥当性チェック
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100');
    }

    const node = this.findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node with id "${nodeId}" not found`);
    }

    const oldProgress = this.getProgress(nodeId);
    const timestamp = new Date().toISOString();

    // 進捗データを更新
    this.progressData.set(nodeId, {
      nodeId,
      progress,
      isManuallySet: true,
      updatedAt: timestamp,
      note
    });

    // 履歴を追加
    this.addToHistory({
      nodeId,
      oldProgress,
      newProgress: progress,
      timestamp,
      reason: note
    });

    // イベントを発火
    this.emitProgressChangeEvent({
      nodeId,
      newProgress: progress,
      oldProgress,
      isCascadeUpdate: false,
      timestamp
    });

    // カスケード更新
    if (cascadeUpdate) {
      this.updateParentProgress(nodeId);
    }
  }

  /**
   * ノードの進捗率を取得
   * @param nodeId - ノードID
   * @returns 進捗率（0-100）
   */
  getProgress(nodeId: string): ProgressPercentage {
    const progressInfo = this.progressData.get(nodeId);
    return progressInfo?.progress ?? 0;
  }

  /**
   * ノードの進捗情報を取得
   * @param nodeId - ノードID
   * @returns 進捗情報、存在しない場合はundefined
   */
  getProgressInfo(nodeId: string): NodeProgress | undefined {
    return this.progressData.get(nodeId);
  }

  /**
   * 子ノードの進捗から親ノードの進捗を自動計算
   * @param parentId - 親ノードID
   * @param options - 計算オプション
   */
  updateParentProgress(
    parentId: string, 
    options: ProgressCalculationOptions = {
      useWeighting: false,
      includeEmptyNodes: true,
      minimumProgressThreshold: 0
    }
  ): void {
    const parentNode = this.findNodeById(parentId);
    if (!parentNode || !parentNode.children || parentNode.children.length === 0) {
      return;
    }

    const childProgresses = parentNode.children
      .map(child => this.getProgress(child.id))
      .filter(progress => options.includeEmptyNodes || progress > options.minimumProgressThreshold);

    if (childProgresses.length === 0) {
      return;
    }

    // 平均進捗率を計算
    const averageProgress = childProgresses.reduce((sum, progress) => sum + progress, 0) / childProgresses.length;
    const roundedProgress = Math.round(averageProgress);

    const oldProgress = this.getProgress(parentId);
    const timestamp = new Date().toISOString();

    // 親ノードの進捗を更新（手動設定ではない）
    this.progressData.set(parentId, {
      nodeId: parentId,
      progress: roundedProgress,
      isManuallySet: false,
      updatedAt: timestamp,
      note: `Auto-calculated from ${childProgresses.length} child nodes`
    });

    // 履歴を追加
    this.addToHistory({
      nodeId: parentId,
      oldProgress,
      newProgress: roundedProgress,
      timestamp,
      reason: 'Auto-calculated from child nodes'
    });

    // イベントを発火
    this.emitProgressChangeEvent({
      nodeId: parentId,
      newProgress: roundedProgress,
      oldProgress,
      isCascadeUpdate: true,
      timestamp
    });

    // 親の親も更新
    const grandParent = this.findParentNode(parentId);
    if (grandParent) {
      this.updateParentProgress(grandParent.id, options);
    }
  }

  /**
   * 全ノードの進捗を自動計算で更新
   * @param options - 計算オプション
   */
  recalculateAllProgress(
    options: ProgressCalculationOptions = {
      useWeighting: false,
      includeEmptyNodes: true,
      minimumProgressThreshold: 0
    }
  ): void {
    // 葉ノードから親に向かって計算
    const processedNodes = new Set<string>();
    
    const calculateBottomUp = (node: MindmapNode): void => {
      if (processedNodes.has(node.id)) {
        return;
      }

      // 子ノードを先に処理
      if (node.children) {
        node.children.forEach(child => calculateBottomUp(child));
      }

      // 親ノードの進捗を計算
      if (node.children && node.children.length > 0) {
        this.updateParentProgress(node.id, options);
      }

      processedNodes.add(node.id);
    };

    this.nodes.forEach(node => calculateBottomUp(node));
  }

  /**
   * 進捗の集計情報を取得
   * @returns 進捗集計情報
   */
  getProgressSummary(): ProgressSummary {
    const allNodeIds = this.getAllNodeIds();
    const totalNodes = allNodeIds.length;
    
    let completedNodes = 0;
    let inProgressNodes = 0;
    let notStartedNodes = 0;
    let totalProgress = 0;

    allNodeIds.forEach(nodeId => {
      const progress = this.getProgress(nodeId);
      totalProgress += progress;
      
      if (progress === 100) {
        completedNodes++;
      } else if (progress > 0) {
        inProgressNodes++;
      } else {
        notStartedNodes++;
      }
    });

    return {
      totalNodes,
      completedNodes,
      inProgressNodes,
      notStartedNodes,
      overallProgress: totalNodes > 0 ? Math.round(totalProgress / totalNodes) : 0,
      averageProgress: totalNodes > 0 ? totalProgress / totalNodes : 0
    };
  }

  /**
   * 進捗履歴を取得
   * @param nodeId - ノードID（オプション、指定しない場合は全履歴）
   * @param limit - 取得件数制限（オプション）
   * @returns 進捗履歴配列
   */
  getProgressHistory(nodeId?: string, limit?: number): ProgressHistoryEntry[] {
    let history = nodeId 
      ? this.progressHistory.filter(entry => entry.nodeId === nodeId)
      : this.progressHistory;

    // 最新順にソート
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (limit) {
      history = history.slice(0, limit);
    }

    return history;
  }

  /**
   * 進捗変更イベントリスナーを追加
   * @param listener - イベントリスナー関数
   */
  addProgressChangeListener(listener: (event: ProgressChangeEvent) => void): void {
    this.eventListeners.push(listener);
  }

  /**
   * 進捗変更イベントリスナーを削除
   * @param listener - 削除するイベントリスナー関数
   */
  removeProgressChangeListener(listener: (event: ProgressChangeEvent) => void): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * ノード配列を更新
   * @param nodes - 新しいノード配列
   */
  updateNodes(nodes: MindmapNode[]): void {
    this.nodes = nodes;
    this.initializeNodeProgress();
  }

  /**
   * 進捗データをエクスポート
   * @returns 全進捗データの配列
   */
  exportProgressData(): NodeProgress[] {
    return Array.from(this.progressData.values());
  }

  /**
   * 進捗データをインポート
   * @param progressData - インポートする進捗データ配列
   * @param overwrite - 既存データを上書きするか
   */
  importProgressData(progressData: NodeProgress[], overwrite: boolean = true): void {
    if (overwrite) {
      this.progressData.clear();
    }

    progressData.forEach(progress => {
      this.progressData.set(progress.nodeId, progress);
    });
  }

  /**
   * 初期進捗データを設定
   * @private
   */
  private initializeNodeProgress(): void {
    const allNodeIds = this.getAllNodeIds();
    
    allNodeIds.forEach(nodeId => {
      if (!this.progressData.has(nodeId)) {
        this.progressData.set(nodeId, {
          nodeId,
          progress: 0,
          isManuallySet: false,
          updatedAt: new Date().toISOString()
        });
      }
    });
  }

  /**
   * 全ノードIDを取得
   * @private
   */
  private getAllNodeIds(): string[] {
    const nodeIds: string[] = [];
    
    const collectIds = (nodes: MindmapNode[]): void => {
      nodes.forEach(node => {
        nodeIds.push(node.id);
        if (node.children) {
          collectIds(node.children);
        }
      });
    };

    collectIds(this.nodes);
    return nodeIds;
  }

  /**
   * ノードをIDで検索
   * @private
   */
  private findNodeById(nodeId: string): MindmapNode | undefined {
    const findInNodes = (nodes: MindmapNode[]): MindmapNode | undefined => {
      for (const node of nodes) {
        if (node.id === nodeId) {
          return node;
        }
        if (node.children) {
          const found = findInNodes(node.children);
          if (found) {
            return found;
          }
        }
      }
      return undefined;
    };

    return findInNodes(this.nodes);
  }

  /**
   * 親ノードを検索
   * @private
   */
  private findParentNode(nodeId: string): MindmapNode | undefined {
    const findParent = (nodes: MindmapNode[], targetId: string): MindmapNode | undefined => {
      for (const node of nodes) {
        if (node.children) {
          if (node.children.some(child => child.id === targetId)) {
            return node;
          }
          const found = findParent(node.children, targetId);
          if (found) {
            return found;
          }
        }
      }
      return undefined;
    };

    return findParent(this.nodes, nodeId);
  }

  /**
   * 履歴にエントリを追加
   * @private
   */
  private addToHistory(entry: ProgressHistoryEntry): void {
    this.progressHistory.push(entry);
    
    // 履歴サイズを制限（最新1000件まで保持）
    if (this.progressHistory.length > 1000) {
      this.progressHistory = this.progressHistory.slice(-1000);
    }
  }

  /**
   * 進捗変更イベントを発火
   * @private
   */
  private emitProgressChangeEvent(event: ProgressChangeEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in progress change listener:', error);
      }
    });
  }
}

/**
 * 進捗システムのファクトリー関数
 * @param nodes - マインドマップノード配列
 * @param initialProgressData - 初期進捗データ配列（オプション）
 * @returns 進捗システムインスタンス
 */
export function createProgressSystem(
  nodes: MindmapNode[], 
  initialProgressData: NodeProgress[] = []
): ProgressSystem {
  return new ProgressSystem(nodes, initialProgressData);
}

export default ProgressSystem;