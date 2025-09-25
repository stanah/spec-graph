/**
 * 自動保存とデバウンス機構を提供するAutoSaveManager
 *
 * ファイル変更を検出して2秒後に自動保存を実行し、
 * 連続変更時のパフォーマンスを最適化します。
 */

import type { FileSystemAdapter } from '../platform/interfaces';

/**
 * 保存対象ファイルの情報
 */
interface PendingFile {
  path: string;
  content: string;
  timestamp: number;
}

/**
 * 自動保存設定
 */
interface AutoSaveOptions {
  /** デバウンス遅延時間（ミリ秒） */
  debounceDelay: number;
  /** 保存失敗時のリトライ回数 */
  maxRetries: number;
  /** リトライ間隔（ミリ秒） */
  retryDelay: number;
  /** 自動保存の有効/無効 */
  enabled: boolean;
}

/**
 * 保存結果
 */
interface SaveResult {
  path: string;
  success: boolean;
  error?: string;
  retries: number;
}

/**
 * AutoSaveManagerクラス
 *
 * ファイル変更イベントを受信してpendingChangesマップに保存し、
 * setTimeoutを使用した2秒のデバウンスタイマーで自動保存を実行します。
 */
export class AutoSaveManager {
  private fileSystemAdapter: FileSystemAdapter;
  private pendingChanges = new Map<string, PendingFile>();
  private saveTimers = new Map<string, NodeJS.Timeout>();
  private options: AutoSaveOptions;
  private disposed = false;

  constructor(
    fileSystemAdapter: FileSystemAdapter,
    options: Partial<AutoSaveOptions> = {}
  ) {
    this.fileSystemAdapter = fileSystemAdapter;
    this.options = {
      debounceDelay: 2000,
      maxRetries: 3,
      retryDelay: 1000,
      enabled: true,
      ...options,
    };
  }

  /**
   * ファイル変更をスケジュールして自動保存を実行
   * @param path ファイルパス
   * @param content ファイル内容
   */
  scheduleAutoSave(path: string, content: string): void {
    if (!this.options.enabled || this.disposed) {
      return;
    }

    // 既存のタイマーをクリア
    const existingTimer = this.saveTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 保留中の変更を記録
    this.pendingChanges.set(path, {
      path,
      content,
      timestamp: Date.now(),
    });

    // 新しいデバウンスタイマーを設定
    const timer = setTimeout(() => {
      this.executePendingSave(path);
    }, this.options.debounceDelay);

    this.saveTimers.set(path, timer);
  }

  /**
   * 特定ファイルの保留中の保存を実行
   * @param path ファイルパス
   */
  private async executePendingSave(path: string): Promise<void> {
    const pendingFile = this.pendingChanges.get(path);
    if (!pendingFile) {
      return;
    }

    try {
      await this.saveWithRetry(pendingFile);

      // 成功時はクリーンアップ
      this.pendingChanges.delete(path);
      this.saveTimers.delete(path);
    } catch (error) {
      console.error(`[AutoSaveManager] Failed to save file ${path}:`, error);

      // 失敗時もクリーンアップ（無限リトライを避ける）
      this.pendingChanges.delete(path);
      this.saveTimers.delete(path);
    }
  }

  /**
   * 全ての保留中の保存を実行
   * @returns 保存結果の配列
   */
  async executePendingSaves(): Promise<SaveResult[]> {
    if (this.pendingChanges.size === 0) {
      return [];
    }

    // すべてのタイマーをクリア
    this.saveTimers.forEach(timer => clearTimeout(timer));
    this.saveTimers.clear();

    // 保留中のファイルをコピーして同時処理
    const pendingFiles = Array.from(this.pendingChanges.values());
    this.pendingChanges.clear();

    // Promise.allSettledを使用して複数ファイルの同時保存
    const savePromises = pendingFiles.map(file => this.saveFileWithResult(file));
    const results = await Promise.allSettled(savePromises);

    return results.map((result, index) => {
      const file = pendingFiles[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          path: file.path,
          success: false,
          error: result.reason?.message || 'Unknown error',
          retries: 0,
        };
      }
    });
  }

  /**
   * ファイル保存をリトライ機能付きで実行
   * @param file 保存対象ファイル
   * @returns 保存結果
   */
  private async saveFileWithResult(file: PendingFile): Promise<SaveResult> {
    let lastError: Error | undefined;

    for (let retry = 0; retry <= this.options.maxRetries; retry++) {
      try {
        await this.fileSystemAdapter.writeFile(file.path, file.content);
        return {
          path: file.path,
          success: true,
          retries: retry,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (retry < this.options.maxRetries) {
          // リトライ前に待機
          await this.delay(this.options.retryDelay * (retry + 1));
        }
      }
    }

    return {
      path: file.path,
      success: false,
      error: lastError?.message || 'Unknown error',
      retries: this.options.maxRetries,
    };
  }

  /**
   * リトライ機能付きでファイルを保存
   * @param file 保存対象ファイル
   */
  private async saveWithRetry(file: PendingFile): Promise<void> {
    const result = await this.saveFileWithResult(file);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  /**
   * 指定時間待機
   * @param ms 待機時間（ミリ秒）
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 保留中のファイル数を取得
   * @returns 保留中のファイル数
   */
  getPendingCount(): number {
    return this.pendingChanges.size;
  }

  /**
   * 保留中のファイルパスを取得
   * @returns 保留中のファイルパスの配列
   */
  getPendingPaths(): string[] {
    return Array.from(this.pendingChanges.keys());
  }

  /**
   * 特定ファイルの保存をキャンセル
   * @param path ファイルパス
   */
  cancelSave(path: string): void {
    const timer = this.saveTimers.get(path);
    if (timer) {
      clearTimeout(timer);
      this.saveTimers.delete(path);
    }
    this.pendingChanges.delete(path);
  }

  /**
   * 全ての保存をキャンセル
   */
  cancelAllSaves(): void {
    this.saveTimers.forEach(timer => clearTimeout(timer));
    this.saveTimers.clear();
    this.pendingChanges.clear();
  }

  /**
   * 自動保存設定を更新
   * @param options 更新する設定
   */
  updateOptions(options: Partial<AutoSaveOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * 自動保存の有効/無効を切り替え
   * @param enabled 有効かどうか
   */
  setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;

    if (!enabled) {
      // 無効化時は全ての保存をキャンセル
      this.cancelAllSaves();
    }
  }

  /**
   * 現在の設定を取得
   * @returns 現在の設定
   */
  getOptions(): AutoSaveOptions {
    return { ...this.options };
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.cancelAllSaves();
    this.disposed = true;
  }

  /**
   * 破棄されているかどうか
   * @returns 破棄されているかどうか
   */
  isDisposed(): boolean {
    return this.disposed;
  }
}