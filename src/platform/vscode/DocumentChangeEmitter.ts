import { VSCodePlatformAdapter } from './VSCodePlatformAdapter';
import type { VSCodeApi } from './VSCodeApiSingleton';
import type { FileUri } from '../../core/ViewSwitcher';

/**
 * イベントリスナーの定義
 */
export type DocumentChangeListener = (uri: FileUri) => void;

/**
 * VSCodeのEventEmitterと統合するドキュメント変更イベントエミッター
 * VSCode環境では vscode.EventEmitter<vscode.Uri> と連携し、
 * ブラウザ環境では独自のイベント管理機能を提供
 */
export class DocumentChangeEmitter {
  private vscode: VSCodeApi | null;
  private listeners: Set<DocumentChangeListener> = new Set();
  private disposed = false;
  private emitterId: string;

  constructor() {
    this.vscode = VSCodePlatformAdapter.getVSCodeApi();
    this.emitterId = `docChangeEmitter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.initializeVSCodeIntegration();
  }

  /**
   * VSCode環境でのEventEmitter統合を初期化
   */
  private initializeVSCodeIntegration(): void {
    if (this.vscode) {
      // VSCode拡張にEventEmitterの作成を要求
      this.vscode.postMessage({
        command: 'createDocumentChangeEmitter',
        emitterId: this.emitterId
      });

      console.log(`DocumentChangeEmitter initialized with ID: ${this.emitterId}`);
    } else {
      console.log('DocumentChangeEmitter initialized for browser environment');
    }
  }

  /**
   * ドキュメント変更イベントを発火
   * @param uri 変更されたファイルのURI
   */
  public fire(uri: FileUri): void {
    if (this.disposed) {
      console.warn('DocumentChangeEmitter is disposed. Cannot fire event.');
      return;
    }

    // VSCode環境での処理
    try {
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'fireDocumentChange',
          emitterId: this.emitterId,
          uri: uri.fsPath
        });
      }
    } catch (error) {
      console.error('Failed to fire document change event:', error);
    }

    // ローカルリスナーに通知（VSCodeエラーに関係なく実行）
    this.listeners.forEach(listener => {
      try {
        listener(uri);
      } catch (error) {
        console.error('DocumentChangeListener execution failed:', error);
      }
    });

    console.log(`Document change fired for: ${uri.fsPath}`);
  }

  /**
   * 変更イベントリスナーを追加
   * @param listener イベントリスナー関数
   * @returns リスナーを削除するための関数
   */
  public onDidChange(listener: DocumentChangeListener): { dispose(): void } {
    if (this.disposed) {
      console.warn('DocumentChangeEmitter is disposed. Cannot add listener.');
      return { dispose: () => {} };
    }

    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      }
    };
  }

  /**
   * 複数の変更を一括で通知
   * @param uris 変更されたファイルのURI配列
   */
  public fireMultiple(uris: FileUri[]): void {
    if (this.disposed) {
      console.warn('DocumentChangeEmitter is disposed. Cannot fire events.');
      return;
    }

    uris.forEach(uri => this.fire(uri));
  }

  /**
   * イベントエミッターの状態を取得
   */
  public getState(): {
    emitterId: string;
    listenerCount: number;
    disposed: boolean;
    hasVSCodeIntegration: boolean;
  } {
    return {
      emitterId: this.emitterId,
      listenerCount: this.listeners.size,
      disposed: this.disposed,
      hasVSCodeIntegration: this.vscode !== null
    };
  }

  /**
   * エミッターが使用可能かどうかを確認
   */
  public isAvailable(): boolean {
    return !this.disposed;
  }

  /**
   * デバウンス機能付きでイベントを発火
   * @param uri 変更されたファイルのURI
   * @param delay 遅延時間（ミリ秒）
   */
  public fireDebounced(uri: FileUri, delay: number = 300): void {
    if (this.disposed) {
      console.warn('DocumentChangeEmitter is disposed. Cannot fire debounced event.');
      return;
    }

    // 既存のタイマーをクリア
    const timerId = `debounce_${uri.fsPath}`;
    if ((this as any)[timerId]) {
      clearTimeout((this as any)[timerId]);
    }

    // 新しいタイマーを設定
    (this as any)[timerId] = setTimeout(() => {
      this.fire(uri);
      delete (this as any)[timerId];
    }, delay);
  }

  /**
   * 条件付きでイベントを発火
   * @param uri 変更されたファイルのURI
   * @param condition 発火条件を判定する関数
   */
  public fireConditional(uri: FileUri, condition: (uri: FileUri) => boolean): void {
    if (this.disposed) {
      console.warn('DocumentChangeEmitter is disposed. Cannot fire conditional event.');
      return;
    }

    try {
      if (condition(uri)) {
        this.fire(uri);
      }
    } catch (error) {
      console.error('Condition evaluation failed for document change event:', error);
    }
  }

  /**
   * すべてのリスナーを削除
   */
  public clearListeners(): void {
    this.listeners.clear();
    console.log('All document change listeners cleared');
  }

  /**
   * 現在のリスナー数を取得
   */
  public getListenerCount(): number {
    return this.listeners.size;
  }

  /**
   * エミッターIDを取得
   */
  public getEmitterId(): string {
    return this.emitterId;
  }

  /**
   * エミッターのクローンを作成
   * 元のエミッターとは独立したイベント管理を提供
   */
  public clone(): DocumentChangeEmitter {
    const clone = new DocumentChangeEmitter();

    // 現在のリスナーをクローンにコピー
    this.listeners.forEach(listener => {
      clone.onDidChange(listener);
    });

    return clone;
  }

  /**
   * エミッター統計情報を取得
   */
  public getStatistics(): {
    totalEventsFired: number;
    lastEventTime: Date | null;
    averageEventsPerMinute: number;
  } {
    // 実装は統計情報を追跡する必要がある場合に拡張
    return {
      totalEventsFired: 0, // 実際の実装では追跡する
      lastEventTime: null,
      averageEventsPerMinute: 0
    };
  }

  /**
   * リソースを解放し、イベントエミッターを破棄
   */
  public dispose(): void {
    if (this.disposed) {
      return;
    }

    try {
      // すべてのタイマーをクリア
      Object.keys(this).forEach(key => {
        if (key.startsWith('debounce_') && typeof (this as any)[key] === 'number') {
          clearTimeout((this as any)[key]);
          delete (this as any)[key];
        }
      });

      // VSCode統合の破棄
      if (this.vscode) {
        this.vscode.postMessage({
          command: 'disposeDocumentChangeEmitter',
          emitterId: this.emitterId
        });
      }

      // リスナーをクリア
      this.clearListeners();

      this.disposed = true;
      console.log(`DocumentChangeEmitter disposed: ${this.emitterId}`);
    } catch (error) {
      console.error('Error during DocumentChangeEmitter disposal:', error);
    }
  }
}

/**
 * グローバルなドキュメント変更エミッターのファクトリ
 */
export class DocumentChangeEmitterFactory {
  private static instances = new Map<string, DocumentChangeEmitter>();

  /**
   * 名前付きエミッターを取得または作成
   * @param name エミッター名
   * @returns ドキュメント変更エミッター
   */
  public static getOrCreate(name: string): DocumentChangeEmitter {
    if (!this.instances.has(name)) {
      this.instances.set(name, new DocumentChangeEmitter());
    }

    return this.instances.get(name)!;
  }

  /**
   * 名前付きエミッターを削除
   * @param name エミッター名
   */
  public static dispose(name: string): void {
    const emitter = this.instances.get(name);
    if (emitter) {
      emitter.dispose();
      this.instances.delete(name);
    }
  }

  /**
   * すべてのエミッターを破棄
   */
  public static disposeAll(): void {
    this.instances.forEach((emitter, name) => {
      emitter.dispose();
    });
    this.instances.clear();
  }

  /**
   * 登録されているエミッター名の一覧を取得
   */
  public static getInstanceNames(): string[] {
    return Array.from(this.instances.keys());
  }

  /**
   * ファクトリの統計情報を取得
   */
  public static getStatistics(): {
    totalInstances: number;
    activeInstances: number;
    instanceNames: string[];
  } {
    const activeInstances = Array.from(this.instances.values())
      .filter(emitter => emitter.isAvailable()).length;

    return {
      totalInstances: this.instances.size,
      activeInstances,
      instanceNames: this.getInstanceNames()
    };
  }
}