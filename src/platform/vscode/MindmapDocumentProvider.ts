import { ViewSwitcher, type ViewType, type FileUri } from '../../core/ViewSwitcher';
import { VSCodeFileSystemAdapter } from './VSCodeFileSystemAdapter';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode TextDocumentContentProvider の抽象化インターフェース
 * VSCode環境とブラウザ環境での統一的なインターフェース
 */
export interface TextDocumentContentProvider {
  provideTextDocumentContent(uri: FileUri): string | Promise<string>;
  onDidChange?: (uri: FileUri) => void;
}

/**
 * ドキュメント変更イベントエミッター
 * VSCode環境では vscode.EventEmitter<vscode.Uri> と統合される
 */
export interface DocumentChangeEmitter {
  fire(uri: FileUri): void;
  dispose(): void;
}

/**
 * VSCodeのTextDocumentContentProviderと統合し、
 * ファイル形式に応じたコンテンツを提供するプロバイダー
 */
export class MindmapDocumentProvider implements TextDocumentContentProvider {
  private viewSwitcher: ViewSwitcher;
  private fileSystemAdapter: VSCodeFileSystemAdapter;
  private vscode: VSCodeApi | null;
  private changeEmitter: DocumentChangeEmitter | null = null;

  constructor(
    fileSystemAdapter?: VSCodeFileSystemAdapter,
    changeEmitter?: DocumentChangeEmitter
  ) {
    this.viewSwitcher = new ViewSwitcher();
    this.fileSystemAdapter = fileSystemAdapter || new VSCodeFileSystemAdapter();
    this.vscode = VSCodePlatformAdapter.getVSCodeApi();
    this.changeEmitter = changeEmitter || null;
  }

  /**
   * ファイルURIに基づいてテキストドキュメントのコンテンツを提供
   * @param uri ファイルのURI
   * @returns コンテンツ文字列またはPromise<string>
   */
  async provideTextDocumentContent(uri: FileUri): Promise<string> {
    try {
      // ファイルが存在するかチェック
      const exists = await this.fileSystemAdapter.exists(uri.fsPath);
      if (!exists) {
        return this.generateEmptyContent(uri);
      }

      // ファイル内容を読み込み
      const content = await this.fileSystemAdapter.readFile(uri.fsPath);

      // ビュータイプを検出
      const viewType = this.viewSwitcher.detectViewType(uri, content);

      // ビュータイプに応じたコンテンツをレンダリング
      return this.renderContent(content, viewType, uri);
    } catch (error) {
      console.error('MindmapDocumentProvider: コンテンツ提供中にエラーが発生しました', error);
      return this.generateErrorContent(uri, error);
    }
  }

  /**
   * ビュータイプに応じてコンテンツをレンダリング
   * @param content 元のファイルコンテンツ
   * @param viewType 検出されたビュータイプ
   * @param uri ファイルURI
   * @returns レンダリングされたコンテンツ
   */
  private renderContent(content: string, viewType: ViewType, uri: FileUri): string {
    const fileName = this.getFileName(uri.fsPath);
    const timestamp = new Date().toLocaleString('ja-JP');

    switch (viewType) {
      case 'mindmap':
        return this.renderMindmapContent(content, fileName, timestamp);

      case 'table':
        return this.renderTableContent(content, fileName, timestamp);

      case 'document':
        return this.renderDocumentContent(content, fileName, timestamp);

      case 'deps':
        return this.renderDependencyContent(content, fileName, timestamp);

      default:
        return this.renderDefaultContent(content, fileName, timestamp);
    }
  }

  /**
   * マインドマップビュー用のコンテンツをレンダリング
   */
  private renderMindmapContent(content: string, fileName: string, timestamp: string): string {
    try {
      const data = JSON.parse(content);
      const nodeCount = this.countMindmapNodes(data);

      return `# ${fileName} - マインドマップビュー

最終更新: ${timestamp}
ノード数: ${nodeCount}

## マインドマップ構造

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

---
*このコンテンツは MindmapDocumentProvider によって生成されました*
*ビュータイプ: mindmap*`;
    } catch {
      return this.renderPlainTextContent(content, fileName, timestamp, 'mindmap');
    }
  }

