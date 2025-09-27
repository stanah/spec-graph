import type { MindmapNode, TagDefinition } from '../schemas/mindmap.zod';

/**
 * タグ統計情報の型定義
 */
export interface TagStatistics {
  /** 総タグ数 */
  totalTags: number;
  /** 使用されているタグの数 */
  usedTags: number;
  /** 各タグの使用回数 */
  tagUsageCounts: Map<string, number>;
  /** 最も使用されているタグ */
  mostUsedTag: string | null;
  /** 最も使用頻度の低いタグ */
  leastUsedTag: string | null;
}

/**
 * タグフィルタオプションの型定義
 */
export interface TagFilterOptions {
  /** フィルタするタグ名の配列 */
  tags: string[];
  /** AND演算子を使用するか（true）、OR演算子を使用するか（false） */
  useAndOperator: boolean;
  /** 大文字小文字を区別するか */
  caseSensitive: boolean;
}

/**
 * タグシステムクラス
 * マインドマップノードのタグ管理機能を提供
 */
export class TagSystem {
  private tags: Map<string, TagDefinition>;
  private nodes: MindmapNode[];

  /**
   * コンストラクタ
   * @param nodes - 管理対象のマインドマップノード配列
   * @param initialTags - 初期タグ定義配列（オプション）
   */
  constructor(nodes: MindmapNode[], initialTags: TagDefinition[] = []) {
    this.nodes = nodes;
    this.tags = new Map();
    
    // 初期タグを設定
    initialTags.forEach(tag => this.tags.set(tag.name, tag));
    
    // 既存ノードからタグを抽出して自動登録
    this.syncTagsFromNodes();
  }

  /**
   * タグを追加
   * @param tagDefinition - 追加するタグ定義
   */
  addTag(tagDefinition: TagDefinition): void {
    this.tags.set(tagDefinition.name, tagDefinition);
  }

  /**
   * タグを削除
   * @param tagName - 削除するタグ名
   */
  removeTag(tagName: string): void {
    this.tags.delete(tagName);

    // 階層構造を再帰的に処理してタグを削除
    const removeTagFromNodes = (nodes: MindmapNode[]): void => {
      nodes.forEach(node => {
        if (node.tags) {
          node.tags = node.tags.filter(tag => tag !== tagName);
        }
        if (node.children) {
          removeTagFromNodes(node.children);
        }
      });
    };

    removeTagFromNodes(this.nodes);
  }

  /**
   * タグを更新
   * @param oldTagName - 既存のタグ名
   * @param newTagDefinition - 新しいタグ定義
   */
  updateTag(oldTagName: string, newTagDefinition: TagDefinition): void {
    if (!this.tags.has(oldTagName)) {
      throw new Error(`Tag "${oldTagName}" not found`);
    }

    // 古いタグを削除
    this.tags.delete(oldTagName);

    // 新しいタグを追加
    this.tags.set(newTagDefinition.name, newTagDefinition);

    // タグ名が変更された場合、階層構造を再帰的に処理してノードのタグも更新
    if (oldTagName !== newTagDefinition.name) {
      const updateTagInNodes = (nodes: MindmapNode[]): void => {
        nodes.forEach(node => {
          if (node.tags) {
            const tagIndex = node.tags.indexOf(oldTagName);
            if (tagIndex !== -1) {
              node.tags[tagIndex] = newTagDefinition.name;
            }
          }
          if (node.children) {
            updateTagInNodes(node.children);
          }
        });
      };

      updateTagInNodes(this.nodes);
    }
  }

