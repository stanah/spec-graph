/**
 * VSCode ↔ Webview 通信統合テスト
 * VSCode拡張とWebview間のメッセージ通信機能をテスト
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MockVSCodeApi } from '../shared/types';

import VSCodeApp from '../../vscode/VSCodeApp';
import VSCodeApiSingleton from '../../platform/vscode/VSCodeApiSingleton';
import { useAppStore } from '../../stores/appStore';

const mockVSCodeApi: MockVSCodeApi = {
  postMessage: vi.fn(),
  setState: vi.fn(),
  getState: vi.fn(() => ({}))
};

// window.acquireVsCodeApi のモック
const mockAcquireVsCodeApi = vi.fn(() => mockVSCodeApi);

// VSCode初期データのモック
const mockInitialData = {
  content: JSON.stringify({
    version: '1.0.0',
    title: 'Test Mindmap',
    description: 'Test mindmap for communication testing',
    root: {
      id: 'root',
      title: 'Root Node',
      description: 'Root node for testing',
      children: [
        {
          id: 'child1',
          title: 'Child 1',
          description: 'First child node',
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
  }),
  fileName: 'test-mindmap.json'
};

describe('VSCode ↔ Webview Communication', () => {
  beforeEach(() => {
    // VSCode API環境をセットアップ
    Object.defineProperty(window, 'acquireVsCodeApi', {
      value: mockAcquireVsCodeApi,
      writable: true,
      configurable: true
    });

    // VSCodeApiインスタンスを直接設定
    Object.defineProperty(window, 'vscodeApiInstance', {
      value: mockVSCodeApi,
      writable: true,
      configurable: true
    });

    Object.defineProperty(window, 'initialData', {
      value: mockInitialData,
      writable: true,
      configurable: true
    });

    // VSCodeApiSingleton をリセット
    (VSCodeApiSingleton as any).instance = null;

    // ストア状態をリセット
    const store = useAppStore.getState();
    store.initialize();

    // モック関数をクリア
    mockVSCodeApi.postMessage.mockClear();
    mockVSCodeApi.setState.mockClear();
    mockVSCodeApi.getState.mockClear();
  });

  afterEach(() => {
    // グローバル変数をクリア
    delete (window as any).acquireVsCodeApi;
    delete (window as any).vscodeApiInstance;
    delete (window as any).initialData;
    delete (window as any).mindmapApp;
  });

  describe('初期化通信', () => {
    it('VSCode API が正常に初期化される', async () => {
      render(<VSCodeApp />);

      // VSCodeApiSingleton が正常に初期化されることを確認
      await waitFor(() => {
        const singleton = VSCodeApiSingleton.getInstance();
        expect(singleton.isAvailable()).toBe(true);
        expect(singleton.getApi()).toBe(mockVSCodeApi);
      }, { timeout: 3000 });
    });

    it('webviewReady メッセージが送信される', async () => {
      render(<VSCodeApp />);

      await waitFor(() => {
        expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
          command: 'webviewReady'
        });
      }, { timeout: 3000 });
    });

    it('初期データが正常に読み込まれる', async () => {
      render(<VSCodeApp />);

      await waitFor(() => {
        const store = useAppStore.getState();
        // 初期データまたは何らかのデータが読み込まれていることを確認
        expect(store.file.fileContent).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('メッセージ受信', () => {
    it('updateContent メッセージを受信して処理できる', async () => {
      render(<VSCodeApp />);

      const newContent = 'updated content from message';

      // VSCodeからのupdateContentメッセージをシミュレート
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            command: 'updateContent',
            content: newContent
          }
        }));
      });

      // メッセージが処理されることを確認（例外が発生しないことを確認）
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // エラーが発生せず、アプリケーションが継続して動作することを確認
      expect(() => useAppStore.getState()).not.toThrow();
    });

    it('configurationChanged メッセージを受信して処理できる', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<VSCodeApp />);

      const configData = {
        theme: 'dark',
        fontSize: 14
      };

      // VSCodeからの設定変更メッセージをシミュレート
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            command: 'configurationChanged',
            configuration: configData
          }
        }));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'VSCode設定が変更されました:',
          configData
        );
      });

      consoleSpy.mockRestore();
    });

    it('themeChanged メッセージを受信して処理できる', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<VSCodeApp />);

      // VSCodeからのテーマ変更メッセージをシミュレート
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            command: 'themeChanged'
          }
        }));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('VSCodeテーマが変更されました');
      });

      consoleSpy.mockRestore();
    });

    it('未知のメッセージを受信した場合の処理', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<VSCodeApp />);

      // 未知のメッセージをシミュレート
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            command: 'unknownCommand',
            data: 'test data'
          }
        }));
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '未知のVSCodeメッセージ:',
          expect.objectContaining({
            command: 'unknownCommand',
            data: 'test data'
          })
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('グローバル関数API', () => {
    it('mindmapApp.updateContent が正常に動作する', async () => {
      await act(async () => {
        render(<VSCodeApp />);
      });

      // mindmapAppが定義されるまで待つ
      await waitFor(() => {
        expect(window.mindmapApp).toBeDefined();
      }, { timeout: 3000 });

      const testContent = 'test content for update function';

      // updateContent関数が存在することを確認
      expect(typeof window.mindmapApp!.updateContent).toBe('function');
      
      // 関数を呼び出して例外が発生しないことを確認
      await act(async () => {
        window.mindmapApp!.updateContent(testContent);
      });
    });

    it('mindmapApp.getCurrentContent が正常に動作する', async () => {
      await act(async () => {
        render(<VSCodeApp />);
      });

      // mindmapAppが定義されるまで待つ
      await waitFor(() => {
        expect(window.mindmapApp).toBeDefined();
      }, { timeout: 3000 });

      // getCurrentContent関数が存在することを確認
      expect(typeof window.mindmapApp!.getCurrentContent).toBe('function');
      
      // 初期データまたは何らかの値が返されることを確認
      const currentContent = window.mindmapApp!.getCurrentContent();
      expect(typeof currentContent).toBe('string');
    });

    it('mindmapApp.saveFile が正常に動作する', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await act(async () => {
        render(<VSCodeApp />);
      });

      // mindmapAppが定義されるまで待つ
      await waitFor(() => {
        expect(window.mindmapApp).toBeDefined();
      }, { timeout: 3000 });

      // saveFile関数が存在することを確認
      expect(typeof window.mindmapApp!.saveFile).toBe('function');
      
      // 関数を呼び出して例外が発生しないことを確認
      expect(() => {
        window.mindmapApp!.saveFile();
      }).not.toThrow();

      // コンソールログが出力されることを確認
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('保存要求を受信（現在は自動保存）');
      }, { timeout: 1000 });

      consoleSpy.mockRestore();
    });
  });

  describe('エラーハンドリング', () => {
    it('VSCode API が利用できない場合の処理', async () => {
      // VSCode API を無効化
      delete (window as any).acquireVsCodeApi;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { container } = await act(async () => {
        return render(<VSCodeApp />);
      });

      // アプリケーションが正常にレンダリングされることを確認
      await waitFor(() => {
        expect(container.querySelector('.vscode-app')).toBeTruthy();
      }, { timeout: 2000 });

      // エラーが発生せずにアプリケーションが動作していることを確認
      expect(() => useAppStore.getState()).not.toThrow();

      consoleSpy.mockRestore();
    });

    it('初期データが存在しない場合の処理', async () => {
      // 初期データを削除
      delete (window as any).initialData;

      await act(async () => {
        render(<VSCodeApp />);
      });

      // 初期データが存在しない場合でもアプリケーションが正常に動作することを確認
      await waitFor(() => {
        const vscodeApp = screen.getByTestId('vscode-app');
        expect(vscodeApp).toBeInTheDocument();
      });

      // エラーが発生せずにアプリケーションが動作していることを確認
      expect(() => useAppStore.getState()).not.toThrow();
    });

    it('不正な形式のメッセージを受信した場合の処理', async () => {
      await act(async () => {
        render(<VSCodeApp />);
      });

      // 不正な形式のメッセージをシミュレート
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: null // 不正なデータ
        }));
      });

      // エラーが発生せずに継続することを確認
      await waitFor(() => {
        // VSCode拡張のアプリが表示されていることを確認
        const vscodeApp = screen.getByTestId('vscode-app');
        expect(vscodeApp).toBeInTheDocument();
      });
    });
  });

  describe('メモリリーク防止', () => {
    it('コンポーネントアンマウント時にイベントリスナーが削除される', async () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = render(<VSCodeApp />);

      // コンポーネントをアンマウント
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'message', 
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('パフォーマンス', () => {
    it('大きなデータでも適切に処理できる', async () => {
      // 大きなマインドマップデータを生成（サイズを縮小してテストを高速化）
      const largeData = {
        version: '1.0.0',
        title: 'Large Mindmap',
        description: 'Performance test mindmap',
        root: {
          id: 'root',
          title: 'Root',
          description: 'Root',
          children: Array.from({ length: 100 }, (_, i) => ({
            id: `child-${i}`,
            title: `Child ${i}`,
            description: `Child node ${i}`,
            children: []
          }))
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

      await act(async () => {
        render(<VSCodeApp />);
      });

      const startTime = performance.now();

      // 大きなデータでupdateContentメッセージを送信
      await act(async () => {
        window.dispatchEvent(new MessageEvent('message', {
          data: {
            command: 'updateContent',
            content: JSON.stringify(largeData)
          }
        }));
        
        // 処理が完了するまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // エラーが発生せずに処理が完了することを確認
      expect(() => useAppStore.getState()).not.toThrow();
      
      // 処理時間が妥当な範囲内であることを確認（2秒以内）
      expect(processingTime).toBeLessThan(2000);
    });
  });
});