  /**
   * テーブルビュー用のコンテンツをレンダリング
   */
  private renderTableContent(content: string, fileName: string, timestamp: string): string {
    try {
      const data = JSON.parse(content);

      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        const tableMarkdown = this.generateMarkdownTable(data, headers);

        return `# ${fileName} - テーブルビュー

最終更新: ${timestamp}
行数: ${data.length}

## データテーブル

${tableMarkdown}

## 生データ

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

---
*このコンテンツは MindmapDocumentProvider によって生成されました*
*ビュータイプ: table*`;
      }
    } catch {
      // JSON解析失敗時はCSV形式として処理
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length > 1) {
        return `# ${fileName} - テーブルビュー

最終更新: ${timestamp}
行数: ${lines.length}

## CSVデータ

\`\`\`csv
${content}
\`\`\`

---
*このコンテンツは MindmapDocumentProvider によって生成されました*
*ビュータイプ: table (CSV)*`;
      }
    }

    return this.renderPlainTextContent(content, fileName, timestamp, 'table');
  }

  /**
   * ドキュメントビュー用のコンテンツをレンダリング
   */
  private renderDocumentContent(content: string, fileName: string, timestamp: string): string {
    try {
      const data = JSON.parse(content);

      if (data.title || data.sections) {
        return `# ${fileName} - ドキュメントビュー

最終更新: ${timestamp}

${data.title ? `## ${data.title}\n` : ''}

${data.content || data.body || data.text || ''}

${data.sections ? data.sections.map((section: any) =>
  `### ${section.title || section.heading || 'セクション'}

${section.content || section.body || section.text || ''}`
).join('\n\n') : ''}

## メタデータ

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

---
*このコンテンツは MindmapDocumentProvider によって生成されました*
*ビュータイプ: document*`;
      }
    } catch {
      // Markdownまたはプレーンテキストとして処理
      return `# ${fileName} - ドキュメントビュー

最終更新: ${timestamp}

${content}

---
*このコンテンツは MindmapDocumentProvider によって生成されました*
*ビュータイプ: document*`;
    }

    return this.renderPlainTextContent(content, fileName, timestamp, 'document');
  }

  /**
   * 依存関係ビュー用のコンテンツをレンダリング
   */
  private renderDependencyContent(content: string, fileName: string, timestamp: string): string {
    try {
      const data = JSON.parse(content);

      if (data.dependencies) {
        const depList = Object.entries(data.dependencies)
          .map(([name, version]) => `- ${name}: ${version}`)
          .join('\n');

        return `# ${fileName} - 依存関係ビュー

最終更新: ${timestamp}

## 依存関係

${depList}

${data.devDependencies ? `## 開発依存関係

${Object.entries(data.devDependencies)
  .map(([name, version]) => `- ${name}: ${version}`)
  .join('\n')}` : ''}

${data.peerDependencies ? `## ピア依存関係

${Object.entries(data.peerDependencies)
  .map(([name, version]) => `- ${name}: ${version}`)
  .join('\n')}` : ''}

## 生データ

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

---
*このコンテンツは MindmapDocumentProvider によって生成されました*
*ビュータイプ: deps*`;
      }

      if (data.nodes && data.edges) {
        return `# ${fileName} - 依存関係ビュー

最終更新: ${timestamp}

## グラフ構造

ノード数: ${data.nodes.length}
エッジ数: ${data.edges.length}

### ノード
${data.nodes.map((node: any, index: number) =>
  `${index + 1}. ${node.name || node.id || `ノード${index + 1}`}`
).join('\n')}

### エッジ（依存関係）
${data.edges.map((edge: any, index: number) =>
  `${index + 1}. ${edge.source || edge.from} → ${edge.target || edge.to}`
).join('\n')}

## 生データ

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`

---
*このコンテンツは MindmapDocumentProvider によって生成されました*
*ビュータイプ: deps*`;
      }
    } catch {
      // JSON解析失敗
    }

    return this.renderPlainTextContent(content, fileName, timestamp, 'deps');
  }

  /**
   * デフォルトビュー用のコンテンツをレンダリング
   */
  private renderDefaultContent(content: string, fileName: string, timestamp: string): string {
    return this.renderPlainTextContent(content, fileName, timestamp, 'default');
  }

  /**
   * プレーンテキスト形式でコンテンツをレンダリング
   */
  private renderPlainTextContent(content: string, fileName: string, timestamp: string, viewType: string): string {
    return `# ${fileName} - ${viewType}ビュー

最終更新: ${timestamp}

## ファイル内容

\`\`\`
${content}
\`\`\`

---
*このコンテンツは MindmapDocumentProvider によって生成されました*
*ビュータイプ: ${viewType}*`;
  }

  /**
   * 空ファイル用のコンテンツを生成
   */
  private generateEmptyContent(uri: FileUri): string {
    const fileName = this.getFileName(uri.fsPath);
    const timestamp = new Date().toLocaleString('ja-JP');

    return `# ${fileName} - 新しいファイル

作成日時: ${timestamp}

このファイルは空です。コンテンツを追加してください。

---
*このコンテンツは MindmapDocumentProvider によって生成されました*`;
  }

  /**
   * エラー時のコンテンツを生成
   */
  private generateErrorContent(uri: FileUri, error: unknown): string {
    const fileName = this.getFileName(uri.fsPath);
    const timestamp = new Date().toLocaleString('ja-JP');
    const errorMessage = error instanceof Error ? error.message : String(error);

    return `# ${fileName} - エラー

発生日時: ${timestamp}

ファイルの読み込み中にエラーが発生しました。

## エラー詳細

\`\`\`
${errorMessage}
\`\`\`

---
*このコンテンツは MindmapDocumentProvider によって生成されました*`;
  }

  /**
   * マインドマップのノード数をカウント
   */
  private countMindmapNodes(data: any): number {
    let count = 0;

    const countRecursive = (node: any) => {
      if (!node || typeof node !== 'object') return;

      count++;

      const children = node.children || node.child || node.nodes || node.items;
      if (Array.isArray(children)) {
        children.forEach(countRecursive);
      }
    };

    if (data.root) {
      countRecursive(data.root);
    } else if (Array.isArray(data.nodes)) {
      count = data.nodes.length;
    } else {
      countRecursive(data);
    }

    return count;
  }

  /**
   * Markdownテーブルを生成
   */
  private generateMarkdownTable(data: any[], headers: string[]): string {
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
    const dataRows = data.slice(0, 10).map(row => // 最初の10行のみ表示
      `| ${headers.map(header => String(row[header] || '')).join(' | ')} |`
    ).join('\n');

    const totalRows = data.length;
    const omittedNote = totalRows > 10 ? `\n\n*${totalRows - 10}行省略されています*` : '';

    return `${headerRow}\n${separatorRow}\n${dataRows}${omittedNote}`;
  }

  /**
   * ファイル名を取得
   */
  private getFileName(filePath: string): string {
    return filePath.split('/').pop() || filePath.split('\\').pop() || 'Unknown File';
  }

  /**
   * ドキュメント変更を通知
   * @param uri 変更されたファイルのURI
   */
  public notifyDocumentChange(uri: FileUri): void {
    if (this.changeEmitter) {
      this.changeEmitter.fire(uri);
    } else if (this.onDidChange) {
      this.onDidChange(uri);
    }
  }

  /**
   * コンテンツプロバイダーを破棄
   */
  public dispose(): void {
    if (this.changeEmitter) {
      this.changeEmitter.dispose();
      this.changeEmitter = null;
    }

    if (this.fileSystemAdapter && typeof this.fileSystemAdapter.dispose === 'function') {
      this.fileSystemAdapter.dispose();
    }
  }
}