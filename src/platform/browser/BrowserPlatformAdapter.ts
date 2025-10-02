import type { PlatformAdapter } from '../interfaces';
import { BrowserFileSystemAdapter } from './BrowserFileSystemAdapter';
import { BrowserEditorAdapter } from './BrowserEditorAdapter';
import { BrowserUIAdapter } from './BrowserUIAdapter';
import { BrowserSettingsAdapter } from './BrowserSettingsAdapter';

/**
 * ブラウザ環境用のメインプラットフォームアダプター
 */
export class BrowserPlatformAdapter implements PlatformAdapter {
  public readonly fileSystem: BrowserFileSystemAdapter;
  public readonly editor: BrowserEditorAdapter;
  public readonly ui: BrowserUIAdapter;
  public readonly settings: BrowserSettingsAdapter;

  constructor() {
    this.fileSystem = new BrowserFileSystemAdapter();
    this.editor = new BrowserEditorAdapter();
    this.ui = new BrowserUIAdapter();
    this.settings = new BrowserSettingsAdapter();
  }

  getPlatformType(): 'browser' | 'vscode' {
    return 'browser';
  }

  async initialize(): Promise<void> {
    console.log('ブラウザプラットフォームアダプターを初期化しています...');

    try {
      // 各サブアダプターの初期化
      await Promise.all([
        this.fileSystem.initialize(),
        this.editor.initialize(),
        this.ui.initialize(),
        this.settings.initialize()
      ]);

      // Notification APIの許可をリクエスト（オプション）
      if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      console.log('ブラウザプラットフォームアダプターの初期化が完了しました');
    } catch (error) {
      console.error('ブラウザプラットフォームアダプターの初期化中にエラーが発生しました:', error);
      throw error;
    }
  }

  dispose(): void {
    console.log('ブラウザプラットフォームアダプターを破棄しています...');

    try {
      this.fileSystem.dispose();
      this.editor.dispose();
      this.ui.dispose();
      this.settings.dispose();

      console.log('ブラウザプラットフォームアダプターの破棄が完了しました');
    } catch (error) {
      console.error('ブラウザプラットフォームアダプターの破棄中にエラーが発生しました:', error);
    }
  }
}
