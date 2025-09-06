/**
 * VSCode通信プロトコルテスト
 * VSCode拡張とWebview間の通信プロトコルの完全性をテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { VSCodeMessage, VSCodeWebViewMessage } from '../../types/vscode';
import type { MockVSCodeApi } from '../shared/types';
import VSCodeApiSingleton from '../../platform/vscode/VSCodeApiSingleton';

// 通信メッセージの型定義は共通型を使用

// プロトコル定義
const VSCODE_TO_WEBVIEW_COMMANDS = [
  'updateContent',
  'configurationChanged', 
  'themeChanged',
  'saveRequest',
  'openFile'
] as const;

const WEBVIEW_TO_VSCODE_COMMANDS = [
  'webviewReady',
  'contentChanged',
  'error',
  'applicationError',
  'initializationError'
] as const;

// モックAPIの型定義は共通型を使用

describe('VSCode Communication Protocol', () => {
  let mockVSCodeApi: MockVSCodeApi;

  beforeEach(() => {
    // VSCode API モックを作成
    mockVSCodeApi = {
      postMessage: vi.fn(),
      setState: vi.fn(),
      getState: vi.fn(() => ({}))
    };

    // window.acquireVsCodeApi をモック
    Object.defineProperty(window, 'acquireVsCodeApi', {
      value: vi.fn(() => mockVSCodeApi),
      writable: true,
      configurable: true
    });

    
    // VSCodeApiSingleton をリセット
    (VSCodeApiSingleton as any).instance = null;
  });

  afterEach(() => {
    delete (window as any).acquireVsCodeApi;
    mockVSCodeApi.postMessage.mockClear();
    mockVSCodeApi.setState.mockClear();
    mockVSCodeApi.getState.mockClear();
  });

  describe('API 初期化', () => {
    it('VSCodeApiSingleton が正常に初期化される', () => {
      const singleton = VSCodeApiSingleton.getInstance();
      
      expect(singleton.isAvailable()).toBe(true);
      expect(singleton.getApi()).toBe(mockVSCodeApi);
    });

    it('VSCode API が利用できない環境では適切に処理される', () => {
      delete (window as any).acquireVsCodeApi;
      
      // 新しいインスタンスを作成
      (VSCodeApiSingleton as any).instance = null;
      const singleton = VSCodeApiSingleton.getInstance();
      
      expect(singleton.isAvailable()).toBe(false);
      expect(singleton.getApi()).toBeNull();
    });

    it('同じインスタンスが返される（シングルトンパターン）', () => {
      const singleton1 = VSCodeApiSingleton.getInstance();
      const singleton2 = VSCodeApiSingleton.getInstance();
      
      expect(singleton1).toBe(singleton2);
    });
  });

  describe('Webview → VSCode メッセージ送信', () => {
    let singleton: VSCodeApiSingleton;

    beforeEach(() => {
      singleton = VSCodeApiSingleton.getInstance();
    });

    it('webviewReady メッセージが送信される', () => {
      const message: VSCodeWebViewMessage = {
        command: 'webviewReady'
      };

      singleton.postMessage(message);

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith(message);
    });

    it('contentChanged メッセージが送信される', () => {
      const message: VSCodeWebViewMessage = {
        command: 'contentChanged',
        content: 'test content',
        timestamp: new Date().toISOString()
      };

      singleton.postMessage(message);

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith(message);
    });

    it('エラーメッセージが送信される', () => {
      const error = new Error('Test error');
      const message: VSCodeWebViewMessage = {
        command: 'error',
        error: {
          message: error.message,
          stack: error.stack
        }
      };

      singleton.postMessage(message);

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith(message);
    });

    it('アプリケーションエラーメッセージが送信される', () => {
      const message: VSCodeWebViewMessage = {
        command: 'applicationError',
        error: {
          message: 'Application crashed',
          stack: 'Error stack trace',
          componentStack: 'Component stack trace'
        }
      };

      singleton.postMessage(message);

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith(message);
    });

    it('VSCode API が利用できない場合はエラーをスローしない', () => {
      // VSCode API を無効化
      (VSCodeApiSingleton as any).instance = null;
      delete (window as any).acquireVsCodeApi;
      
      const singleton = VSCodeApiSingleton.getInstance();
      
      expect(() => {
        singleton.postMessage({ command: 'test' });
      }).not.toThrow();
    });
  });

  describe('VSCode → Webview メッセージ受信', () => {
    it('updateContent メッセージの形式が正しい', () => {
      const message: VSCodeMessage = {
        command: 'updateContent',
        content: JSON.stringify({
          version: '1.0.0',
          title: 'Test',
          description: 'Test',
          root: { id: 'root', title: 'Root', children: [] },
          settings: {
            layout: 'tree',
            direction: 'right',
            theme: 'default',
            showConnections: true,
            enableCollapse: true,
            nodeSize: { width: 200, height: 80 },
            spacing: { horizontal: 50, vertical: 30 }
          }
        })
      };

      expect(message.command).toBe('updateContent');
      expect(typeof message.content).toBe('string');
      expect(() => JSON.parse(message.content)).not.toThrow();
    });

    it('configurationChanged メッセージの形式が正しい', () => {
      const message: VSCodeMessage = {
        command: 'configurationChanged',
        configuration: {
          theme: 'dark',
          fontSize: 14,
          enablePreview: true
        }
      };

      expect(message.command).toBe('configurationChanged');
      expect(typeof message.configuration).toBe('object');
      expect(message.configuration).not.toBeNull();
    });

    it('themeChanged メッセージの形式が正しい', () => {
      const message: VSCodeMessage = {
        command: 'themeChanged',
        theme: 'dark'
      };

      expect(message.command).toBe('themeChanged');
      expect(message.theme).toBeDefined();
    });
  });

  describe('メッセージバリデーション', () => {
    it('無効なコマンドを検出できる', () => {
      const invalidMessage = {
        command: 'invalidCommand',
        data: 'test'
      };

      const isValidWebviewCommand = (cmd: string): cmd is typeof WEBVIEW_TO_VSCODE_COMMANDS[number] => {
        return WEBVIEW_TO_VSCODE_COMMANDS.includes(cmd as any);
      };

      const isValidVSCodeCommand = (cmd: string): cmd is typeof VSCODE_TO_WEBVIEW_COMMANDS[number] => {
        return VSCODE_TO_WEBVIEW_COMMANDS.includes(cmd as any);
      };

      expect(isValidWebviewCommand(invalidMessage.command)).toBe(false);
      expect(isValidVSCodeCommand(invalidMessage.command)).toBe(false);
    });

    it('有効なコマンドを認識できる', () => {
      const validWebviewCommands = [
        'webviewReady',
        'contentChanged',
        'error',
        'applicationError',
        'initializationError'
      ];

      const validVSCodeCommands = [
        'updateContent',
        'configurationChanged',
        'themeChanged',
        'saveRequest',
        'openFile'
      ];

      validWebviewCommands.forEach(cmd => {
        expect(WEBVIEW_TO_VSCODE_COMMANDS.includes(cmd as any)).toBe(true);
      });

      validVSCodeCommands.forEach(cmd => {
        expect(VSCODE_TO_WEBVIEW_COMMANDS.includes(cmd as any)).toBe(true);
      });
    });
  });

  describe('メッセージの直列化・非直列化', () => {
    it('複雑なオブジェクトが正しく直列化される', () => {
      const complexData = {
        version: '1.0.0',
        title: 'Complex Test',
        root: {
          id: 'root',
          title: 'Root',
          metadata: {
            tags: ['important', 'test'],
            priority: 1,
            customData: {
              nested: {
                value: 'deep'
              }
            }
          },
          children: [
            {
              id: 'child1',
              title: 'Child 1',
              children: []
            }
          ]
        },
        settings: {
          layout: 'tree' as const,
          direction: 'right' as const,
          theme: 'default' as const,
          showConnections: true,
          enableCollapse: true,
          nodeSize: { width: 200, height: 80 },
          spacing: { horizontal: 50, vertical: 30 }
        }
      };

      const serialized = JSON.stringify(complexData);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(complexData);
      expect(deserialized.root.metadata.customData.nested.value).toBe('deep');
    });

    it('循環参照がある場合のエラーハンドリング', () => {
      const circularData: any = {
        name: 'test'
      };
      circularData.self = circularData;

      expect(() => {
        JSON.stringify(circularData);
      }).toThrow();
    });

    it('undefined 値が適切に処理される', () => {
      const dataWithUndefined = {
        defined: 'value',
        undefined: undefined,
        null: null
      };

      const serialized = JSON.stringify(dataWithUndefined);
      const deserialized = JSON.parse(serialized);

      // JSON.stringify は undefined を削除する
      expect(deserialized).not.toHaveProperty('undefined');
      expect(deserialized.defined).toBe('value');
      expect(deserialized.null).toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    it('postMessage でエラーが発生した場合の処理', () => {
      mockVSCodeApi.postMessage.mockImplementation(() => {
        throw new Error('Communication error');
      });

      const singleton = VSCodeApiSingleton.getInstance();

      expect(() => {
        singleton.postMessage({ command: 'test' });
      }).not.toThrow(); // エラーハンドリングにより例外は発生しない
    });

    it('不正な形式のメッセージでもクラッシュしない', () => {
      const singleton = VSCodeApiSingleton.getInstance();

      // 不正な形式のメッセージ
      const invalidMessages = [
        null,
        undefined,
        'string',
        123,
        [],
        { /* command プロパティなし */ }
      ];

      invalidMessages.forEach(msg => {
        expect(() => {
          singleton.postMessage(msg as any);
        }).not.toThrow();
      });
    });
  });

  describe('パフォーマンス', () => {
    it('大量のメッセージ送信でもパフォーマンスが維持される', () => {
      const singleton = VSCodeApiSingleton.getInstance();
      const messageCount = 1000;
      
      const startTime = performance.now();

      for (let i = 0; i < messageCount; i++) {
        singleton.postMessage({
          command: 'contentChanged',
          content: `test content ${i}`,
          index: i
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 1000件のメッセージ送信が100ms以内で完了することを確認
      expect(duration).toBeLessThan(100);
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledTimes(messageCount);
    });

    it('大きなメッセージでも適切に処理される', () => {
      const singleton = VSCodeApiSingleton.getInstance();
      
      // 大きなデータを生成（約1MB）
      const largeData = {
        command: 'contentChanged',
        content: 'x'.repeat(1024 * 1024), // 1MB の文字列
        size: 1024 * 1024
      };

      const startTime = performance.now();
      
      expect(() => {
        singleton.postMessage(largeData);
      }).not.toThrow();

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 大きなメッセージでも妥当な時間で処理されることを確認
      expect(duration).toBeLessThan(1000); // 1秒以内
    });
  });
});
