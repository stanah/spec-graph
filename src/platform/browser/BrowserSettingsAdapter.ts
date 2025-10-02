import type { SettingsAdapter } from '../interfaces';

/**
 * ブラウザ環境用の設定アダプター
 * LocalStorageを使用して設定を永続化
 */
export class BrowserSettingsAdapter implements SettingsAdapter {
  private static readonly SETTINGS_PREFIX = 'mindmap:settings:';
  private changeCallbacks: ((key: string, value: unknown) => void)[] = [];
  private settings: Map<string, unknown> = new Map();

  /**
   * 設定値を取得
   */
  get<T>(key: string, defaultValue?: T): T {
    const value = this.settings.get(key);

    if (value !== undefined) {
      return value as T;
    }

    // LocalStorageから取得を試みる
    const storageKey = BrowserSettingsAdapter.SETTINGS_PREFIX + key;
    const storedValue = localStorage.getItem(storageKey);

    if (storedValue !== null) {
      try {
        const parsedValue = JSON.parse(storedValue) as T;
        this.settings.set(key, parsedValue);
        return parsedValue;
      } catch {
        // パースに失敗した場合はデフォルト値を返す
      }
    }

    return defaultValue as T;
  }

  /**
   * 設定値を保存
   */
  async set<T>(key: string, value: T): Promise<void> {
    this.settings.set(key, value);

    // LocalStorageに保存
    const storageKey = BrowserSettingsAdapter.SETTINGS_PREFIX + key;
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (error) {
      console.warn(`設定の保存に失敗しました: ${key}`, error);
      throw error;
    }

    // 変更通知
    this.notifyChange(key, value);
  }

  /**
   * 設定変更時のコールバックを設定
   */
  onDidChange(callback: (key: string, value: unknown) => void): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * すべての設定を取得
   */
  getAll(): Record<string, unknown> {
    const allSettings: Record<string, unknown> = {};

    // メモリキャッシュから
    this.settings.forEach((value, key) => {
      allSettings[key] = value;
    });

    // LocalStorageから追加取得
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey?.startsWith(BrowserSettingsAdapter.SETTINGS_PREFIX)) {
        const key = storageKey.replace(BrowserSettingsAdapter.SETTINGS_PREFIX, '');
        if (!(key in allSettings)) {
          const value = localStorage.getItem(storageKey);
          if (value !== null) {
            try {
              allSettings[key] = JSON.parse(value);
            } catch {
              // パースエラーは無視
            }
          }
        }
      }
    }

    return allSettings;
  }

  /**
   * 設定をリセット
   */
  async reset(key: string): Promise<void> {
    this.settings.delete(key);

    const storageKey = BrowserSettingsAdapter.SETTINGS_PREFIX + key;
    localStorage.removeItem(storageKey);

    // 変更通知
    this.notifyChange(key, undefined);
  }

  /**
   * 初期化処理
   */
  async initialize(): Promise<void> {
    // LocalStorageから設定を復元
    for (let i = 0; i < localStorage.length; i++) {
      const storageKey = localStorage.key(i);
      if (storageKey?.startsWith(BrowserSettingsAdapter.SETTINGS_PREFIX)) {
        const key = storageKey.replace(BrowserSettingsAdapter.SETTINGS_PREFIX, '');
        const value = localStorage.getItem(storageKey);
        if (value !== null) {
          try {
            this.settings.set(key, JSON.parse(value));
          } catch {
            // パースエラーは無視
          }
        }
      }
    }
  }

  /**
   * リソースのクリーンアップ
   */
  dispose(): void {
    this.changeCallbacks = [];
    this.settings.clear();
  }

  /**
   * 変更通知
   */
  private notifyChange(key: string, value: unknown): void {
    this.changeCallbacks.forEach(callback => callback(key, value));
  }
}
