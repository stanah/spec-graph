import type { FileSystemAdapter, FileDialogOptions } from '../interfaces';

/**
 * ブラウザ環境用のファイルシステムアダプター
 * LocalStorageとFile System Access APIを使用
 */
export class BrowserFileSystemAdapter implements FileSystemAdapter {
  private fileCache: Map<string, string> = new Map();
  private watchers: Map<string, ((content: string) => void)[]> = new Map();

  /**
   * ファイルを読み込む
   * ブラウザ版ではキャッシュから読み込む
   */
  async readFile(path: string): Promise<string> {
    const content = this.fileCache.get(path);
    if (content === undefined) {
      throw new Error(`ファイルが見つかりません: ${path}`);
    }
    return content;
  }

  /**
   * ファイルを保存する
   * ブラウザ版ではキャッシュとLocalStorageに保存
   */
  async writeFile(path: string, content: string): Promise<void> {
    this.fileCache.set(path, content);

    // LocalStorageにも保存（永続化）
    try {
      localStorage.setItem(`mindmap:${path}`, content);
    } catch (error) {
      console.warn('LocalStorageへの保存に失敗しました:', error);
    }

    // ファイル変更の通知
    this.notifyWatchers(path, content);
  }

  /**
   * ファイルの存在確認
   */
  async exists(path: string): Promise<boolean> {
    return this.fileCache.has(path) || localStorage.getItem(`mindmap:${path}`) !== null;
  }

  /**
   * ファイル選択ダイアログを表示
   * ブラウザ版ではinput[type="file"]を使用
   */
  async showOpenDialog(options: FileDialogOptions): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = this.buildAcceptString(options.filters);
      input.multiple = options.allowMultiple || false;

      input.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];

        if (file) {
          const content = await file.text();
          const path = file.name;

          // ファイルをキャッシュに保存
          this.fileCache.set(path, content);
          resolve(path);
        } else {
          resolve(null);
        }
      };

      input.oncancel = () => {
        resolve(null);
      };

      input.click();
    });
  }

  /**
   * ファイル保存ダイアログを表示
   * ブラウザ版ではダウンロードとして実装
   */
  async showSaveDialog(options: FileDialogOptions): Promise<string | null> {
    return new Promise((resolve) => {
      const fileName = prompt(options.title || 'ファイル名を入力してください', options.defaultPath || 'mindmap.json');

      if (fileName) {
        resolve(fileName);
      } else {
        resolve(null);
      }
    });
  }

  /**
   * ファイル変更の監視
   * ブラウザ版では手動でトリガー
   */
  watchFile(path: string, callback: (content: string) => void): () => void {
    if (!this.watchers.has(path)) {
      this.watchers.set(path, []);
    }

    this.watchers.get(path)!.push(callback);

    // 監視を停止する関数を返す
    return () => {
      const callbacks = this.watchers.get(path);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * 複数のファイル形式を監視
   * ブラウザ版では未実装（no-op）
   */
  watchFiles(_patterns: string[], _callback: (uri: string, changeType: 'created' | 'changed' | 'deleted') => void): () => void {
    // ブラウザ版では未実装
    return () => {
      // no-op
    };
  }

  /**
   * ファイルをキャッシュに設定（外部から使用）
   */
  setFile(path: string, content: string): void {
    this.fileCache.set(path, content);
    this.notifyWatchers(path, content);
  }

  /**
   * LocalStorageから復元
   */
  async initialize(): Promise<void> {
    // LocalStorageからファイルを復元
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('mindmap:')) {
        const path = key.replace('mindmap:', '');
        const content = localStorage.getItem(key);
        if (content) {
          this.fileCache.set(path, content);
        }
      }
    }
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    this.watchers.clear();
    this.fileCache.clear();
  }

  /**
   * ファイル変更の通知
   */
  private notifyWatchers(path: string, content: string): void {
    const callbacks = this.watchers.get(path);
    if (callbacks) {
      callbacks.forEach(callback => callback(content));
    }
  }

  /**
   * acceptフィルタ文字列を構築
   */
  private buildAcceptString(filters?: Array<{ name: string; extensions: string[] }>): string {
    if (!filters || filters.length === 0) {
      return '.json,.yaml,.yml';
    }

    return filters
      .flatMap(filter => filter.extensions.map(ext => `.${ext}`))
      .join(',');
  }
}
