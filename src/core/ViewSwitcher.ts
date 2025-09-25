/**
 * ファイル形式検出とビュー切り替えロジック
 * ファイル拡張子とコンテンツ構造を解析し、適切なビュータイプを自動判定する
 */

// Browser環境では path モジュールは使用せず、独自の実装を使用

/**
 * ビュータイプの定義
 * 既存のViewModeと互換性を保つ
 */
export type ViewType = 'mindmap' | 'table' | 'document' | 'deps';

/**
 * ファイル URI の抽象化インターフェース
 * Node.js pathとVSCode Uriの両方に対応
 */
export interface FileUri {
  fsPath: string;
}

/**
 * JSON構造解析の結果
 */
interface JsonStructureAnalysis {
  type: ViewType;
  confidence: number; // 0-1の信頼度
  reason: string;
}

/**
 * ファイル形式を検出してビューを切り替えるクラス
 */
export class ViewSwitcher {
  /**
   * ファイル拡張子からビュータイプへのマッピング
   */
  private static readonly FILE_TYPE_MAPPINGS: Record<string, ViewType> = {
    // マインドマップ形式
    '.mindmap': 'mindmap',
    '.mm': 'mindmap',
    '.xmind': 'mindmap',
    '.opml': 'mindmap',

    // テーブル形式
    '.csv': 'table',
    '.tsv': 'table',
    '.xlsx': 'table',
    '.xls': 'table',

    // ドキュメント形式
    '.md': 'document',
    '.markdown': 'document',
    '.txt': 'document',
    '.html': 'document',
    '.htm': 'document',
    '.pdf': 'document',

    // JSON形式（構造解析が必要）
    '.json': 'auto'
  };

  /**
   * ファイルのビュータイプを検出する
   * @param uri ファイルのURI
   * @param content ファイルの内容（オプション）
   * @returns 適切なビュータイプ
   */
  public detectViewType(uri: FileUri, content?: string): ViewType {
    const extension = this.getFileExtension(uri.fsPath);
    const mappedType = ViewSwitcher.FILE_TYPE_MAPPINGS[extension];

    // 拡張子から直接判定できる場合
    if (mappedType && mappedType !== 'auto') {
      return mappedType;
    }

    // JSONファイルまたは拡張子が不明な場合はコンテンツ解析
    if (mappedType === 'auto' || !mappedType) {
      if (content) {
        const analysis = this.analyzeJsonStructure(content);
        return analysis.type;
      }
    }

    // デフォルトはマインドマップ
    return 'mindmap';
  }

  /**
   * JSONの構造を解析してビュータイプを判定する
   * @param content JSON文字列
   * @returns 構造解析の結果
   */
  private analyzeJsonStructure(content: string): JsonStructureAnalysis {
    try {
      const data = JSON.parse(content);

      // マインドマップ構造の検出
      if (this.isMindmapStructure(data)) {
        return {
          type: 'mindmap',
          confidence: 0.9,
          reason: 'Hierarchical node structure detected'
        };
      }

      // テーブル構造の検出
      if (this.isTableStructure(data)) {
        return {
          type: 'table',
          confidence: 0.8,
          reason: 'Array-based tabular data detected'
        };
      }

      // ドキュメント構造の検出
      if (this.isDocumentStructure(data)) {
        return {
          type: 'document',
          confidence: 0.7,
          reason: 'Document sections structure detected'
        };
      }

      // 依存関係グラフ構造の検出
      if (this.isDependencyStructure(data)) {
        return {
          type: 'deps',
          confidence: 0.8,
          reason: 'Dependency graph structure detected'
        };
      }

    } catch {
      // JSON パースエラーの場合
      return {
        type: 'document',
        confidence: 0.3,
        reason: 'Invalid JSON, fallback to document view'
      };
    }

    // 不明な構造の場合のフォールバック
    return {
      type: 'mindmap',
      confidence: 0.2,
      reason: 'Unknown structure, fallback to mindmap view'
    };
  }

  /**
   * マインドマップ構造かどうかを判定
   * @param data パース済みJSONデータ
   * @returns マインドマップ構造かどうか
   */
  private isMindmapStructure(data: unknown): boolean {
    // マインドマップの特徴的な構造をチェック
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      // ルートノードがあり、階層構造を持つ
      if (obj.root && typeof obj.root === 'object') {
        return this.hasHierarchicalStructure(obj.root);
      }

      // 直接的な階層構造
      if (obj.text || obj.title || obj.label) {
        return this.hasHierarchicalStructure(obj);
      }

      // nodes配列形式のマインドマップ
      if (Array.isArray(obj.nodes)) {
        return obj.nodes.some((node: unknown) => {
          if (typeof node === 'object' && node !== null) {
            const nodeObj = node as Record<string, unknown>;
            return nodeObj.text || nodeObj.title;
          }
          return false;
        });
      }
    }

