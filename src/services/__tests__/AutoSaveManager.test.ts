/**
 * @fileoverview AutoSaveManagerのテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AutoSaveManager } from '../AutoSaveManager';
import type { FileSystemAdapter } from '../../platform/interfaces';

describe('AutoSaveManager', () => {
  let mockFileSystemAdapter: FileSystemAdapter;
  let autoSaveManager: AutoSaveManager;

  beforeEach(() => {
    // FileSystemAdapterのモック作成
    mockFileSystemAdapter = {
      readFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(),
      showOpenDialog: vi.fn(),
      showSaveDialog: vi.fn(),
      watchFile: vi.fn(),
      watchFiles: vi.fn(),
    };

    // AutoSaveManagerインスタンス作成
    autoSaveManager = new AutoSaveManager(mockFileSystemAdapter, {
      debounceDelay: 100, // テストでは短い時間に設定
      maxRetries: 2,
      retryDelay: 50,
      enabled: true,
    });

    // タイマーをフェイクタイマーに設定
    vi.useFakeTimers();
  });

  afterEach(async () => {
    // リソースのクリーンアップ
    autoSaveManager.dispose();

    // すべてのタイマーを実行してから元に戻す
    if (vi.isFakeTimers()) {
      await vi.runAllTimersAsync();
    }
    vi.useRealTimers();

    vi.restoreAllMocks();
  });

  describe('基本的な自動保存機能', () => {
    it('scheduleAutoSaveが正常に動作する', async () => {
      const testPath = '/test/file.txt';
      const testContent = 'test content';

      // 自動保存をスケジュール
      autoSaveManager.scheduleAutoSave(testPath, testContent);

      // 保留中のファイルが1個あることを確認
      expect(autoSaveManager.getPendingCount()).toBe(1);
      expect(autoSaveManager.getPendingPaths()).toContain(testPath);

      // デバウンス時間経過後にファイルが保存されることを確認
      await vi.advanceTimersByTimeAsync(100);

      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalledWith(testPath, testContent);
      expect(autoSaveManager.getPendingCount()).toBe(0);
    });

    it('連続変更時にデバウンスが正しく動作する', async () => {
      const testPath = '/test/file.txt';
      const content1 = 'content 1';
      const content2 = 'content 2';
      const content3 = 'content 3';

      // 連続で変更をスケジュール
      autoSaveManager.scheduleAutoSave(testPath, content1);
      await vi.advanceTimersByTimeAsync(50); // デバウンス時間の半分

      autoSaveManager.scheduleAutoSave(testPath, content2);
      await vi.advanceTimersByTimeAsync(50); // デバウンス時間の半分

      autoSaveManager.scheduleAutoSave(testPath, content3);

      // まだ保存されていないことを確認
      expect(mockFileSystemAdapter.writeFile).not.toHaveBeenCalled();
      expect(autoSaveManager.getPendingCount()).toBe(1);

      // デバウンス時間経過後に最後のコンテンツで保存されることを確認
      await vi.advanceTimersByTimeAsync(100);

      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalledTimes(1);
      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalledWith(testPath, content3);
      expect(autoSaveManager.getPendingCount()).toBe(0);
    });

    it('複数ファイルの同時保存が正常に動作する', async () => {
      const file1 = { path: '/test/file1.txt', content: 'content 1' };
      const file2 = { path: '/test/file2.txt', content: 'content 2' };
      const file3 = { path: '/test/file3.txt', content: 'content 3' };

      // 複数ファイルをスケジュール
      autoSaveManager.scheduleAutoSave(file1.path, file1.content);
      autoSaveManager.scheduleAutoSave(file2.path, file2.content);
      autoSaveManager.scheduleAutoSave(file3.path, file3.content);

      expect(autoSaveManager.getPendingCount()).toBe(3);

      // 手動で一括保存を実行
      const results = await autoSaveManager.executePendingSaves();

      // すべてのファイルが保存されることを確認
      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalledTimes(3);
      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalledWith(file1.path, file1.content);
      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalledWith(file2.path, file2.content);
      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalledWith(file3.path, file3.content);

      // 結果が正しいことを確認
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.retries).toBe(0);
      });

      expect(autoSaveManager.getPendingCount()).toBe(0);
    });
  });

  describe('エラーハンドリングとリトライ機能', () => {
    it('保存失敗時にリトライが実行される', async () => {
      const testPath = '/test/file.txt';
      const testContent = 'test content';

      // 最初の2回は失敗、3回目は成功するモック
      mockFileSystemAdapter.writeFile = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      // 自動保存をスケジュール
      autoSaveManager.scheduleAutoSave(testPath, testContent);

      // デバウンス時間経過
      await vi.advanceTimersByTimeAsync(100);

      // リトライ処理のため少し待機
      await vi.advanceTimersByTimeAsync(200);

      // 3回呼ばれることを確認（初回 + 2回リトライ）
      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalledTimes(3);
      expect(autoSaveManager.getPendingCount()).toBe(0);
    });

    it('最大リトライ回数後も失敗する場合、エラーが記録される', async () => {
      const testPath = '/test/file.txt';
      const testContent = 'test content';

      // 常に失敗するモック
      mockFileSystemAdapter.writeFile = vi.fn()
        .mockRejectedValue(new Error('Persistent error'));

      // 自動保存をスケジュール
      autoSaveManager.scheduleAutoSave(testPath, testContent);

      // デバウンス時間経過
      await vi.advanceTimersByTimeAsync(100);

      // リトライ処理のため十分に待機
      await vi.advanceTimersByTimeAsync(500);

      // maxRetries + 1 回呼ばれることを確認（初回 + 2回リトライ）
      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalledTimes(3);
      expect(autoSaveManager.getPendingCount()).toBe(0); // 失敗後はクリーンアップされる
    });

    it('executePendingSavesでエラー情報を含む結果が返される', async () => {
      const file1 = { path: '/test/success.txt', content: 'success content' };
      const file2 = { path: '/test/error.txt', content: 'error content' };

      // file1は成功、file2は失敗するモック（リトライも含む）
      let errorCallCount = 0;
      mockFileSystemAdapter.writeFile = vi.fn()
        .mockImplementation((path: string) => {
          if (path.includes('success')) {
            return Promise.resolve();
          } else {
            errorCallCount++;
            return Promise.reject(new Error('Write error'));
          }
        });

      // 複数ファイルをスケジュール
      autoSaveManager.scheduleAutoSave(file1.path, file1.content);
      autoSaveManager.scheduleAutoSave(file2.path, file2.content);

      // 手動で一括保存を実行（非同期で開始）
      const resultPromise = autoSaveManager.executePendingSaves();

      // タイマーを進めてリトライを実行
      await vi.advanceTimersByTimeAsync(200); // retryDelay * 3 を超える時間

      const results = await resultPromise;

      expect(results).toHaveLength(2);

      // 成功したファイルの結果
      const successResult = results.find(r => r.path === file1.path);
      expect(successResult?.success).toBe(true);
      expect(successResult?.retries).toBe(0);

      // 失敗したファイルの結果
      const errorResult = results.find(r => r.path === file2.path);
      expect(errorResult?.success).toBe(false);
      expect(errorResult?.error).toContain('Write error');
      expect(errorResult?.retries).toBe(2); // maxRetries

      // エラーファイルが maxRetries + 1 回呼ばれることを確認
      expect(errorCallCount).toBe(3); // 初回 + 2回リトライ
    });
  });

  describe('設定管理', () => {
    it('自動保存の有効/無効を切り替えできる', async () => {
      const testPath = '/test/file.txt';
      const testContent = 'test content';

      // 自動保存を無効化
      autoSaveManager.setEnabled(false);

      // 自動保存をスケジュール（無効なので実行されない）
      autoSaveManager.scheduleAutoSave(testPath, testContent);

      expect(autoSaveManager.getPendingCount()).toBe(0);

      // デバウンス時間経過
      await vi.advanceTimersByTimeAsync(100);

      expect(mockFileSystemAdapter.writeFile).not.toHaveBeenCalled();

      // 再度有効化
      autoSaveManager.setEnabled(true);

      // 自動保存をスケジュール
      autoSaveManager.scheduleAutoSave(testPath, testContent);

      expect(autoSaveManager.getPendingCount()).toBe(1);

      // デバウンス時間経過
      await vi.advanceTimersByTimeAsync(100);

      expect(mockFileSystemAdapter.writeFile).toHaveBeenCalledWith(testPath, testContent);
    });

    it('設定を動的に更新できる', () => {
      const newOptions = {
        debounceDelay: 500,
        maxRetries: 5,
        retryDelay: 200,
        enabled: false,
      };

      autoSaveManager.updateOptions(newOptions);

      const currentOptions = autoSaveManager.getOptions();
      expect(currentOptions.debounceDelay).toBe(500);
      expect(currentOptions.maxRetries).toBe(5);
      expect(currentOptions.retryDelay).toBe(200);
      expect(currentOptions.enabled).toBe(false);
    });
  });

  describe('キャンセル機能', () => {
    it('特定ファイルの保存をキャンセルできる', async () => {
      const testPath = '/test/file.txt';
      const testContent = 'test content';

      // 自動保存をスケジュール
      autoSaveManager.scheduleAutoSave(testPath, testContent);

      expect(autoSaveManager.getPendingCount()).toBe(1);

      // 保存をキャンセル
      autoSaveManager.cancelSave(testPath);

      expect(autoSaveManager.getPendingCount()).toBe(0);

      // デバウンス時間経過
      await vi.advanceTimersByTimeAsync(100);

      expect(mockFileSystemAdapter.writeFile).not.toHaveBeenCalled();
    });

    it('全ての保存をキャンセルできる', async () => {
      // 複数ファイルをスケジュール
      autoSaveManager.scheduleAutoSave('/test/file1.txt', 'content 1');
      autoSaveManager.scheduleAutoSave('/test/file2.txt', 'content 2');
      autoSaveManager.scheduleAutoSave('/test/file3.txt', 'content 3');

      expect(autoSaveManager.getPendingCount()).toBe(3);

      // 全てキャンセル
      autoSaveManager.cancelAllSaves();

      expect(autoSaveManager.getPendingCount()).toBe(0);

      // デバウンス時間経過
      await vi.advanceTimersByTimeAsync(100);

      expect(mockFileSystemAdapter.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('リソース管理', () => {
    it('disposeでリソースが正しく解放される', async () => {
      const testPath = '/test/file.txt';
      const testContent = 'test content';

      // 自動保存をスケジュール
      autoSaveManager.scheduleAutoSave(testPath, testContent);

      expect(autoSaveManager.getPendingCount()).toBe(1);
      expect(autoSaveManager.isDisposed()).toBe(false);

      // dispose
      autoSaveManager.dispose();

      expect(autoSaveManager.getPendingCount()).toBe(0);
      expect(autoSaveManager.isDisposed()).toBe(true);

      // dispose後は新しい保存をスケジュールしても無視される
      autoSaveManager.scheduleAutoSave(testPath, testContent);

      expect(autoSaveManager.getPendingCount()).toBe(0);

      // デバウンス時間経過
      await vi.advanceTimersByTimeAsync(100);

      expect(mockFileSystemAdapter.writeFile).not.toHaveBeenCalled();
    });

    it('二重disposeでエラーにならない', () => {
      expect(() => {
        autoSaveManager.dispose();
        autoSaveManager.dispose(); // 二重dispose
      }).not.toThrow();

      expect(autoSaveManager.isDisposed()).toBe(true);
    });
  });

  describe('Promise.allSettledの動作確認', () => {
    it('一部のファイル保存が失敗しても他のファイルは正常に保存される', async () => {
      const files = [
        { path: '/test/success1.txt', content: 'success 1' },
        { path: '/test/error.txt', content: 'error content' },
        { path: '/test/success2.txt', content: 'success 2' },
      ];

      // 特定のファイルでのみエラーを発生させる
      let totalCalls = 0;
      let errorCalls = 0;
      mockFileSystemAdapter.writeFile = vi.fn()
        .mockImplementation((path: string) => {
          totalCalls++;
          if (path.includes('error')) {
            errorCalls++;
            return Promise.reject(new Error('Specific error'));
          }
          return Promise.resolve();
        });

      // 全ファイルをスケジュール
      files.forEach(file => {
        autoSaveManager.scheduleAutoSave(file.path, file.content);
      });

      // 一括保存実行（非同期で開始）
      const resultPromise = autoSaveManager.executePendingSaves();

      // タイマーを進めてリトライを実行
      await vi.advanceTimersByTimeAsync(200); // retryDelay * 3 を超える時間

      const results = await resultPromise;

      expect(results).toHaveLength(3);

      // 成功ファイルの確認
      const success1 = results.find(r => r.path.includes('success1'));
      const success2 = results.find(r => r.path.includes('success2'));
      expect(success1?.success).toBe(true);
      expect(success2?.success).toBe(true);

      // 失敗ファイルの確認
      const errorResult = results.find(r => r.path.includes('error'));
      expect(errorResult?.success).toBe(false);
      expect(errorResult?.error).toContain('Specific error');

      // すべてのファイル保存が試行されたことを確認
      expect(totalCalls).toBe(5); // 成功2回 + エラー3回(リトライ含む)
      expect(errorCalls).toBe(3); // エラーファイルが3回呼ばれた
    });
  });
});