  /**
   * ノードにタグを追加
   * @param nodeId - ノードID
   * @param tagName - 追加するタグ名
   */
  addTagToNode(nodeId: string, tagName: string): void {
    const node = this.findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node with id "${nodeId}" not found`);
    }

    if (!node.tags) {
      node.tags = [];
    }

    if (!node.tags.includes(tagName)) {
      node.tags.push(tagName);
    }

    // タグ定義が存在しない場合は自動作成
    if (!this.tags.has(tagName)) {
      this.addTag({ name: tagName });
    }
  }

  /**
   * ノードからタグを削除
   * @param nodeId - ノードID
   * @param tagName - 削除するタグ名
   */
  removeTagFromNode(nodeId: string, tagName: string): void {
    const node = this.findNodeById(nodeId);
    if (!node || !node.tags) {
      return;
    }

    node.tags = node.tags.filter(tag => tag !== tagName);
  }

  /**
   * タグでノードをフィルタリング
   * @param options - フィルタオプション
   * @returns フィルタされたノード配列
   */
  filterByTag(options: TagFilterOptions): MindmapNode[] {
    const { tags, useAndOperator, caseSensitive } = options;
    
    if (tags.length === 0) {
      return [...this.nodes];
    }

    const normalizedFilterTags = caseSensitive 
      ? tags 
      : tags.map(tag => tag.toLowerCase());

    return this.nodes.filter(node => {
      if (!node.tags || node.tags.length === 0) {
        return false;
      }

      const nodeTags = caseSensitive 
        ? node.tags 
        : node.tags.map(tag => tag.toLowerCase());

      if (useAndOperator) {
        // AND演算：すべてのフィルタタグがノードに含まれている必要がある
        return normalizedFilterTags.every(filterTag => 
          nodeTags.includes(filterTag)
        );
      } else {
        // OR演算：いずれかのフィルタタグがノードに含まれていれば良い
        return normalizedFilterTags.some(filterTag => 
          nodeTags.includes(filterTag)
        );
      }
    });
  }

  /**
   * タグ統計情報を取得
   * @returns タグ統計情報
   */
  getTagStats(): TagStatistics {
    const tagUsageCounts = new Map<string, number>();

    // 階層構造を再帰的に処理して各ノードのタグをカウント
    const countTags = (nodes: MindmapNode[]): void => {
      nodes.forEach(node => {
        if (node.tags) {
          node.tags.forEach(tag => {
            tagUsageCounts.set(tag, (tagUsageCounts.get(tag) || 0) + 1);
          });
        }
        if (node.children) {
          countTags(node.children);
        }
      });
    };

    countTags(this.nodes);

    // 最も/最も使用頻度の低いタグを特定
    let mostUsedTag: string | null = null;
    let leastUsedTag: string | null = null;
    let maxCount = 0;
    let minCount = Infinity;

    tagUsageCounts.forEach((count, tag) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedTag = tag;
      }
      if (count < minCount) {
        minCount = count;
        leastUsedTag = tag;
      }
    });

    return {
      totalTags: this.tags.size,
      usedTags: tagUsageCounts.size,
      tagUsageCounts,
      mostUsedTag,
      leastUsedTag
    };
  }

  /**
   * すべてのタグ定義を取得
   * @returns タグ定義のマップ
   */
  getAllTags(): Map<string, TagDefinition> {
    return new Map(this.tags);
  }

  /**
   * タグ定義を取得
   * @param tagName - タグ名
   * @returns タグ定義、存在しない場合はundefined
   */
  getTag(tagName: string): TagDefinition | undefined {
    return this.tags.get(tagName);
  }

  /**
   * タグが存在するかチェック
   * @param tagName - タグ名
   * @returns タグが存在する場合true
   */
  hasTag(tagName: string): boolean {
    return this.tags.has(tagName);
  }

  /**
   * ノード配列を更新
   * @param nodes - 新しいノード配列
   */
  updateNodes(nodes: MindmapNode[]): void {
    this.nodes = nodes;
    this.syncTagsFromNodes();
  }

  /**
   * 既存ノードからタグを同期
   * ノードで使用されているが定義されていないタグを自動的に追加
   * @private
   */
  private syncTagsFromNodes(): void {
    const usedTags = new Set<string>();

    // 階層構造を再帰的に処理してすべてのタグを収集
    const collectTags = (nodes: MindmapNode[]): void => {
      nodes.forEach(node => {
        if (node.tags) {
          node.tags.forEach(tag => usedTags.add(tag));
        }
        if (node.children) {
          collectTags(node.children);
        }
      });
    };

    collectTags(this.nodes);

    // 使用されているが定義されていないタグを自動追加
    usedTags.forEach(tagName => {
      if (!this.tags.has(tagName)) {
        this.addTag({ name: tagName });
      }
    });
  }

  /**
   * ノードをIDで検索
   * @param nodeId - ノードID
   * @returns 見つかったノード、見つからない場合はundefined
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
}

/**
 * タグシステムのファクトリー関数
 * @param nodes - マインドマップノード配列
 * @param initialTags - 初期タグ定義配列（オプション）
 * @returns タグシステムインスタンス
 */
export function createTagSystem(
  nodes: MindmapNode[], 
  initialTags: TagDefinition[] = []
): TagSystem {
  return new TagSystem(nodes, initialTags);
}

export default TagSystem;