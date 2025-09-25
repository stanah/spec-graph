import { MindmapDocumentProvider } from './MindmapDocumentProvider';
import { FileCommands } from './commands/FileCommands';
import { DocumentChangeEmitter } from './DocumentChangeEmitter';
import { VSCodeFileSystemAdapter } from './VSCodeFileSystemAdapter';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode TextDocumentProvider統合の設定オプション
 */
export interface VSCodeTextDocumentIntegrationOptions {
  /**
   * カスタムファイルシステムアダプター（テスト用）
   */
  fileSystemAdapter?: VSCodeFileSystemAdapter;

  /**
   * カスタムドキュメント変更エミッター（テスト用）
   */
  changeEmitter?: DocumentChangeEmitter;

  /**
   * コマンド登録を無効化（デフォルト: false）
   */
  disableCommands?: boolean;

  /**
   * 自動初期化を無効化（デフォルト: false）
   */
  disableAutoInitialization?: boolean;

  /**
   * デバッグモードを有効化（デフォルト: false）
   */
  debugMode?: boolean;
}

/**
 * VSCode TextDocumentProvider統合の状態
 */
export interface VSCodeTextDocumentIntegrationState {
  initialized: boolean;
  disposed: boolean;
  documentsProviderRegistered: boolean;
  commandsRegistered: boolean;
  fileWatcherActive: boolean;
  lastError: Error | null;
}

/**
 * VSCodeのTextDocumentProvider、コマンド、イベント統合を管理するメインクラス
 */
export class VSCodeTextDocumentIntegration {
  private vscode: VSCodeApi | null;
  private fileSystemAdapter: VSCodeFileSystemAdapter;
  private changeEmitter: DocumentChangeEmitter;
  private documentProvider: MindmapDocumentProvider;
  private fileCommands: FileCommands;

  private state: VSCodeTextDocumentIntegrationState = {
    initialized: false,
    disposed: false,
    documentsProviderRegistered: false,
    commandsRegistered: false,
    fileWatcherActive: false,
    lastError: null
  };

  private disposables: Array<{ dispose(): void }> = [];
  private options: VSCodeTextDocumentIntegrationOptions;

  constructor(options: VSCodeTextDocumentIntegrationOptions = {}) {
    this.options = { ...options };
    this.vscode = VSCodePlatformAdapter.getVSCodeApi();

    // 依存関係を初期化
    this.fileSystemAdapter = options.fileSystemAdapter || new VSCodeFileSystemAdapter();
    this.changeEmitter = options.changeEmitter || new DocumentChangeEmitter();
    this.documentProvider = new MindmapDocumentProvider(this.fileSystemAdapter, this.changeEmitter);
    this.fileCommands = new FileCommands(this.documentProvider, this.fileSystemAdapter);

    if (this.options.debugMode) {
      console.log('VSCodeTextDocumentIntegration: Created with options', this.options);
    }

    // 自動初期化
    if (!options.disableAutoInitialization) {
      this.initialize().catch(error => {
        console.error('VSCodeTextDocumentIntegration: Auto-initialization failed', error);
        this.state.lastError = error;
      });
    }
  }

  /**
   * 統合機能を初期化
   */
  public async initialize(): Promise<void> {
    if (this.state.initialized) {
      console.warn('VSCodeTextDocumentIntegration: Already initialized');
      return;
    }

    if (this.state.disposed) {
      throw new Error('VSCodeTextDocumentIntegration: Cannot initialize disposed instance');
    }

    try {
      if (this.options.debugMode) {
        console.log('VSCodeTextDocumentIntegration: Starting initialization...');
      }

      // TextDocumentProviderの登録
      await this.registerDocumentProvider();

      // コマンドの登録
      if (!this.options.disableCommands) {
        await this.registerCommands();
      }

      // ファイル監視の設定
      await this.setupFileWatching();

      this.state.initialized = true;
      this.state.lastError = null;

      if (this.options.debugMode) {
        console.log('VSCodeTextDocumentIntegration: Initialization completed successfully');
      }

      // 初期化完了を通知
      this.notifyInitializationComplete();

    } catch (error) {
      this.state.lastError = error instanceof Error ? error : new Error(String(error));
      console.error('VSCodeTextDocumentIntegration: Initialization failed', error);
      throw error;
    }
  }

