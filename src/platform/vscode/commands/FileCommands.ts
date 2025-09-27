import { ViewSwitcher, type ViewType, type FileUri } from '../../../core/ViewSwitcher';
import { MindmapDocumentProvider } from '../MindmapDocumentProvider';
import { VSCodeFileSystemAdapter } from '../VSCodeFileSystemAdapter';
import { VSCodePlatformAdapter } from '../VSCodePlatformAdapter';
import type { VSCodeApi } from '../VSCodeApiSingleton';

/**
 * QuickPickアイテムの定義
 * VSCodeのQuickPickItemと互換性を持つ
 */
export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
  alwaysShow?: boolean;
}

/**
 * QuickPickオプションの定義
 */
export interface QuickPickOptions {
  placeHolder?: string;
  canPickMany?: boolean;
  ignoreFocusOut?: boolean;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
}

/**
 * ビュー選択用のQuickPickアイテム
 */
interface ViewPickItem extends QuickPickItem {
  viewType: ViewType;
}

/**
 * VSCode拡張のファイル操作コマンドを管理するクラス
 */
export class FileCommands {
  private vscode: VSCodeApi | null;
  private fileSystemAdapter: VSCodeFileSystemAdapter;
  private documentProvider: MindmapDocumentProvider;
  private viewSwitcher: ViewSwitcher;
  private disposables: Array<{ dispose(): void }> = [];

  constructor(
    documentProvider?: MindmapDocumentProvider,
    fileSystemAdapter?: VSCodeFileSystemAdapter
  ) {
    this.vscode = VSCodePlatformAdapter.getVSCodeApi();
    this.fileSystemAdapter = fileSystemAdapter || new VSCodeFileSystemAdapter();
    this.documentProvider = documentProvider || new MindmapDocumentProvider(this.fileSystemAdapter);
    this.viewSwitcher = new ViewSwitcher();
  }

