import type { FileSystemAdapter, FileDialogOptions } from '../interfaces';
import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';

/**
 * VSCode拡張環境でのファイルシステム操作実装
 * VSCode Extension API との実際の統合を提供
 * FileSystemWatcherとRelativePatternを使用した監視機能を提供
 */
export class VSCodeFileSystemAdapter implements FileSystemAdapter {
  private vscode: VSCodeApi | null = null;
  private messageHandlers = new Map<string, (data: unknown) => void>();
  private fileWatchers = new Map<string, { callback: (content: string) => void; watcherId: string }>();
  private fileSystemWatchers = new Map<string, { callback: (uri: string, changeType: 'created' | 'changed' | 'deleted') => void; watcherId: string }>();
  private requestId = 0;
  private initialized = false;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.initialized) return;

    const vscode = VSCodePlatformAdapter.getVSCodeApi();
    if (vscode && 'postMessage' in vscode) {
      this.vscode = vscode;
      
      // VSCodeからのメッセージを受信
      window.addEventListener('message', (event) => {
        const message = event.data;
        
        // メッセージが不正な場合は無視
        if (!message || typeof message !== 'object') {
          return;
        }
        
        if (message.requestId && this.messageHandlers.has(message.requestId)) {
          const handler = this.messageHandlers.get(message.requestId);
          if (handler) {
            handler(message);
            this.messageHandlers.delete(message.requestId);
          }
        }

        // ファイル監視イベントの処理
        this.handleFileWatchEvent(message);
        this.handleFileSystemWatchEvent(message);
      });

      // VSCode拡張に初期化完了を通知
      this.vscode.postMessage({
        command: 'fileSystemAdapterReady'
      });

      this.initialized = true;
      console.log('VSCodeFileSystemAdapter初期化完了');
    }
  }

  private handleFileWatchEvent(message: {
    command: string;
    watcherId?: string;
    path?: string;
    content?: string;
  }): void {
    switch (message.command) {
      case 'fileChanged':
        if (message.watcherId && message.content !== undefined) {
          // ウォッチャーIDに対応するコールバックを実行
          Array.from(this.fileWatchers.entries()).forEach(([_path, watcher]) => {
            if (watcher.watcherId === message.watcherId) {
              watcher.callback(message.content);
            }
          });
        }
        break;
      case 'fileDeleted':
        if (message.watcherId) {
          // ファイルが削除された場合、ウォッチャーを削除
          Array.from(this.fileWatchers.entries()).forEach(([path, watcher]) => {
            if (watcher.watcherId === message.watcherId) {
              this.fileWatchers.delete(path);
            }
          });
        }
        break;
    }
  }

  private handleFileSystemWatchEvent(message: {
    command: string;
    watcherId?: string;
    uri?: string;
    changeType?: 'created' | 'changed' | 'deleted';
  }): void {
    switch (message.command) {
      case 'fileSystemChanged':
        if (message.watcherId && message.uri && message.changeType) {
          // ウォッチャーIDに対応するコールバックを実行
          Array.from(this.fileSystemWatchers.entries()).forEach(([_patterns, watcher]) => {
            if (watcher.watcherId === message.watcherId) {
              watcher.callback(message.uri, message.changeType);
            }
          });
        }
        break;
      case 'fileSystemWatcherDisposed':
        if (message.watcherId) {
          // FileSystemWatcherが破棄された場合、ウォッチャーを削除
          Array.from(this.fileSystemWatchers.entries()).forEach(([patterns, watcher]) => {
            if (watcher.watcherId === message.watcherId) {
              this.fileSystemWatchers.delete(patterns);
            }
          });
        }
        break;
    }
  }

  private async sendMessage<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
    return this.sendMessageWithRetry<T>(command, payload, this.MAX_RETRY_ATTEMPTS);
  }

  private async sendMessageWithRetry<T>(command: string, payload?: Record<string, unknown>, attempts: number = 1): Promise<T> {
    if (!this.vscode) {
      throw new Error('VSCode API が利用できません');
    }

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await new Promise<T>((resolve, reject) => {
          const requestId = `${++this.requestId}`;

          // レスポンスハンドラーを登録
          this.messageHandlers.set(requestId, (data: unknown) => {
            const response = data as { error?: string; result?: T };
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response.result as T);
            }
          });

          // メッセージを送信
          this.vscode!.postMessage({
            command,
            requestId,
            ...payload
          });

          // タイムアウト処理
          setTimeout(() => {
            if (this.messageHandlers.has(requestId)) {
              this.messageHandlers.delete(requestId);
              reject(new Error(`操作がタイムアウトしました: ${command}`));
            }
          }, 10000);
        });
      } catch (error) {
        const isLastAttempt = attempt === attempts;

        if (isLastAttempt) {
          throw new Error(`操作が失敗しました (${attempt}回試行): ${command} - ${error instanceof Error ? error.message : String(error)}`);
        }

        // 次の試行まで待機
        await this.delay(this.RETRY_DELAY_MS * attempt);
        console.warn(`${command} の試行 ${attempt} が失敗しました。再試行中...`);
      }
    }

    throw new Error(`予期しないエラー: ${command}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async readFile(path: string): Promise<string> {
    return this.sendMessage<string>('readFile', { path });
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.sendMessage<void>('writeFile', { path, content });
  }

  async exists(path: string): Promise<boolean> {
    return this.sendMessage<boolean>('exists', { path });
  }

  async showOpenDialog(options: FileDialogOptions): Promise<string | null> {
    return this.sendMessage<string | null>('showOpenDialog', { options });
  }

  async showSaveDialog(options: FileDialogOptions): Promise<string | null> {
    return this.sendMessage<string | null>('showSaveDialog', { options });
  }

  watchFile(path: string, callback: (content: string) => void): () => void {
    if (!this.vscode) {
      throw new Error('VSCode API が利用できません');
    }

    const watcherId = `watcher_${++this.requestId}`;

    // ウォッチャーを登録
    this.fileWatchers.set(path, { callback, watcherId });

    // VSCode拡張にファイル監視を要求
    this.vscode.postMessage({
      command: 'watchFile',
      path,
      watcherId
    });

    // ウォッチャーを停止する関数を返す
    return () => {
      this.fileWatchers.delete(path);
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'unwatchFile',
          path,
          watcherId
        });
      }
    };
  }

  watchFiles(patterns: string[], callback: (uri: string, changeType: 'created' | 'changed' | 'deleted') => void): () => void {
    if (!this.vscode) {
      throw new Error('VSCode API が利用できません');
    }

    const watcherId = `fs_watcher_${++this.requestId}`;
    const patternsKey = patterns.join(',');

    // FileSystemWatcherを登録
    this.fileSystemWatchers.set(patternsKey, { callback, watcherId });

    // VSCode拡張にFileSystemWatcher監視を要求
    // サポートする拡張子: .mindmap, .mm, .json, .md, .csv, .tsv
    this.vscode.postMessage({
      command: 'watchFileSystem',
      patterns,
      watcherId
    });

    // ウォッチャーを停止する関数を返す
    return () => {
      this.fileSystemWatchers.delete(patternsKey);
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'unwatchFileSystem',
          watcherId
        });
      }
    };
  }

  /**
   * 複数ファイルを同時に読み込み
   */
  async readFiles(paths: string[]): Promise<{ [path: string]: string }> {
    return this.sendMessage<{ [path: string]: string }>('readFiles', { paths });
  }

  /**
   * 複数ファイルを同時に書き込み
   */
  async writeFiles(files: { [path: string]: string }): Promise<void> {
    await this.sendMessage<void>('writeFiles', { files });
  }

  /**
   * ディレクトリ内のファイル一覧を取得
   */
  async listFiles(dirPath: string, pattern?: string): Promise<string[]> {
    return this.sendMessage<string[]>('listFiles', { dirPath, pattern });
  }

  /**
   * ファイルを削除
   */
  async deleteFile(path: string): Promise<void> {
    await this.sendMessage<void>('deleteFile', { path });
  }

  /**
   * ディレクトリを作成
   */
  async createDirectory(path: string): Promise<void> {
    await this.sendMessage<void>('createDirectory', { path });
  }

  /**
   * ファイル/ディレクトリの情報を取得
   */
  async getFileInfo(path: string): Promise<{
    isFile: boolean;
    isDirectory: boolean;
    size: number;
    lastModified: Date;
  }> {
    return this.sendMessage('getFileInfo', { path });
  }

  /**
   * 現在のワークスペースフォルダを取得
   */
  async getWorkspaceFolders(): Promise<string[]> {
    return this.sendMessage<string[]>('getWorkspaceFolders');
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    // すべてのファイルウォッチャーを停止
    Array.from(this.fileWatchers.entries()).forEach(([path, watcher]) => {
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'unwatchFile',
          path,
          watcherId: watcher.watcherId
        });
      }
    });

    // すべてのFileSystemWatcherを停止
    Array.from(this.fileSystemWatchers.entries()).forEach(([_patterns, watcher]) => {
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'unwatchFileSystem',
          watcherId: watcher.watcherId
        });
      }
    });

    this.messageHandlers.clear();
    this.fileWatchers.clear();
    this.fileSystemWatchers.clear();
    this.initialized = false;
  }
}