  /**
   * TextDocumentProviderをVSCodeに登録
   */
  private async registerDocumentProvider(): Promise<void> {
    if (!this.vscode) {
      throw new Error('VSCode API is not available');
    }

    return new Promise<void>((resolve, reject) => {
      const requestId = `registerProvider_${Date.now()}`;

      // レスポンスハンドラーを設定
      const handler = (event: MessageEvent) => {
        const message = event.data;
        if (message.requestId === requestId) {
          window.removeEventListener('message', handler);

          if (message.error) {
            reject(new Error(message.error));
          } else {
            this.state.documentsProviderRegistered = true;
            resolve();
          }
        }
      };

      window.addEventListener('message', handler);

      // VSCode拡張にTextDocumentProviderの登録を要求
      this.vscode.postMessage({
        command: 'registerTextDocumentContentProvider',
        scheme: 'mindmap',
        requestId
      });

      // タイムアウト処理
      setTimeout(() => {
        window.removeEventListener('message', handler);
        reject(new Error('DocumentProvider registration timeout'));
      }, 10000);
    });
  }

  /**
   * ファイル操作コマンドを登録
   */
  private async registerCommands(): Promise<void> {
    try {
      this.fileCommands.registerAllCommands();
      this.state.commandsRegistered = true;

      if (this.options.debugMode) {
        console.log('VSCodeTextDocumentIntegration: Commands registered successfully');
      }
    } catch (error) {
      console.error('VSCodeTextDocumentIntegration: Command registration failed', error);
      throw error;
    }
  }

  /**
   * ファイル監視を設定
   */
  private async setupFileWatching(): Promise<void> {
    try {
      // サポートされるファイル拡張子のパターンを作成
      const patterns = [
        '**/*.mindmap',
        '**/*.mm',
        '**/*.json',
        '**/*.md',
        '**/*.csv',
        '**/*.tsv'
      ];

      // ファイルシステム監視を開始
      const disposable = this.fileSystemAdapter.watchFiles(patterns, (uri, changeType) => {
        this.handleFileSystemChange(uri, changeType);
      });

      this.disposables.push({ dispose: disposable });
      this.state.fileWatcherActive = true;

      if (this.options.debugMode) {
        console.log('VSCodeTextDocumentIntegration: File watching setup completed');
      }
    } catch (error) {
      console.error('VSCodeTextDocumentIntegration: File watching setup failed', error);
      throw error;
    }
  }

  /**
   * ファイルシステム変更を処理
   */
  private handleFileSystemChange(uri: string, changeType: 'created' | 'changed' | 'deleted'): void {
    try {
      const fileUri = { fsPath: uri };

      if (this.options.debugMode) {
        console.log(`VSCodeTextDocumentIntegration: File ${changeType}: ${uri}`);
      }

      switch (changeType) {
        case 'changed':
          // ファイル変更時はドキュメント更新を通知
          this.changeEmitter.fireDebounced(fileUri, 500);
          break;

        case 'created':
          // ファイル作成時は即座に通知
          this.changeEmitter.fire(fileUri);
          break;

        case 'deleted':
          // ファイル削除時は遅延なしで通知
          this.changeEmitter.fire(fileUri);
          break;
      }
    } catch (error) {
      console.error('VSCodeTextDocumentIntegration: File system change handling failed', error);
    }
  }

  /**
   * 初期化完了をVSCodeに通知
   */
  private notifyInitializationComplete(): void {
    if (this.vscode) {
      this.vscode.postMessage({
        command: 'textDocumentIntegrationReady',
        providerId: 'mindmap',
        capabilities: {
          textDocumentProvider: this.state.documentsProviderRegistered,
          commands: this.state.commandsRegistered,
          fileWatcher: this.state.fileWatcherActive
        }
      });
    }
  }

  /**
   * 統合の現在の状態を取得
   */
  public getState(): VSCodeTextDocumentIntegrationState {
    return { ...this.state };
  }

  /**
   * 統合が使用可能かどうかを確認
   */
  public isAvailable(): boolean {
    return this.state.initialized && !this.state.disposed && this.vscode !== null;
  }

  /**
   * デバッグ情報を取得
   */
  public getDebugInfo(): {
    state: VSCodeTextDocumentIntegrationState;
    options: VSCodeTextDocumentIntegrationOptions;
    hasVSCodeApi: boolean;
    fileSystemAdapterState: any;
    changeEmitterState: any;
    disposablesCount: number;
  } {
    return {
      state: this.getState(),
      options: this.options,
      hasVSCodeApi: this.vscode !== null,
      fileSystemAdapterState: (this.fileSystemAdapter as any).getState?.() || 'Not available',
      changeEmitterState: this.changeEmitter.getState(),
      disposablesCount: this.disposables.length
    };
  }

  /**
   * 手動でドキュメント変更を通知
   */
  public notifyDocumentChange(uri: string | { fsPath: string }): void {
    const fileUri = typeof uri === 'string' ? { fsPath: uri } : uri;
    this.changeEmitter.fire(fileUri);
  }

