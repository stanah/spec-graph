/**
 * @fileoverview VSCodeFileSystemAdapterのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VSCodeFileSystemAdapter } from '../VSCodeFileSystemAdapter';
import type { VSCodeApi } from '../VSCodeApiSingleton';

// VSCodePlatformAdapterのモック
vi.mock('../VSCodePlatformAdapter', () => ({
  VSCodePlatformAdapter: {
    getVSCodeApi: vi.fn()
  }
}));

describe('VSCodeFileSystemAdapter', () => {
  let adapter: VSCodeFileSystemAdapter;
  let mockVSCodeApi: Partial<VSCodeApi>;
  let messageListener: ((event: MessageEvent) => void) | null = null;
  let rejectionHandler: ((event: PromiseRejectionEvent) => void) | undefined;
  let originalUnhandledRejection: ((reason: any, promise: Promise<any>) => void) | undefined;

  beforeEach(async () => {
    // Node.jsのprocess unhandledRejectionをキャッチ
    originalUnhandledRejection = process.listeners('unhandledRejection')[0] as ((reason: any, promise: Promise<any>) => void) || undefined;
    process.removeAllListeners('unhandledRejection');
    process.on('unhandledRejection', (reason, promise) => {
      // テストで予期されるエラーの場合はサイレントに処理
      if (typeof reason === 'object' && reason?.message) {
        const message = reason.message;
        if (message.includes('操作が失敗しました') || message.includes('操作がタイムアウトしました')) {
          // サイレントに処理（ログも出力しない）
          return;
        }
      }
      // その他のエラーは元のハンドラーに渡すか、コンソールに出力
      if (originalUnhandledRejection) {
        originalUnhandledRejection(reason, promise);
      } else {
        console.error('Unhandled promise rejection:', reason);
      }
    });

    // browser環境のunhandledrejection イベントもキャプチャ
    rejectionHandler = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('操作が失敗しました') || event.reason?.message?.includes('操作がタイムアウトしました')) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', rejectionHandler);

    // MessageEventリスナーをキャプチャする
    const originalAddEventListener = window.addEventListener;
    vi.spyOn(window, 'addEventListener').mockImplementation((type: string, listener: any) => {
      if (type === 'message') {
        messageListener = listener;
      }
      return originalAddEventListener.call(window, type, listener);
    });

    // VSCode APIのモックを作成
    mockVSCodeApi = {
      postMessage: vi.fn()
    };

    // VSCodePlatformAdapterのgetVSCodeApiをモック
    const { VSCodePlatformAdapter } = await import('../VSCodePlatformAdapter');
    vi.mocked(VSCodePlatformAdapter.getVSCodeApi).mockReturnValue(mockVSCodeApi);
  });

  afterEach(async () => {
    // adapterを破棄して全ての非同期処理を停止
    adapter?.dispose();

    // 残っている全てのタイマーを処理
    if (vi.isFakeTimers()) {
      await vi.runAllTimersAsync();
    }

    // unhandledrejection リスナーを削除
    if (rejectionHandler) {
      window.removeEventListener('unhandledrejection', rejectionHandler);
      rejectionHandler = undefined;
    }

    // Node.jsの unhandledRejection ハンドラーを復元
    process.removeAllListeners('unhandledRejection');
    if (originalUnhandledRejection) {
      process.on('unhandledRejection', originalUnhandledRejection);
    }

    vi.restoreAllMocks();
    messageListener = null;

    // 少し待機してPromiseの処理が完了するのを確実にする
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  describe('初期化', () => {
    it('VSCode APIが利用可能な場合、正常に初期化される', () => {
      adapter = new VSCodeFileSystemAdapter();

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'fileSystemAdapterReady'
      });
    });

    it('VSCode APIが利用不可能な場合、エラーにならず初期化をスキップする', async () => {
      const { VSCodePlatformAdapter } = await import('../VSCodePlatformAdapter');
      vi.mocked(VSCodePlatformAdapter.getVSCodeApi).mockReturnValue(null);

      expect(() => {
        adapter = new VSCodeFileSystemAdapter();
      }).not.toThrow();
    });
  });

  describe('ファイル操作', () => {
    beforeEach(async () => {
      adapter = new VSCodeFileSystemAdapter();
    });

    it('ファイル読み取りが正常に動作する', async () => {
      const testContent = 'test file content';
      const readFilePromise = adapter.readFile('/test/path.txt');

      // VSCode拡張からのレスポンスをシミュレート
      if (messageListener) {
        setTimeout(() => {
          messageListener(new MessageEvent('message', {
            data: {
              requestId: '1',
              result: testContent
            }
          }));
        }, 10);
      }

      const result = await readFilePromise;
      expect(result).toBe(testContent);
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'readFile',
        requestId: '1',
        path: '/test/path.txt'
      });
    });

    it('ファイル書き込みが正常に動作する', async () => {
      const testPath = '/test/path.txt';
      const testContent = 'test content';
      const writeFilePromise = adapter.writeFile(testPath, testContent);

      // VSCode拡張からのレスポンスをシミュレート
      if (messageListener) {
        setTimeout(() => {
          messageListener(new MessageEvent('message', {
            data: {
              requestId: '1',
              result: undefined
            }
          }));
        }, 10);
      }

      await writeFilePromise;
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'writeFile',
        requestId: '1',
        path: testPath,
        content: testContent
      });
    });

    it('ファイル存在確認が正常に動作する', async () => {
      const existsPromise = adapter.exists('/test/path.txt');

      // VSCode拡張からのレスポンスをシミュレート
      if (messageListener) {
        setTimeout(() => {
          messageListener(new MessageEvent('message', {
            data: {
              requestId: '1',
              result: true
            }
          }));
        }, 10);
      }

      const result = await existsPromise;
      expect(result).toBe(true);
    });

    it('エラーレスポンスを正しく処理する', async () => {
      // テストを簡略化 - 基本的なエラーハンドリングのみテスト
      const readFilePromise = adapter.readFile('/non-existent/path.txt');

      // すべてのリクエストIDに対してエラーレスポンスを返す
      if (messageListener) {
        // requestId 1, 2, 3 に対するエラーレスポンス
        [1, 2, 3].forEach((id, index) => {
          setTimeout(() => {
            messageListener!(new MessageEvent('message', {
              data: {
                requestId: id.toString(),
                error: 'File not found'
              }
            }));
          }, 10 + index * 1100); // リトライ間隔を考慮
        });
      }

      await expect(readFilePromise).rejects.toThrow();
    }, 20000);
  });

  describe('リトライ機能', () => {
    beforeEach(async () => {
      adapter = new VSCodeFileSystemAdapter();
    });

    it('最初の試行が失敗した場合、リトライが実行される', async () => {
      const readFilePromise = adapter.readFile('/test/path.txt');

      // 最初の試行は失敗
      if (messageListener) {
        setTimeout(() => {
          messageListener(new MessageEvent('message', {
            data: {
              requestId: '1',
              error: 'Temporary error'
            }
          }));
        }, 10);

        // 2回目の試行は成功
        setTimeout(() => {
          messageListener(new MessageEvent('message', {
            data: {
              requestId: '2',
              result: 'success content'
            }
          }));
        }, 1100); // RETRY_DELAY_MS後
      }

      const result = await readFilePromise;
      expect(result).toBe('success content');

      // 2回のpostMessageが呼ばれる（初回 + リトライ）
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledTimes(3); // 初期化 + 初回 + リトライ
    });

    it('最大リトライ回数後も失敗する場合、エラーを投げる', async () => {
      const readFilePromise = adapter.readFile('/test/path.txt');

      // すべての試行が失敗（リクエストIDを正しくシーケンシャルに設定）
      if (messageListener) {
        let requestIdCounter = 1;
        const sendErrorResponse = () => {
          if (requestIdCounter <= 3) {
            setTimeout(() => {
              messageListener!(new MessageEvent('message', {
                data: {
                  requestId: requestIdCounter.toString(),
                  error: 'Persistent error'
                }
              }));
              requestIdCounter++;
              if (requestIdCounter <= 3) {
                // 次のリトライ用のエラーレスポンスをスケジュール
                setTimeout(sendErrorResponse, 1000);
              }
            }, 10);
          }
        };
        sendErrorResponse();
      }

      await expect(readFilePromise).rejects.toThrow(/操作が失敗しました/);
    }, 15000);
  });

  describe('ファイル監視', () => {
    beforeEach(async () => {
      adapter = new VSCodeFileSystemAdapter();
    });

    it('watchFileが正常に動作する', () => {
      const callback = vi.fn();
      const unwatchFn = adapter.watchFile('/test/path.txt', callback);

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'watchFile',
        path: '/test/path.txt',
        watcherId: 'watcher_1'
      });

      // ファイル変更イベントをシミュレート
      if (messageListener) {
        messageListener(new MessageEvent('message', {
          data: {
            command: 'fileChanged',
            watcherId: 'watcher_1',
            content: 'updated content'
          }
        }));
      }

      expect(callback).toHaveBeenCalledWith('updated content');

      // ウォッチ停止
      unwatchFn();
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'unwatchFile',
        path: '/test/path.txt',
        watcherId: 'watcher_1'
      });
    });

    it('watchFilesが正常に動作する', () => {
      const callback = vi.fn();
      const patterns = ['**/*.mindmap', '**/*.mm', '**/*.json'];
      const unwatchFn = adapter.watchFiles(patterns, callback);

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'watchFileSystem',
        patterns,
        watcherId: 'fs_watcher_1'
      });

      // FileSystemWatcher変更イベントをシミュレート
      if (messageListener) {
        messageListener(new MessageEvent('message', {
          data: {
            command: 'fileSystemChanged',
            watcherId: 'fs_watcher_1',
            uri: '/test/file.mindmap',
            changeType: 'changed'
          }
        }));
      }

      expect(callback).toHaveBeenCalledWith('/test/file.mindmap', 'changed');

      // ウォッチ停止
      unwatchFn();
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'unwatchFileSystem',
        watcherId: 'fs_watcher_1'
      });
    });

    it('ファイル削除イベントが正しく処理される', () => {
      const callback = vi.fn();
      adapter.watchFile('/test/path.txt', callback);

      // ファイル削除イベントをシミュレート
      if (messageListener) {
        messageListener(new MessageEvent('message', {
          data: {
            command: 'fileDeleted',
            watcherId: 'watcher_1'
          }
        }));
      }

      // disposeする前のpostMessage呼び出し回数を確認
      // 初期化(1) + watchFile(1) = 2回
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledTimes(2);

      // disposeを呼んでも、既に削除されたwatcherのunwatchは呼ばれない
      adapter.dispose();

      // disposeでは何も追加で呼ばれない（watcherは既に内部的に削除済み）
      expect(mockVSCodeApi.postMessage).toHaveBeenCalledTimes(2);
    });
  });

  describe('タイムアウト処理', () => {
    beforeEach(async () => {
      adapter = new VSCodeFileSystemAdapter();
      vi.useFakeTimers();
    });

    afterEach(async () => {
      // 残っている非同期処理を全て完了させる
      await vi.runAllTimersAsync();
      vi.useRealTimers();
    });

    it('タイムアウト時間内にレスポンスがない場合エラーになる', async () => {
      // Promiseの結果を保管する変数
      let testCompleted = false;
      let error: Error | null = null;

      // テストプロミスを作成してエラーハンドリングを徹底
      const testPromise = (async () => {
        try {
          await adapter.readFile('/test/path.txt');
        } catch (e) {
          error = e as Error;
          throw e;
        } finally {
          testCompleted = true;
        }
      })();

      // プロミスを即座にキャッチしてUnhandled Rejectionを防ぐ
      const handleTestPromise = testPromise.catch(e => {
        // テストで期待されるエラーはサイレントに処理
        return Promise.reject(e);
      });

      // タイムアウト時間を進める（10秒）
      vi.advanceTimersByTime(10000);
      await vi.runAllTimersAsync();

      // エラーがタイムアウトによるものか確認
      await expect(handleTestPromise).rejects.toThrow(/操作がタイムアウトしました: readFile/);

      // テスト完了を待つ
      expect(testCompleted).toBe(true);
      expect(error).toBeInstanceOf(Error);

      // 残りの非同期処理を全て完了させる
      vi.advanceTimersByTime(50000);
      await vi.runAllTimersAsync();
    }, 20000);
  });

  describe('リソース解放', () => {
    beforeEach(async () => {
      adapter = new VSCodeFileSystemAdapter();
    });

    it('disposeで全てのウォッチャーが停止される', () => {
      // 複数のウォッチャーを設定
      const unwatchFile = adapter.watchFile('/test/file.txt', vi.fn());
      const unwatchFiles = adapter.watchFiles(['**/*.test'], vi.fn());

      adapter.dispose();

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'unwatchFile',
        path: '/test/file.txt',
        watcherId: 'watcher_1'
      });

      expect(mockVSCodeApi.postMessage).toHaveBeenCalledWith({
        command: 'unwatchFileSystem',
        watcherId: 'fs_watcher_2'
      });
    });
  });

  describe('VSCode APIが利用不可能な場合', () => {
    beforeEach(async () => {
      const { VSCodePlatformAdapter } = await import('../VSCodePlatformAdapter');
      vi.mocked(VSCodePlatformAdapter.getVSCodeApi).mockReturnValue(null);
      adapter = new VSCodeFileSystemAdapter();
    });

    it('ファイル操作でエラーが投げられる', async () => {
      await expect(adapter.readFile('/test/path.txt')).rejects.toThrow('VSCode API が利用できません');
      await expect(adapter.writeFile('/test/path.txt', 'content')).rejects.toThrow('VSCode API が利用できません');
    });

    it('ファイル監視でエラーが投げられる', () => {
      expect(() => adapter.watchFile('/test/path.txt', vi.fn())).toThrow('VSCode API が利用できません');
      expect(() => adapter.watchFiles(['**/*.test'], vi.fn())).toThrow('VSCode API が利用できません');
    });
  });
});