    return false;
  }

  /**
   * テーブル構造かどうかを判定
   * @param data パース済みJSONデータ
   * @returns テーブル構造かどうか
   */
  private isTableStructure(data: unknown): boolean {
    // 配列形式のデータ
    if (Array.isArray(data)) {
      // 空配列の場合はfalse
      if (data.length === 0) return false;

      // すべての要素が同じ構造のオブジェクト
      const firstItem = data[0];
      if (typeof firstItem === 'object' && firstItem !== null) {
        const keys = Object.keys(firstItem);
        return data.every((item: unknown) => {
          if (typeof item === 'object' && item !== null) {
            return Object.keys(item).length >= keys.length * 0.5; // 最低限のキー一致度
          }
          return false;
        });
      }

      // プリミティブな配列（CSV変換可能）
      return data.every((item: unknown) =>
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean'
      );
    }

    // オブジェクトの場合、テーブル形式のメタデータをチェック
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;
      return (
        Array.isArray(obj.rows) ||
        Array.isArray(obj.data) ||
        (Array.isArray(obj.columns) && Array.isArray(obj.values))
      );
    }

    return false;
  }

  /**
   * ドキュメント構造かどうかを判定
   * @param data パース済みJSONデータ
   * @returns ドキュメント構造かどうか
   */
  private isDocumentStructure(data: unknown): boolean {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      // セクション形式のドキュメント
      if (Array.isArray(obj.sections)) {
        return obj.sections.some((section: unknown) => {
          if (typeof section === 'object' && section !== null) {
            const sectionObj = section as Record<string, unknown>;
            return sectionObj.title || sectionObj.heading || sectionObj.content;
          }
          return false;
        });
      }

      // 単一ドキュメント形式
      if (obj.title && (obj.content || obj.body || obj.text)) {
        return true;
      }

      // ページ形式のドキュメント
      if (Array.isArray(obj.pages)) {
        return obj.pages.some((page: unknown) => {
          if (typeof page === 'object' && page !== null) {
            const pageObj = page as Record<string, unknown>;
            return Boolean(pageObj.content);
          }
          return false;
        });
      }

      // Markdown形式のメタデータ
      if (obj.markdown || obj.frontmatter) {
        return true;
      }
    }

    return false;
  }

  /**
   * 依存関係構造かどうかを判定
   * @param data パース済みJSONデータ
   * @returns 依存関係構造かどうか
   */
  private isDependencyStructure(data: unknown): boolean {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>;

      // グラフ形式の依存関係
      if (Array.isArray(obj.nodes) && Array.isArray(obj.edges)) {
        return obj.edges.some((edge: unknown) => {
          if (typeof edge === 'object' && edge !== null) {
            const edgeObj = edge as Record<string, unknown>;
            return (edgeObj.source || edgeObj.from) && (edgeObj.target || edgeObj.to);
          }
          return false;
        });
      }

      // dependencies形式
      if (obj.dependencies && typeof obj.dependencies === 'object') {
        return Object.keys(obj.dependencies).length > 0;
      }

      // パッケージ形式の依存関係
      if (obj.devDependencies || obj.peerDependencies) {
        return true;
      }
    }

    return false;
  }

  /**
   * 階層構造を持つかどうかをチェック
   * @param node ノードデータ
   * @returns 階層構造を持つかどうか
   */
  private hasHierarchicalStructure(node: unknown): boolean {
    if (!node || typeof node !== 'object') return false;

    const nodeObj = node as Record<string, unknown>;

    // 子ノードの存在をチェック
    const childrenKeys = ['children', 'child', 'nodes', 'items', 'subtasks'];

    for (const key of childrenKeys) {
      const children = nodeObj[key];
      if (Array.isArray(children) && children.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * ファイル拡張子を取得（小文字化）
   * @param filePath ファイルパス
   * @returns ファイル拡張子
   */
  private getFileExtension(filePath: string): string {
    const lastDotIndex = filePath.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filePath.length - 1) {
      return '';
    }
    return filePath.substring(lastDotIndex).toLowerCase();
  }

  /**
   * サポートされているファイル拡張子の一覧を取得
   * @returns サポートされているファイル拡張子の配列
   */
  public static getSupportedExtensions(): string[] {
    return Object.keys(ViewSwitcher.FILE_TYPE_MAPPINGS);
  }

  /**
   * 拡張子からビュータイプを直接取得（テスト用）
   * @param extension ファイル拡張子
   * @returns ビュータイプまたはundefined
   */
  public static getViewTypeByExtension(extension: string): ViewType | 'auto' | undefined {
    return ViewSwitcher.FILE_TYPE_MAPPINGS[extension.toLowerCase()];
  }

  /**
   * デバッグ用：JSON構造解析の詳細結果を取得
   * @param content JSON文字列
   * @returns 詳細な解析結果
   */
  public analyzeJsonStructureDebug(content: string): JsonStructureAnalysis {
    return this.analyzeJsonStructure(content);
  }
}