  /**
   * 複数のドキュメント変更を一括通知
   */
  public notifyMultipleDocumentChanges(uris: Array<string | { fsPath: string }>): void {
    const fileUris = uris.map(uri => typeof uri === 'string' ? { fsPath: uri } : uri);
    this.changeEmitter.fireMultiple(fileUris);
  }

  /**
   * 条件付きでドキュメント変更を通知
   */
  public notifyDocumentChangeIf(
    uri: string | { fsPath: string },
    condition: (uri: { fsPath: string }) => boolean
  ): void {
    const fileUri = typeof uri === 'string' ? { fsPath: uri } : uri;
    this.changeEmitter.fireConditional(fileUri, condition);
  }

  /**
   * 特定のファイルタイプの変更のみを通知する条件関数
   */
  public static createFileTypeCondition(extensions: string[]): (uri: { fsPath: string }) => boolean {
    const normalizedExtensions = extensions.map(ext => ext.toLowerCase().startsWith('.') ? ext : `.${ext}`);

    return (uri: { fsPath: string }) => {
      const fileExtension = uri.fsPath.toLowerCase().split('.').pop();
      return fileExtension ? normalizedExtensions.some(ext => ext.endsWith(fileExtension)) : false;
    };
  }

  /**
   * 統合機能を再初期化
   */
  public async reinitialize(): Promise<void> {
    if (this.state.disposed) {
      throw new Error('Cannot reinitialize disposed integration');
    }

    // 現在の状態をクリア
    this.state.initialized = false;
    this.state.documentsProviderRegistered = false;
    this.state.commandsRegistered = false;
    this.state.fileWatcherActive = false;

    // 既存のDisposableをクリア
    this.disposables.forEach(disposable => {
      try {
        disposable.dispose();
      } catch (error) {
        console.error('Error disposing resource during reinitialize:', error);
      }
    });
    this.disposables = [];

    // 再初期化
    await this.initialize();
  }

  /**
   * すべてのリソースを解放し、統合機能を破棄
   */
  public dispose(): void {
    if (this.state.disposed) {
      return;
    }

    try {
      if (this.options.debugMode) {
        console.log('VSCodeTextDocumentIntegration: Starting disposal...');
      }

      // すべてのDisposableを解放
      this.disposables.forEach((disposable, index) => {
        try {
          disposable.dispose();
        } catch (error) {
          console.error(`Error disposing resource ${index}:`, error);
        }
      });

      // 各コンポーネントを解放
      if (this.fileCommands && typeof this.fileCommands.dispose === 'function') {
        this.fileCommands.dispose();
      }

      if (this.documentProvider && typeof this.documentProvider.dispose === 'function') {
        this.documentProvider.dispose();
      }

      if (this.changeEmitter && typeof this.changeEmitter.dispose === 'function') {
        this.changeEmitter.dispose();
      }

      if (this.fileSystemAdapter && typeof this.fileSystemAdapter.dispose === 'function') {
        this.fileSystemAdapter.dispose();
      }

      // VSCode拡張に破棄を通知
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'textDocumentIntegrationDisposed',
          providerId: 'mindmap'
        });
      }

      this.state.disposed = true;
      this.disposables = [];

      if (this.options.debugMode) {
        console.log('VSCodeTextDocumentIntegration: Disposal completed');
      }
    } catch (error) {
      console.error('VSCodeTextDocumentIntegration: Error during disposal', error);
    }
  }
}

/**
 * グローバルなVSCode TextDocument統合インスタンスのファクトリー
 */
export class VSCodeTextDocumentIntegrationFactory {
  private static instance: VSCodeTextDocumentIntegration | null = null;

  /**
   * シングルトンインスタンスを取得または作成
   */
  public static getInstance(options?: VSCodeTextDocumentIntegrationOptions): VSCodeTextDocumentIntegration {
    if (!this.instance || this.instance.getState().disposed) {
      this.instance = new VSCodeTextDocumentIntegration(options);
    }
    return this.instance;
  }

  /**
   * インスタンスを破棄
   */
  public static dispose(): void {
    if (this.instance) {
      this.instance.dispose();
      this.instance = null;
    }
  }

  /**
   * インスタンスが存在するかチェック
   */
  public static hasInstance(): boolean {
    return this.instance !== null && !this.instance.getState().disposed;
  }

  /**
   * インスタンスの状態を取得
   */
  public static getState(): VSCodeTextDocumentIntegrationState | null {
    return this.instance ? this.instance.getState() : null;
  }
}