  /**
   * すべてのファイル操作コマンドを登録
   */
  public registerAllCommands(): void {
    try {
      this.registerOpenWithCommand();
      this.registerNewFileCommand();
      this.registerSwitchViewCommand();
      this.registerRefreshCommand();

      console.log('ファイル操作コマンドの登録が完了しました');
    } catch (error) {
      console.error('ファイル操作コマンドの登録中にエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * mindmap.openWithコマンドを登録
   * ファイルを指定されたビューで開く
   */
  private registerOpenWithCommand(): void {
    if (!this.vscode) {
      console.warn('VSCode API が利用できません。openWithコマンドをスキップします。');
      return;
    }

    // VSCode拡張にコマンド登録を要求
    this.vscode.postMessage({
      command: 'registerCommand',
      commandId: 'mindmap.openWith',
      title: 'ビューを選択して開く',
      callback: this.handleOpenWithCommand.bind(this)
    });

    console.log('mindmap.openWithコマンドを登録しました');
  }

  /**
   * mindmap.newFileコマンドを登録
   * 新しいファイルを作成
   */
  private registerNewFileCommand(): void {
    if (!this.vscode) {
      console.warn('VSCode API が利用できません。newFileコマンドをスキップします。');
      return;
    }

    this.vscode.postMessage({
      command: 'registerCommand',
      commandId: 'mindmap.newFile',
      title: '新しいマインドマップファイルを作成',
      callback: this.handleNewFileCommand.bind(this)
    });

    console.log('mindmap.newFileコマンドを登録しました');
  }

  /**
   * mindmap.switchViewコマンドを登録
   * 現在開いているファイルのビューを切り替え
   */
  private registerSwitchViewCommand(): void {
    if (!this.vscode) {
      console.warn('VSCode API が利用できません。switchViewコマンドをスキップします。');
      return;
    }

    this.vscode.postMessage({
      command: 'registerCommand',
      commandId: 'mindmap.switchView',
      title: 'ビューを切り替え',
      callback: this.handleSwitchViewCommand.bind(this)
    });

    console.log('mindmap.switchViewコマンドを登録しました');
  }

  /**
   * mindmap.refreshコマンドを登録
   * ドキュメントを再読み込み
   */
  private registerRefreshCommand(): void {
    if (!this.vscode) {
      console.warn('VSCode API が利用できません。refreshコマンドをスキップします。');
      return;
    }

    this.vscode.postMessage({
      command: 'registerCommand',
      commandId: 'mindmap.refresh',
      title: 'ドキュメントを更新',
      callback: this.handleRefreshCommand.bind(this)
    });

    console.log('mindmap.refreshコマンドを登録しました');
  }

  /**
   * openWithコマンドのハンドラー
   */
  private async handleOpenWithCommand(uri?: FileUri): Promise<void> {
    try {
      // URIが指定されていない場合は現在のアクティブファイルを使用
      const targetUri = uri || await this.getCurrentActiveUri();
      if (!targetUri) {
        await this.showInformation('開くファイルが選択されていません。');
        return;
      }

      // ビュー選択UIを表示
      const selectedViewType = await this.showViewSelectionQuickPick(targetUri);
      if (!selectedViewType) {
        return; // ユーザーがキャンセルした場合
      }

      // 選択されたビューでファイルを開く
      await this.openFileInView(targetUri, selectedViewType);

    } catch (error) {
      console.error('openWithコマンド実行中にエラーが発生しました:', error);
      await this.showError(`ファイルを開く際にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * newFileコマンドのハンドラー
   */
  private async handleNewFileCommand(): Promise<void> {
    try {
      // ファイル名の入力を求める
      const fileName = await this.showInputBox({
        prompt: '新しいファイルの名前を入力してください',
        placeHolder: 'my-mindmap.mindmap',
        value: 'untitled.mindmap'
      });

      if (!fileName) {
        return; // ユーザーがキャンセルした場合
      }

      // ファイル保存場所の選択
      const filePath = await this.showSaveDialog({
        defaultUri: fileName,
        filters: {
          'マインドマップファイル': ['mindmap', 'mm'],
          'JSONファイル': ['json'],
          'Markdownファイル': ['md'],
          'すべてのファイル': ['*']
        }
      });

      if (!filePath) {
        return; // ユーザーがキャンセルした場合
      }

      // 初期コンテンツを生成
      const initialContent = this.generateInitialContent(fileName, filePath);

      // ファイルを作成
      await this.fileSystemAdapter.writeFile(filePath, initialContent);

      // 作成したファイルを開く
      await this.openFileInView({ fsPath: filePath }, 'mindmap');

      await this.showInformation(`新しいファイルが作成されました: ${fileName}`);

    } catch (error) {
      console.error('newFileコマンド実行中にエラーが発生しました:', error);
      await this.showError(`新しいファイルの作成中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * switchViewコマンドのハンドラー
   */
  private async handleSwitchViewCommand(): Promise<void> {
    try {
      const currentUri = await this.getCurrentActiveUri();
      if (!currentUri) {
        await this.showInformation('切り替えるファイルが選択されていません。');
        return;
      }

      const selectedViewType = await this.showViewSelectionQuickPick(currentUri);
      if (!selectedViewType) {
        return; // ユーザーがキャンセルした場合
      }

      await this.openFileInView(currentUri, selectedViewType);

    } catch (error) {
      console.error('switchViewコマンド実行中にエラーが発生しました:', error);
      await this.showError(`ビューの切り替え中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * refreshコマンドのハンドラー
   */
  private async handleRefreshCommand(): Promise<void> {
    try {
      const currentUri = await this.getCurrentActiveUri();
      if (!currentUri) {
        await this.showInformation('更新するファイルが選択されていません。');
        return;
      }

      // ドキュメントの変更を通知して再読み込みを促す
      this.documentProvider.notifyDocumentChange(currentUri);

      await this.showInformation('ドキュメントを更新しました。');

    } catch (error) {
      console.error('refreshコマンド実行中にエラーが発生しました:', error);
      await this.showError(`ドキュメントの更新中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * ビュー選択のQuickPickを表示
   */
  private async showViewSelectionQuickPick(uri: FileUri): Promise<ViewType | null> {
    // 現在のビュータイプを検出
    let content: string | undefined;
    try {
      const exists = await this.fileSystemAdapter.exists(uri.fsPath);
      if (exists) {
        content = await this.fileSystemAdapter.readFile(uri.fsPath);
      }
    } catch (error) {
      console.warn('ファイル読み込み中にエラーが発生しました:', error);
    }

    const currentViewType = this.viewSwitcher.detectViewType(uri, content);

    // ビュー選択肢を生成
    const viewPickItems: ViewPickItem[] = [
      {
        label: '🧠 マインドマップ',
        description: '階層構造でアイデアを整理',
        detail: 'ノード形式での視覚的な表現',
        viewType: 'mindmap',
        picked: currentViewType === 'mindmap'
      },
      {
        label: '📊 テーブル',
        description: '表形式でデータを表示',
        detail: 'CSV/JSON データの構造化表示',
        viewType: 'table',
        picked: currentViewType === 'table'
      },
      {
        label: '📝 ドキュメント',
        description: 'テキスト形式で表示',
        detail: 'Markdown形式での読みやすい表示',
        viewType: 'document',
        picked: currentViewType === 'document'
      },
      {
        label: '🔗 依存関係',
        description: '依存関係グラフを表示',
        detail: 'パッケージ依存関係の可視化',
        viewType: 'deps',
        picked: currentViewType === 'deps'
      }
    ];

    const selectedItem = await this.showQuickPick(viewPickItems, {
      placeHolder: 'ビューを選択してください',
      matchOnDescription: true,
      matchOnDetail: true
    });

    return selectedItem?.viewType || null;
  }

  /**
   * ファイルを指定されたビューで開く
   */
  private async openFileInView(uri: FileUri, viewType: ViewType): Promise<void> {
    if (!this.vscode) {
      throw new Error('VSCode API が利用できません');
    }

    // VSCode拡張にファイルオープンを要求
    this.vscode.postMessage({
      command: 'openFileInView',
      uri: uri.fsPath,
      viewType: viewType
    });
  }

  /**
   * 現在アクティブなファイルのURIを取得
   */
  private async getCurrentActiveUri(): Promise<FileUri | null> {
    if (!this.vscode) {
      return null;
    }

    return new Promise<FileUri | null>((resolve) => {
      const requestId = `getCurrentActiveUri_${Date.now()}`;

      // レスポンスハンドラーを設定
      const handler = (event: MessageEvent) => {
        const message = event.data;
        if (message.requestId === requestId) {
          window.removeEventListener('message', handler);
          resolve(message.result ? { fsPath: message.result } : null);
        }
      };

      window.addEventListener('message', handler);

      // VSCode拡張にアクティブファイル情報を要求
      this.vscode.postMessage({
        command: 'getCurrentActiveUri',
        requestId
      });

      // タイムアウト処理
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 5000);
    });
  }

  /**
   * 初期コンテンツを生成
   */
  private generateInitialContent(fileName: string, filePath: string): string {
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    const timestamp = new Date().toISOString();

    switch (fileExtension) {
      case 'mindmap':
      case 'mm':
        return JSON.stringify({
          meta: {
            title: fileName,
            created: timestamp,
            version: "1.0"
          },
          root: {
            text: "中央トピック",
            children: [
              {
                text: "トピック 1",
                children: []
              },
              {
                text: "トピック 2",
                children: []
              }
            ]
          }
        }, null, 2);

      case 'json':
        return JSON.stringify({
          title: fileName,
          created: timestamp,
          data: []
        }, null, 2);

      case 'md':
        return `# ${fileName}

作成日: ${new Date().toLocaleDateString('ja-JP')}

## 概要

このドキュメントについて説明してください。

## 内容

- 項目1
- 項目2
- 項目3
`;

      default:
        return `{
  "title": "${fileName}",
  "created": "${timestamp}",
  "type": "mindmap",
  "root": {
    "text": "中央トピック",
    "children": []
  }
}`;
    }
  }

  /**
   * QuickPickを表示（VSCode API 呼び出し）
   */
  private async showQuickPick<T extends QuickPickItem>(
    items: T[],
    options?: QuickPickOptions
  ): Promise<T | null> {
    if (!this.vscode) {
      return null;
    }

    return new Promise<T | null>((resolve) => {
      const requestId = `showQuickPick_${Date.now()}`;

      const handler = (event: MessageEvent) => {
        const message = event.data;
        if (message.requestId === requestId) {
          window.removeEventListener('message', handler);
          const selectedIndex = message.result;
          resolve(selectedIndex !== undefined && selectedIndex !== null ? items[selectedIndex] : null);
        }
      };

      window.addEventListener('message', handler);

      this.vscode.postMessage({
        command: 'showQuickPick',
        requestId,
        items,
        options
      });

      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 30000);
    });
  }

  /**
   * 入力ボックスを表示
   */
  private async showInputBox(options: {
    prompt?: string;
    placeHolder?: string;
    value?: string;
  }): Promise<string | null> {
    if (!this.vscode) {
      return null;
    }

    return new Promise<string | null>((resolve) => {
      const requestId = `showInputBox_${Date.now()}`;

      const handler = (event: MessageEvent) => {
        const message = event.data;
        if (message.requestId === requestId) {
          window.removeEventListener('message', handler);
          resolve(message.result || null);
        }
      };

      window.addEventListener('message', handler);

      this.vscode.postMessage({
        command: 'showInputBox',
        requestId,
        options
      });

      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 30000);
    });
  }

  /**
   * ファイル保存ダイアログを表示
   */
  private async showSaveDialog(options: {
    defaultUri?: string;
    filters?: Record<string, string[]>;
  }): Promise<string | null> {
    if (!this.vscode) {
      return null;
    }

    return new Promise<string | null>((resolve) => {
      const requestId = `showSaveDialog_${Date.now()}`;

      const handler = (event: MessageEvent) => {
        const message = event.data;
        if (message.requestId === requestId) {
          window.removeEventListener('message', handler);
          resolve(message.result || null);
        }
      };

      window.addEventListener('message', handler);

      this.vscode.postMessage({
        command: 'showSaveDialog',
        requestId,
        options
      });

      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, 30000);
    });
  }

  /**
   * 情報メッセージを表示
   */
  private async showInformation(message: string): Promise<void> {
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'showInformation',
        message
      });
    } else {
      console.info(message);
    }
  }

  /**
   * エラーメッセージを表示
   */
  private async showError(message: string): Promise<void> {
    try {
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'showError',
          message
        });
      } else {
        console.error(message);
      }
    } catch (error) {
      // VSCode API自体でエラーが発生した場合はコンソールにフォールバック
      console.error('Error showing error message:', error);
      console.error('Original message:', message);
    }
  }

  /**
   * リソースを解放
   */
  public dispose(): void {
    try {
      this.disposables.forEach((disposable, index) => {
        try {
          disposable.dispose();
        } catch (error) {
          console.error(`Disposable ${index} 解放中にエラーが発生しました:`, error);
        }
      });

      this.disposables = [];

      if (this.documentProvider && typeof this.documentProvider.dispose === 'function') {
        try {
          this.documentProvider.dispose();
        } catch (error) {
          console.error('DocumentProvider解放中にエラーが発生しました:', error);
        }
      }

      if (this.fileSystemAdapter && typeof this.fileSystemAdapter.dispose === 'function') {
        try {
          this.fileSystemAdapter.dispose();
        } catch (error) {
          console.error('FileSystemAdapter解放中にエラーが発生しました:', error);
        }
      }

      console.log('FileCommandsが解放されました');
    } catch (error) {
      console.error('FileCommands dispose中に予期しないエラーが発生しました:', error);
    }
  }
}