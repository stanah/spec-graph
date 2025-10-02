import type { PlatformAdapter } from './interfaces';
import { VSCodePlatformAdapter } from './vscode';
import { BrowserPlatformAdapter } from './browser';

/**
 * プラットフォームアダプターのファクトリー
 */
export class PlatformAdapterFactory {
  private static instance: PlatformAdapter | null = null;

  /**
   * 現在の環境に適したプラットフォームアダプターを取得
   */
  static getInstance(): PlatformAdapter {
    if (!this.instance) {
      this.instance = this.createAdapter();
    }
    return this.instance;
  }

  /**
   * プラットフォームアダプターを作成
   */
  private static createAdapter(): PlatformAdapter {
    // VSCode拡張環境の検出
    if (this.isVSCodeEnvironment()) {
      if (process.env.NODE_ENV !== 'test') {
        console.log('[PlatformAdapterFactory] VSCode環境を検出、VSCodePlatformAdapterを作成');
      }
      return new VSCodePlatformAdapter();
    }

    // テスト環境では制限モードでVSCodePlatformAdapterを作成
    if (process.env.NODE_ENV === 'test') {
      console.log('[PlatformAdapterFactory] テスト環境: VSCodePlatformAdapter（制限モード）を作成');
      return new VSCodePlatformAdapter();
    }

    // ブラウザ環境の検出
    if (this.isBrowserEnvironment()) {
      console.log('[PlatformAdapterFactory] ブラウザ環境を検出、BrowserPlatformAdapterを作成');
      return new BrowserPlatformAdapter();
    }

    // サポートされていないプラットフォーム
    const platformName: 'browser' | 'vscode' | 'unknown' = 'unknown';
    const context = {
      hasWindow: typeof window !== 'undefined',
      hasAcquireVsCodeApi: typeof window !== 'undefined' && 'acquireVsCodeApi' in window,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      nodeEnv: process.env.NODE_ENV
    };

    throw new PlatformError(
      'サポートされていないプラットフォーム',
      platformName,
      'UNSUPPORTED_PLATFORM',
      context
    );
  }

  /**
   * VSCode拡張環境かどうかを判定
   */
  private static isVSCodeEnvironment(): boolean {
    // VSCode Webview環境の検出ロジック
    // 将来的にVSCode拡張APIが利用可能かどうかで判定
    return (
      typeof window !== 'undefined' &&
      'acquireVsCodeApi' in window
    );
  }

  /**
   * ブラウザ環境かどうかを判定
   */
  private static isBrowserEnvironment(): boolean {
    // ブラウザ環境の検出ロジック
    // windowが存在し、VSCode APIが無い場合はブラウザ環境
    return (
      typeof window !== 'undefined' &&
      !('acquireVsCodeApi' in window)
    );
  }

  /**
   * インスタンスをリセット（テスト用）
   */
  static reset(): void {
    if (this.instance) {
      this.instance.dispose();
      this.instance = null;
    }
  }

  /**
   * 特定のプラットフォームアダプターを強制設定（テスト用）
   */
  static setInstance(adapter: PlatformAdapter): void {
    if (this.instance) {
      this.instance.dispose();
    }
    this.instance = adapter;
  }
}

/**
 * プラットフォームアダプターのシングルトンインスタンスを取得
 */
export function getPlatformAdapter(): PlatformAdapter {
  return PlatformAdapterFactory.getInstance();
}

/**
 * プラットフォーム固有の初期化を実行
 */
export async function initializePlatform(): Promise<PlatformAdapter> {
  const adapter = getPlatformAdapter();
  await adapter.initialize();
  return adapter;
}

/**
 * プラットフォームアダプターを破棄
 */
export function disposePlatform(): void {
  PlatformAdapterFactory.reset();
}

/**
 * 現在のプラットフォーム種別を取得
 */
export function getPlatformType(): 'browser' | 'vscode' {
  return getPlatformAdapter().getPlatformType();
}

/**
 * プラットフォーム固有の機能が利用可能かどうかを確認
 */
export function isPlatformCapabilityAvailable(capability: string): boolean {
  const adapter = getPlatformAdapter();

  // VSCodeアダプター
  if (adapter instanceof VSCodePlatformAdapter) {
    switch (capability) {
      case 'fileSystem':
        return true;
      case 'editor':
        return adapter.editor !== undefined;
      case 'ui':
        return adapter.ui !== undefined;
      case 'settings':
        return adapter.settings !== undefined;
      case 'vscodeApi':
        return adapter.getPlatformType() === 'vscode';
      default:
        return false;
    }
  }

  // ブラウザアダプター
  if (adapter instanceof BrowserPlatformAdapter) {
    switch (capability) {
      case 'fileSystem':
        return true; // LocalStorage/File API
      case 'editor':
        return false; // ブラウザ版では編集機能なし
      case 'ui':
        return true; // ブラウザネイティブUI
      case 'settings':
        return true; // LocalStorage設定
      case 'vscodeApi':
        return false;
      default:
        return false;
    }
  }

  return false;
}

/**
 * プラットフォーム固有のエラーハンドリング
 */
export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly platform: 'browser' | 'vscode' | 'unknown',
    public readonly code?: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PlatformError';
  }
}

/**
 * プラットフォーム固有のエラーを処理
 */
export function handlePlatformError(error: Error): void {
  try {
    const adapter = getPlatformAdapter();
    
    if (error instanceof PlatformError) {
      adapter.ui.showErrorMessage(`プラットフォームエラー: ${error.message}`);
    } else {
      adapter.ui.showErrorMessage(`予期しないエラーが発生しました: ${error.message}`);
    }
  } catch (handlerError) {
    // アダプター取得やUI表示に失敗した場合のフォールバック
    console.error('プラットフォームエラーハンドラーでエラーが発生:', handlerError);
    console.error('元のエラー:', error);
    
    // ブラウザのアラートでフォールバック表示
    if (typeof window !== 'undefined' && window.alert) {
      window.alert(`エラーが発生しました: ${error.message}`);
    }
  }
  
  console.error('プラットフォームエラー:', error);
}