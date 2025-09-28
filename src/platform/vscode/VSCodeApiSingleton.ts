/**
 * VSCode API シングルトン
 * VSCode APIは一度しか取得できないため、アプリケーション全体で共有するシングルトン
 */

import React from 'react';
import { VSCodeMessageValidator } from '../../types/vscode';
import type { VSCodeMessage, VSCodeMessageData } from '../../types/vscode';

export interface VSCodeApi {
  postMessage: (message: unknown) => void;
  setState: (state: unknown) => void;
  getState: () => unknown;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VSCodeApi;
    vscodeApiInstance?: VSCodeApi;
    vscode?: VSCodeApi;
  }
}

class VSCodeApiSingleton {
  private static instance: VSCodeApiSingleton | null = null;
  private vscodeApi: VSCodeApi | null = null;
  private isInitialized = false;
  private messageHandlers = new Map<string, (data: any) => void>();

  private constructor() {
    // メッセージリスナーを設定
    this.setupMessageListener();
  }

  static getInstance(): VSCodeApiSingleton {
    if (!VSCodeApiSingleton.instance) {
      VSCodeApiSingleton.instance = new VSCodeApiSingleton();
    }
    return VSCodeApiSingleton.instance;
  }

  /**
   * VSCode APIを取得（初回のみ実際にacquireVsCodeApiを呼び出し）
   */
  getApi(): VSCodeApi | null {
    if (!this.isInitialized) {
      this.initialize();
    }
    return this.vscodeApi;
  }

  /**
   * VSCode APIが利用可能かどうか
   */
  isAvailable(): boolean {
    return this.getApi() !== null;
  }

  /**
   * 初期化（一度だけ実行される）
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.isInitialized = true;

    try {
      // 最初にHTMLで設定されたAPIインスタンスをチェック
      if (typeof window !== 'undefined' && window.vscodeApiInstance) {
        if (process.env.NODE_ENV !== 'test') {
          console.log('[VSCodeApiSingleton] HTMLで設定済みのVSCode APIを使用');
        }
        this.vscodeApi = window.vscodeApiInstance;
      } else if (typeof window !== 'undefined' && window.acquireVsCodeApi) {
        if (process.env.NODE_ENV !== 'test') {
          console.log('[VSCodeApiSingleton] VSCode API を取得中...');
        }
        this.vscodeApi = window.acquireVsCodeApi();
        if (process.env.NODE_ENV !== 'test') {
          console.log('[VSCodeApiSingleton] VSCode API を正常に取得しました');
        }
      } else {
        if (process.env.NODE_ENV !== 'test') {
          console.log('[VSCodeApiSingleton] VSCode API が利用できません（ブラウザモード）');
        }
      }
    } catch (error) {
      console.error('[VSCodeApiSingleton] VSCode API の取得に失敗:', error);
      this.vscodeApi = null;
    }
  }

  /**
   * メッセージ送信の便利メソッド
   */
  postMessage(message: unknown): boolean {
    try {
      // メッセージをバリデーション
      if (!VSCodeMessageValidator.validateOutgoing(message)) {
        console.error('[VSCodeApiSingleton] Invalid outgoing message rejected:', message);
        return false;
      }

      // メッセージをサニタイズ
      const sanitizedMessage = VSCodeMessageValidator.sanitizeMessage(message as VSCodeMessage);

      const api = this.getApi();
      if (api) {
        api.postMessage(sanitizedMessage);
        console.debug('[VSCodeApiSingleton] Message sent:', sanitizedMessage.command);
        return true;
      }
      console.warn('[VSCodeApiSingleton] メッセージ送信に失敗: VSCode API が利用できません');
      return false;
    } catch (error) {
      console.error('[VSCodeApiSingleton] メッセージ送信中にエラーが発生:', error);
      return false;
    }
  }

  /**
   * 状態保存の便利メソッド
   */
  setState(state: unknown): boolean {
    try {
      const api = this.getApi();
      if (api) {
        api.setState(state);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[VSCodeApiSingleton] 状態保存中にエラーが発生:', error);
      return false;
    }
  }

  /**
   * 状態取得の便利メソッド
   */
  getState(): unknown {
    const api = this.getApi();
    return api ? api.getState() : null;
  }

  /**
   * ドキュメント更新をVSCodeエディタに送信
   */
  updateDocumentContent(content: string): boolean {
    return this.postMessage({
      command: 'updateDocument',
      content
    });
  }

  /**
   * エラーメッセージをVSCodeに送信
   */
  showError(message: string): boolean {
    return this.postMessage({
      command: 'showError',
      message
    });
  }

  /**
   * 情報メッセージをVSCodeに送信
   */
  showInformation(message: string): boolean {
    return this.postMessage({
      command: 'showInfo',
      message
    });
  }

  /**
   * メッセージリスナーを設定
   */
  private setupMessageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        this.handleIncomingMessage(event.data);
      });
    }
  }

  /**
   * 受信メッセージをバリデーションして処理
   */
  private handleIncomingMessage(message: any): void {
    try {
      // メッセージをバリデーション
      if (!VSCodeMessageValidator.validateIncoming(message)) {
        console.error('[VSCodeApiSingleton] Invalid incoming message rejected:', message);
        return;
      }

      // サニタイズ
      const sanitizedMessage = VSCodeMessageValidator.sanitizeMessage(message);

      console.debug('[VSCodeApiSingleton] Message received:', sanitizedMessage.command);

      // 登録されたハンドラーを呼び出し
      const handler = this.messageHandlers.get(sanitizedMessage.command);
      if (handler) {
        handler(sanitizedMessage.data !== undefined ? sanitizedMessage.data : sanitizedMessage);
      }
    } catch (error) {
      console.error('[VSCodeApiSingleton] Error handling incoming message:', error);
    }
  }

  /**
   * メッセージハンドラーを登録
   */
  addMessageHandler(command: string, handler: (data: any) => void): void {
    this.messageHandlers.set(command, handler);
  }

  /**
   * メッセージハンドラーを削除
   */
  removeMessageHandler(command: string): void {
    this.messageHandlers.delete(command);
  }

  /**
   * 全メッセージハンドラーをクリア
   */
  clearMessageHandlers(): void {
    this.messageHandlers.clear();
  }

  /**
   * セキュアなメッセージ送信（型安全性チェック付き）
   */
  postSecureMessage(command: string, data?: VSCodeMessageData): boolean {
    return this.postMessage({
      command,
      data,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * VSCodeメッセージハンドリング用のヘルパーフック
 */
export function useVSCodeMessageHandler(command: string, handler: (data: VSCodeMessageData) => void) {
  const vscodeApi = VSCodeApiSingleton.getInstance();
  
  React.useEffect(() => {
    vscodeApi.addMessageHandler(command, handler);
    return () => vscodeApi.removeMessageHandler(command);
  }, [command, handler, vscodeApi]);
}

// エクスポート
export { VSCodeMessageValidator } from '../../types/vscode';

export default VSCodeApiSingleton;